(function() {
    // Delete comment handler
    const deleteButtons = document.querySelectorAll('.comment-delete');
    
    deleteButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            
            if (!confirm('Are you sure you want to delete this comment?')) return;

            const commentId = button.getAttribute('data-comment-id');
            
            try {
                const response = await fetch(`/comments/delete/${commentId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    // Remove the comment from the DOM
                    const commentElement = document.getElementById(`comment-${commentId}`);
                    if (commentElement) {
                        commentElement.remove();
                    }
                } else {
                    alert('Error deleting comment. Please try again.');
                }
            } catch (error) {
                console.error('Error deleting comment:', error);
                alert('Error deleting comment. Please try again.');
            }
        });
    });
})();
