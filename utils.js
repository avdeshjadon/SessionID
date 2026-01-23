import { getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/**
 * Check if exact same data already exists in Firestore
 * For studentData: checks if same registrationNumber AND password combo exists
 * For instagramCred: checks if same username AND password combo exists
 */
export async function isDuplicateData(colRef, data) {
  const entries = Object.entries(data).filter(([key, value]) => typeof value === "string" || typeof value === "number");

  if (entries.length === 0) return false;

  // Build query with ALL fields (exact match)
  let q = colRef;
  entries.forEach(([key, value]) => {
    q = query(q, where(key, "==", value));
  });

  try {
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      console.log("%c🔍 Duplicate found - exact match exists in DB", "color: orange;");
      return true;
    }
    return false;
  } catch (err) {
    console.warn("⚠️ Duplicate check failed:", err);
    return false;
  }
}
