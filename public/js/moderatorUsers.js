document.addEventListener("DOMContentLoaded", () => {
  const select = document.getElementById("userSelect");
  const details = document.getElementById("userDetails");
  const actionArea = document.getElementById("actionArea");

  if (!select) return;

  select.addEventListener("change", () => {
    const option = select.selectedOptions[0];

    if (!option || !option.value) {
      details.classList.add("hidden");
      actionArea.innerHTML = "";
      return;
    }

    const username = option.dataset.username;
    const role = option.dataset.role;
    const banned = option.dataset.banned === "true";
    const userId = option.value;

    const viewerRole = window.CURRENT_USER_ROLE;
    const viewerId = window.CURRENT_USER_ID;

    const usernameEl = document.getElementById("detailUsername");
    const roleEl = document.getElementById("detailRole");
    const statusEl = document.getElementById("detailStatus");

    usernameEl.textContent = username;
    roleEl.textContent = role;
    roleEl.className = `role-badge role-${role}`;

    statusEl.textContent = banned ? "Banned" : "Active";
    statusEl.className = banned ? "status-banned" : "status-active";

    actionArea.innerHTML = "";

    /* ==========================
       SELF PROTECTION
       ========================== */
    if (userId === viewerId) {
      actionArea.innerHTML = `
        <p class="moderator-note">
          You cannot perform moderation actions on your own account.
        </p>
      `;
      details.classList.remove("hidden");
      return;
    }

    /* ==========================
       ADMIN ACTIONS
       ========================== */
    if (viewerRole === "admin") {
      actionArea.innerHTML = banned
        ? `
          <form method="POST" action="/moderator/users/${userId}/unban"
                onsubmit="return confirm('Unban this user?');">
            <button class="btn-secondary">Unban</button>
          </form>
        `
        : `
          <form method="POST" action="/moderator/users/${userId}/ban"
                onsubmit="return confirm('Ban this user?');">
            <button class="btn-danger">Ban</button>
          </form>
        `;
    }

    /* ==========================
       MODERATOR ACTIONS
       ========================== */
    if (viewerRole === "moderator" && role === "user" && !banned) {
      actionArea.innerHTML = `
        <form method="POST" action="/moderator/users/${userId}/ban"
              onsubmit="return confirm('Ban this user?');">
          <button class="btn-danger">Ban</button>
        </form>
      `;
    }

    details.classList.remove("hidden");
  });
});
