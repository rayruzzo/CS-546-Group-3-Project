/****************************************************************************
 * moderatorUsers.js
 * --------------------------------------------------------------------------
 * Client-side logic for Moderator / Admin user management UI.
 *
 * Responsibilities:
 *   - Populate user details from dropdown selection
 *   - Enforce role-based UI actions (admin vs moderator)
 *   - Prevent self-moderation
 *   - Render ban / unban / promote / demote controls
 *
 * Notes:
 *   - Authorization is enforced server-side; this file controls UI only
 *   - Admins can ban/unban and manage roles
 *   - Moderators can only ban regular users
 ****************************************************************************/

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
      actionArea.innerHTML += `
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

    // --- Ban / Unban ---
    if (banned) {
        actionArea.innerHTML += `
        <form method="POST" action="/moderator/users/${userId}/unban"
                onsubmit="return confirm('Unban this user?');">
            <button class="btn-secondary">Unban</button>
        </form>
        `;
    } else {
        actionArea.innerHTML += `
        <form method="POST" action="/moderator/users/${userId}/ban"
                onsubmit="return confirm('Ban this user?');">
            <button class="btn-danger">Ban</button>
        </form>
        `;
    }

    // --- Role Management (ADMIN ONLY) ---
    if (role === "user") {
        actionArea.innerHTML += `
        <form method="POST" action="/moderator/users/${userId}/role"
                onsubmit="return confirm('Promote this user to moderator?');">
            <input type="hidden" name="role" value="moderator">
            <button class="btn-secondary">Promote to Moderator</button>
        </form>
        `;
    }

    if (role === "moderator") {
        actionArea.innerHTML += `
        <form method="POST" action="/moderator/users/${userId}/role"
                onsubmit="return confirm('Demote this moderator to regular user?');">
            <input type="hidden" name="role" value="user">
            <button class="btn-secondary">Demote to User</button>
        </form>
        `;
    }
    }


    /* ==========================
       MODERATOR ACTIONS
       ========================== */
    if (viewerRole === "moderator" && role === "user" && !banned) {
      actionArea.innerHTML += `
        <form method="POST" action="/moderator/users/${userId}/ban"
              onsubmit="return confirm('Ban this user?');">
          <button class="btn-danger">Ban</button>
        </form>
      `;
    }

    details.classList.remove("hidden");
  });
});
