(function() {
    const article = document.querySelector('article[id]');
    if (!article) return;
    
    const postId = article.id

    // Delete post handler
    const deleteBtn = document.querySelector('.button-danger');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            if (!confirm('Are you sure you want to delete this post?')) return;

            try {
                const response = await fetch(`/posts/delete/${postId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    window.location.href = '/';
                } else {
                    alert('Error deleting post. Please try again.');
                }
            } catch (error) {
                console.error('Error deleting post:', error);
                alert('Error deleting post. Please try again.');
            }
        });
    }

    // Fulfill post handler
    const fulfillBtn = document.getElementById('fulfill-post-btn');
    if (fulfillBtn) {
        fulfillBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            try {
                const response = await fetch(`/posts/fulfill/${postId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    location.reload();
                } else {
                    alert('Error marking post as fulfilled. Please try again.');
                }
            } catch (error) {
                console.error('Error fulfilling post:', error);
                alert('Error marking post as fulfilled. Please try again.');
            }
        });
    }
})();