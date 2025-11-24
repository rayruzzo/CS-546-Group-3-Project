(function () {
    const postsListContainer = document.querySelector('.posts-list');
    const filterForm = document.querySelector('.filters form');

    if (!filterForm) return;

    // Get all filter elements
    const distanceFilter = document.getElementById('distance');
    const categoryFilter = document.getElementById('category');
    const typeFilter = document.getElementById('type');
    const tagsFilter = document.getElementById('tags');

    // Attach event listeners to form and all filter inputs
    filterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await loadFilteredPosts();
    });

    // Add change listeners to all filters that exist
    [distanceFilter, categoryFilter, typeFilter, tagsFilter].forEach(filter => {
        if (filter) {
            filter.addEventListener('change', async () => {
                await loadFilteredPosts();
            });
        }
    });

    async function loadFilteredPosts() {
        try {
            postsListContainer.innerHTML = '<p>Loading posts...</p>';

            // Build query parameters from all available filters
            const params = new URLSearchParams();
            
            if (distanceFilter?.value) {
                params.append('distance', distanceFilter.value);
            }
            
            if (categoryFilter?.value) {
                params.append('category', categoryFilter.value);
            }
            
            if (typeFilter?.value) {
                params.append('type', typeFilter.value);
            }
            
            if (tagsFilter?.value) {
                // Assume tags are comma-separated
                params.append('tags', tagsFilter.value);
            }

            const response = await fetch(`/posts/filter?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load posts');
            }

            const data = await response.json();

            // Update the posts list
            if (data.posts && data.posts.length > 0) {
                const postsHTML = `
                    <ul>
                        ${data.posts.map(post => `
                            <li>
                                <h3>${escapeHtml(post.title)}</h3>
                                <p>${escapeHtml(post.userName)} Posted on: ${formatDate(post.datePosted)}</p>
                                <p>${escapeHtml(post.content)}</p>
                            </li>
                        `).join('')}
                    </ul>
                `;
                postsListContainer.innerHTML = postsHTML;
            } else {
                postsListContainer.innerHTML = '<p>No posts available in your area at the moment. Please check back later!</p>';
            }
        } catch (error) {
            console.error('Error loading posts:', error);
            postsListContainer.innerHTML = '<p>Error loading posts. Please try again.</p>';
        }
    }

    // Helper function to escape HTML and prevent XSS
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    // Helper function to format date
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }
})();
