import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAIozb7XfqF1nLfrd9Q-pVhNwpgCWruwn0",
  authDomain: "sessionid-49465.firebaseapp.com",
  projectId: "sessionid-49465",
  storageBucket: "sessionid-49465.firebasestorage.app",
  messagingSenderId: "782636329164",
  appId: "1:782636329164:web:eb4f7c893cb6f8a3183a69",
  measurementId: "G-87FXSPPRR3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log("Firebase initialized");

export { db };
