(function () {
    const postsContainer = document.getElementById('posts-container');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const loadingMessage = document.getElementById('loading-message');
    const noMoreMessage = document.getElementById('no-more-posts');
    const filterForm = document.querySelector('.filters form');

    if (!filterForm) return;

    let currentSkip = 10; // Start after initial 10 posts loaded by server
    const limit = 10; // Load 10 more posts at a time

    // Get all filter elements
    const distanceFilter = document.getElementById('distance');
    const categoryFilter = document.getElementById('category');
    const typeFilter = document.getElementById('type');
    const tagsFilter = document.getElementById('tags');
    const priorityFilter = document.getElementById('priority');
    const expiringFilter = document.getElementById('expiring');
    const sortByFilter = document.getElementById('sortBy');

    // Load More functionality
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', async () => {
            await loadMorePosts();
        });
    }

    // Attach event listeners to form and all filter inputs
    filterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        currentSkip = 0; // Reset skip when filtering
        await loadFilteredPosts(true);
    });

    // Add change listeners to all filters that exist
    [distanceFilter, categoryFilter, typeFilter, tagsFilter, priorityFilter, expiringFilter, sortByFilter].forEach(filter => {
        if (filter) {
            filter.addEventListener('change', async () => {
                currentSkip = 0; // Reset skip when filtering
                await loadFilteredPosts(true);
            });
        }
    });

    async function loadMorePosts() {
        try {
            loadMoreBtn.style.display = 'none';
            loadingMessage.style.display = 'block';

            const params = buildQueryParams();
            params.append('skip', currentSkip);
            params.append('limit', limit);

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

            if (data.posts && data.posts.length > 0) {
                appendPosts(data.posts);
                currentSkip += data.posts.length;
                
                if (data.posts.length < limit) {
                    // No more posts to load
                    noMoreMessage.style.display = 'block';
                } else {
                    loadMoreBtn.style.display = 'block';
                }
            } else {
                noMoreMessage.style.display = 'block';
            }

            loadingMessage.style.display = 'none';
        } catch (error) {
            console.error('Error loading more posts:', error);
            loadingMessage.style.display = 'none';
            loadMoreBtn.style.display = 'block';
            alert('Error loading more posts. Please try again.');
        }
    }

    function buildQueryParams() {
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
            params.append('tags', tagsFilter.value);
        }
        
        if (priorityFilter?.value) {
            params.append('priority', priorityFilter.value);
        }
        
        if (expiringFilter?.value) {
            params.append('expiring', expiringFilter.value);
        }
        
        if (sortByFilter?.value) {
            params.append('sortBy', sortByFilter.value);
        }

        return params;
    }

    function appendPosts(posts) {
        const postsHTML = posts.map(post => `
                <article class="post-item">
                <h3>${DOMPurify.sanitize(post.title)}</h3>
                <p class="post-meta">${DOMPurify.sanitize(post.category)} • ${DOMPurify.sanitize(post.type)} • ${DOMPurify.sanitize(post.city)}, ${DOMPurify.sanitize(post.state)}</p>
                <p class="posted-by">Posted by ${DOMPurify.sanitize(post.username || 'Anonymous')} on ${DOMPurify.sanitize(post.datePosted)}</p>
                <p class="post-preview">${DOMPurify.sanitize(post.content)}</p>
                <a href="/posts/${post._id}">Read more</a>
                </article>
        `).join('');
        
        postsContainer.insertAdjacentHTML('beforeend', postsHTML);
    }

    async function loadFilteredPosts(replaceAll = false) {
        try {
            const postsListContainer = document.querySelector('#posts-container');
            postsListContainer.innerHTML = '<p>Loading posts...</p>';

            const params = buildQueryParams();
            params.append('limit', 20);

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
                const postsHTML = data.posts.map(post => `
                    <li>
                        <article class="post-item">
                        <h3>${DOMPurify.sanitize(post.title)}</h3>
                        <p class="post-meta">${DOMPurify.sanitize(post.category)} • ${DOMPurify.sanitize(post.type)} • ${DOMPurify.sanitize(post.city)}, ${DOMPurify.sanitize(post.state)}</p>
                        <p class="posted-by">Posted by ${DOMPurify.sanitize(post.username || 'Anonymous')} on ${DOMPurify.sanitize(post.datePosted)}</p>
                        <p class="post-preview">${DOMPurify.sanitize(post.content)}</p>
                        <a href="/posts/${post._id}">Read more</a>
                        </article>
                    </li>
                `).join('');
                
                postsListContainer.innerHTML = `
                    <div id="posts-container">${postsHTML}</div>
                    <div class="load-more-container">
                        <button id="load-more-btn" class="load-more-btn">Load More Posts</button>
                        <p id="loading-message" style="display: none;">Loading...</p>
                        <p id="no-more-posts" style="display: none;">No more posts to load</p>
                    </div>
                `;
                
                currentSkip = 10;
                
                // Re-attach load more button listener
                const newLoadMoreBtn = document.getElementById('load-more-btn');
                if (newLoadMoreBtn) {
                    newLoadMoreBtn.addEventListener('click', async () => {
                        await loadMorePosts();
                    });
                }
            } else {
                postsListContainer.innerHTML = '<p>No posts available in your area at the moment. Please check back later!</p>';
            }
        } catch (error) {
            console.error('Error loading posts:', error);
            document.querySelector('#posts-container').innerHTML = '<p>Error loading posts. Please try again.</p>';
        }
    }

})();
