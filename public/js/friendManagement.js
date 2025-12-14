async function handleAddFriend(event) {
   const username = event.target.dataset.addFriend;

   try {
      const response = await fetch(`/friend/add/${username}`, {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json'
            }
      });

      if (response.ok) {
            window.location.href = `/user/${username}`;
      } else {
            alert(`Error friending ${username}`);
      }
   } catch (e) {
      console.error(`Error friending ${username}`, error);
      alert(`Error friending ${username}`);
   }
}

async function handleUnfriend(event) {
   const username = event.target.dataset.unfriend;

   try {
      const response = await fetch(`/friend/remove/${username}`, {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json'
            }
      });

      if (response.ok) {
            window.location.href = `/user/${username}`;
      } else {
            alert(`Error unfriending ${username}`);
      }
   } catch (e) {
      console.error(`Error unfriending ${username}`, error);
      alert(`Error unfriending ${username}`);
   }
}


(function() {
   
   const friendBtn = document.querySelector("[data-add-friend]");
   const unfriendBtn = document.querySelector("[data-unfriend]");
   
   if (friendBtn) {
      friendBtn.addEventListener("click", handleAddFriend);
   }

   if (unfriendBtn) {
      unfriendBtn.addEventListener("click", handleUnfriend);
   }

})();