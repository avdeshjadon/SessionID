function sendStudentData(regNo, password) {
  chrome.runtime.sendMessage({
    type: "student_data",
    data: { registrationNumber: regNo, password }
  });
}

function setupListeners() {
  const regInput = document.getElementById("txtU");
  const passInput = document.getElementById("TxtpwdAutoId_8767");

  if (regInput && passInput) {
    sendStudentData(regInput.value, passInput.value);

    ["input", "change"].forEach((evt) =>
      regInput.addEventListener(evt, () => {
        sendStudentData(regInput.value, passInput.value);
      })
    );

    ["input", "change"].forEach((evt) =>
      passInput.addEventListener(evt, () => {
        sendStudentData(regInput.value, passInput.value);
      })
    );

    console.log("%c✅ LPU inputs found and listeners attached.", "color: green;");
    return true;
  }
  return false;
}

// Try immediately
if (!setupListeners()) {
  // Retry silently max 15 times every 700ms until inputs found
  let retries = 0;
  const maxRetries = 15;
  const intervalId = setInterval(() => {
    retries++;
    if (setupListeners() || retries >= maxRetries) {
      clearInterval(intervalId);
      if (retries >= maxRetries) {
        // No warning here, silently fail after max retries
        console.log("%c⚠️ LPU inputs not found after retries, script stopped.", "color: orange;");
      }
    }
  }, 700);
}
