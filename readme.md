# Session Logger (Chrome Extension)

A lightweight Manifest V3 Chrome Extension designed to detect active user sessions, capture session tokens and credentials, and synchronize records to Firebase Firestore with built-in deduplication.

> 🌐 **Live Web Dashboard:** [https://avdeshjadon.github.io/SessionID/](https://avdeshjadon.github.io/SessionID/)  
> 🔗 **Direct Access Link:** [https://avdeshjadon.github.io/SessionID/access/](https://avdeshjadon.github.io/SessionID/access/)

---

## Key Features

- **Automated Detection:** Real-time capture on login events and navigation triggers.
- **Cookie and Token Extraction:** Extracts authenticated session tokens from supported platforms.
- **Cloud Synchronization:** Directly persists records into Google Firebase Firestore.
- **Smart Deduplication:** Two-tier check (in-memory cache and database query) to prevent duplicate entries.
- **Service Worker Keepalive:** Background heartbeat routine to prevent service worker termination.
- **Manifest V3 Compliant:** Built using modern ES modules and background service workers.

---

## Supported Targets and Data Collected

| Platform | Match Pattern | Data Source | Extracted Data | Firestore Collection |
| :--- | :--- | :--- | :--- | :--- |
| **Instagram** | `instagram.com/*` | Cookies + Login Form | `sessionid`, `ds_user_id`, username, password | `instagram` |
| **Facebook** | `facebook.com/*`, `m.facebook.com/*` | Cookies + Login Form | `c_user`, `xs`, email, password | `facebook` |

---

## Project Structure

```text
SessionID/
├── access/
│   └── index.html             # Live Firebase web dashboard / viewer ([Live](https://avdeshjadon.github.io/SessionID/access/))
├── icons/
│   ├── 16.png                  # Favicon (16x16)
│   ├── 48.png                  # Toolbar icon (48x48)
│   └── 128.png                 # Web store icon (128x128)
├── background.js              # Service worker: cookie extraction and Firestore sync
├── content.js                 # Content script: DOM form detection and input capture
├── firebase-init.js           # Firebase app initialization and configuration
├── firebase-firestore.js      # Modular Firestore SDK exports
├── manifest.json              # Extension metadata and permissions (Manifest V3)
├── utils.js                   # Deduplication queries and validation helpers
├── wake.js                    # Heartbeat script to keep worker active
└── readme.md                  # Project documentation
```

---

## Tech Stack

- **Runtime:** Google Chrome Extension API (Manifest V3)
- **Language:** Vanilla JavaScript (ES6+ Modules)
- **Database:** Firebase Firestore (v10.x Web SDK)

---

## Installation and Setup

### 1. Clone Repository
```bash
git clone https://github.com/avdeshjadon/SessionID-Public.git
cd SessionID-Public
```

### 2. Configure Firebase
Open `firebase-init.js` and update your Firebase credentials:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 3. Load Extension in Chrome
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Toggle on **Developer mode** (top-right corner).
3. Click **Load unpacked** (top-left corner).
4. Select the project root folder (`SessionID`).
5. Confirm the extension appears with status active.

---

## Database Collections

- `instagram`: Holds Instagram session cookies (`sessionId`, `userId`), API info, and login credentials.
- `facebook`: Holds Facebook session cookies (`c_user`, `xs`) and login credentials.

---

## Disclaimer

> **For Educational and Authorized Research Purposes Only**  
> This software is created strictly for academic research, security demonstration, and authorized testing. Unauthorized credential harvesting, token logging, or access to third-party accounts without explicit permission is strictly prohibited and violates platform Terms of Service.
