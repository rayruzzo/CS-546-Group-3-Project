(function () {
    const commentForm = document.getElementById('comment-form');
    if (!commentForm) return;

    commentForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const postId = commentForm.dataset.postId;
        const content = document.getElementById('comment-content').value.trim();

        if (!content) {
            alert('Comment content cannot be empty.');
            return;
        }

        try {
            const response = await fetch(`/comments/create/${postId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content })
            });

            if (response.ok) {
                // Reload the page to show the new comment
                window.location.reload();
            } else {
                const errorData = await response.json();
                alert(`Error: ${errorData.error}`);
            }
        } catch (error) {
            console.error('Error submitting comment:', error);
            alert('An unexpected error occurred. Please try again later.');
        }
    });
})();