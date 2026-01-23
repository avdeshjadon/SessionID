import {
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/**
 * ============== 🔍 DUPLICATE DETECTION UTILITIES ==============
 */

/**
 * Check if exact same data already exists in Firestore
 * For studentData: checks if same registrationNumber AND password combo exists
 * For instagram: checks if same sessionId exists
 * For facebook: checks if same xs cookie exists
 */
export async function isDuplicateData(colRef, data) {
  const entries = Object.entries(data).filter(
    ([key, value]) => typeof value === "string" || typeof value === "number"
  );

  if (entries.length === 0) return false;

  // Build query with ALL fields (exact match)
  let q = colRef;
  entries.forEach(([key, value]) => {
    q = query(q, where(key, "==", value));
  });

  try {
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      console.log(
        "%c🔍 [UTILS] Duplicate found - exact match exists in DB",
        "color: #ff9800;"
      );
      return true;
    }
    return false;
  } catch (err) {
    console.warn(
      "%c⚠️ [UTILS] Duplicate check failed:",
      "color: #ff9800;",
      err
    );
    return false;
  }
}

/**
 * Check if document exists by a single field
 */
export async function existsByField(colRef, fieldName, fieldValue) {
  try {
    const q = query(colRef, where(fieldName, "==", fieldValue));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (err) {
    console.warn(
      "%c⚠️ [UTILS] existsByField check failed:",
      "color: #ff9800;",
      err
    );
    return false;
  }
}

/**
 * Get document(s) by a single field
 */
export async function getDocsByField(colRef, fieldName, fieldValue) {
  try {
    const q = query(colRef, where(fieldName, "==", fieldValue));
    const snapshot = await getDocs(q);
    return snapshot.docs;
  } catch (err) {
    console.warn(
      "%c⚠️ [UTILS] getDocsByField failed:",
      "color: #ff9800;",
      err
    );
    return [];
  }
}

/**
 * ============== ✅ INPUT VALIDATION UTILITIES ==============
 */

/**
 * Validates string input - checks for null, undefined, empty, and minimum length
 */
export function isValidString(value, minLength = 1) {
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
export function isValidEmail(email) {
  return isValidString(email, 3) && (email.includes("@") || email.length >= 3);
}

/**
 * Validates password (minimum length check)
 */
export function isValidPassword(password, minLength = 6) {
  return isValidString(password, minLength);
}

/**
 * Validates registration number (LPU format)
 */
export function isValidRegNo(regNo, minLength = 8) {
  return isValidString(regNo, minLength);
}

/**
 * Filter out null, undefined, and empty string values from an object
 */
export function filterValidFields(data, excludeFields = []) {
  const filtered = {};
  for (const [key, value] of Object.entries(data)) {
    if (
      !excludeFields.includes(key) &&
      value !== null &&
      value !== undefined &&
      value !== ""
    ) {
      filtered[key] = value;
    }
  }
  return filtered;
}

/**
 * ============== 📝 LOGGING UTILITIES ==============
 */

/**
 * Logs a formatted header box
 */
export function logHeader(title, color = "#2196f3") {
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
 * Log status messages with emoji indicators
 */
export const log = {
  saved: (prefix, message) =>
    console.log(`%c[${prefix}] ✅ SAVED: ${message}`, "color: #4caf50; font-weight: bold;"),

  skip: (prefix, message) =>
    console.log(`%c[${prefix}] ⏭️ SKIP: ${message}`, "color: #9e9e9e;"),

  update: (prefix, message) =>
    console.log(`%c[${prefix}] 🔄 UPDATED: ${message}`, "color: #ff9800; font-weight: bold;"),

  new: (prefix, message) =>
    console.log(`%c[${prefix}] 🆕 NEW: ${message}`, "color: #8bc34a; font-weight: bold;"),

  wait: (prefix, message) =>
    console.log(`%c[${prefix}] ⏳ WAITING: ${message}`, "color: #ff9800;"),

  error: (prefix, message, err = null) => {
    console.log(`%c[${prefix}] ❌ ERROR: ${message}`, "color: #f44336; font-weight: bold;");
    if (err) console.error(err);
  },

  warn: (prefix, message) =>
    console.log(`%c[${prefix}] ⚠️ WARNING: ${message}`, "color: #ff9800; font-weight: bold;"),

  info: (prefix, message) =>
    console.log(`%c[${prefix}] ℹ️ INFO: ${message}`, "color: #2196f3; font-weight: bold;"),
};

/**
 * ============== 🔄 FIELD COMPARISON UTILITIES ==============
 */

/**
 * Smart field comparison and update tracking
 * Returns true if field was added to updateData
 */
export function checkAndAddField(
  field,
  value,
  displayName,
  existingData,
  updateData,
  newFields,
  updates
) {
  if (value !== null && value !== undefined && value !== "") {
    const oldValue = existingData[field];
    if (oldValue !== value) {
      updateData[field] = value;
      if (oldValue) {
        updates.push(`${displayName}: "${oldValue}" → "${value}"`);
      } else {
        newFields.push(`${displayName}: "${value}"`);
      }
      return true;
    }
  }
  return false;
}

/**
 * Compare two objects and return fields that differ
 */
export function getChangedFields(oldData, newData, fieldsToCompare = []) {
  const changes = {
    added: [],
    modified: [],
    unchanged: [],
  };

  const fields = fieldsToCompare.length > 0 ? fieldsToCompare : Object.keys(newData);

  for (const field of fields) {
    const oldValue = oldData[field];
    const newValue = newData[field];

    if (newValue === null || newValue === undefined || newValue === "") {
      continue;
    }

    if (oldValue === undefined || oldValue === null || oldValue === "") {
      changes.added.push({ field, value: newValue });
    } else if (oldValue !== newValue) {
      changes.modified.push({ field, oldValue, newValue });
    } else {
      changes.unchanged.push(field);
    }
  }

  return changes;
}

/**
 * ============== ⏱️ RETRY UTILITIES ==============
 */

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const delay = baseDelay * Math.pow(2, i);
      console.log(
        `%c⏳ Retry ${i + 1}/${maxRetries} in ${delay}ms...`,
        "color: #ff9800;"
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Wait for a condition to be true with timeout
 */
export async function waitForCondition(
  checkFn,
  maxWaitMs = 5000,
  intervalMs = 500
) {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    if (await checkFn()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return false;
}
