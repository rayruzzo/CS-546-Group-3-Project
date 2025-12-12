/****************************************************************************
 * dmCreateValidation.js
 *
 * Client-side UX warnings for the "Start New Conversation" DM form.
 *
 * Responsibilities:
 *   - Warn users early if the recipient cannot receive messages
 *   - Display inline error messages only
 *   - Show a live character counter for the initial message
 *
 * Notes:
 *   - This file never blocks form submission
 *   - Server-side validation in POST /dmthreads/create is final authority
 ****************************************************************************/

document.addEventListener("DOMContentLoaded", () => {
  /**************************************************************************
   * USERNAME WARNINGS (async, non-blocking)
   **************************************************************************/
  const usernameInput = document.getElementById("recipient");
  const inlineError = document.getElementById("username-error-text");

  const usernameRegex = /^(?!-)(?!.*--)[A-Za-z0-9-]{4,50}(?<!-)$/;

  // Used only to avoid race conditions between overlapping fetches
  let currentCheck = null;

  // If the form structure isn't present, bail out quietly
  if (!usernameInput || !inlineError) {
    return;
  }

  const clearError = () => {
    inlineError.style.display = "none";
    inlineError.textContent = "";
  };

  const showError = (message) => {
    inlineError.style.display = "block";
    inlineError.textContent = message;
  };

  usernameInput.addEventListener("input", async () => {
    const value = usernameInput.value.trim().toLowerCase();

    clearError();

    // Empty field → no warning
    if (!value) return;

    // Local format warning only
    if (!usernameRegex.test(value)) {
      showError("Invalid username format.")
    }

    const checkId = Date.now();
    currentCheck = checkId;

    try {
      const res = await fetch(`/dmthreads/check-user?u=${value}`);
      const data = await res.json();

      // Ignore stale responses
      if (currentCheck !== checkId) return;

      if (!data.exists) {
        showError("User does not exist.");
        return;
      }

      if (data.self) {
        showError("You can’t send a message to yourself.");
        return;
      }

      if (data.banned) {
        showError("This user cannot receive messages.");
        return;
      }

      if (!data.dmsEnabled) {
        showError("This user is not accepting messages right now.");
        return;
      }

      // All checks good → stay silent, no green success state
      clearError();
    } catch (err) {
      console.error("Username check failed:", err);
      showError("Unable to validate username right now.");
    }
  });

  /**************************************************************************
   * MESSAGE CHARACTER COUNTER (purely visual)
   **************************************************************************/
  const messageInput = document.getElementById("message");
  const counter = document.getElementById("message-counter");
  const maxChars = 2000;

  if (messageInput && counter) {
    const updateCounter = () => {
      const length = messageInput.value.length;
      counter.textContent = `${length} / ${maxChars}`;

      if (length >= maxChars) {
        counter.classList.add("limit-reached");
      } else {
        counter.classList.remove("limit-reached");
      }
    };

    // Initialize (covers pre-filled previousMessage after server error)
    updateCounter();

    // Update live as the user types
    messageInput.addEventListener("input", updateCounter);
  }
});
