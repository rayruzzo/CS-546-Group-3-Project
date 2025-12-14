const currentPath = new URL(window.location.href).pathname;

function redirectBasedOnCurrentPath(username) {
    if (currentPath === "/") {
        window.location.href = "/";
    } else {
        window.location.href = `/user/${username}`;
    }
}

(function() {

    const articles = document.querySelectorAll("article[id]");
    if (!articles) return;

    articles.forEach((article) => {
        if (article) {

            const postId = article.id
            const username = article.dataset.dataUsername;

    // Delete post handler
    const deleteBtn = document.querySelector('.post-actions .button-danger');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            if (!confirm('Are you sure you want to delete this post?')) return;

                    try {
                        const response = await fetch(`/posts/delete/${postId}`, {
                            method: 'DELETE',
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        });

                        if (response.ok) {
                            redirectBasedOnCurrentPath(username);
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
            const fulfillBtn = article.querySelector('[data-fulfill-post]');
            
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
        }
    })
})();