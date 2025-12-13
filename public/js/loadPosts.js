
const formatDate = (date, format) => {
    if (!date) return '';
    const d = new Date(date);
    if (format === 'YYYY-MM-DD') {
        return d.toISOString().split('T')[0];
    }
    // Default: readable format
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

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
        updateBrowserURL();
    });

    // Add change listeners to all filters that exist
    [distanceFilter, categoryFilter, typeFilter, tagsFilter, priorityFilter, expiringFilter, sortByFilter].forEach(filter => {
        if (filter) {
            filter.addEventListener('change', async () => {
                currentSkip = 0; // Reset skip when filtering
                await loadFilteredPosts(true);
                updateBrowserURL();
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
            const errorElement = document.querySelector('.post-error');
            if (errorElement) {
                errorElement.textContent = 'Error loading more posts. Please try again.';
                errorElement.style.display = 'block';
                setTimeout(() => {
                    errorElement.style.display = 'none';
                    errorElement.textContent = '';
                }, 5000);
            }
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

    function updateBrowserURL() {
        const params = buildQueryParams();
        const newURL = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
        window.history.pushState({ filters: Object.fromEntries(params) }, '', newURL);
    }

    function buildPostHTML(post) {

        const sanitizedPostId             = DOMPurify.sanitize(post._id);
        const sanitizedUsername           = DOMPurify.sanitize(post.username || 'Anonymous');
        const sanitizedPostTitle          = DOMPurify.sanitize(post.title);
        const santizedPostCity            = DOMPurify.sanitize(post.city);
        const sanitizedPostState          = DOMPurify.sanitize(post.state);
        const sanitizedPostCreatedAt      = DOMPurify.sanitize(post.createdAt);
        const sanitizedPostDatePosted     = DOMPurify.sanitize(post.datePosted);
        const sanitizedPostFulfilledState = DOMPurify.sanitize(post.fulfilledState);
        const sanitizedPostType           = DOMPurify.sanitize(post.type);
        const sanitizedPostCategory       = DOMPurify.sanitize(post.category);
        const sanitizedPostPriority       = DOMPurify.sanitize(post.priority);
        const sanitizedPostExpiresAt      = DOMPurify.sanitize(post.expiresAt);
        const sanitizedPostTags           = post.tags?.length > 0 && post.tags.map(
                                                (tag) => DOMPurify.sanitize(tag));
        const sanitizedPostContent        = DOMPurify.sanitize(post.content);
        
        return `
            <article id="${sanitizedPostId}" data-username="${sanitizedUsername}" class="post-item">
                <h3>${sanitizedPostTitle}</h3>

                <div class="post-meta">
                    <span class="author">
                    Posted by <a href="/user/${sanitizedUsername}"><strong>${sanitizedUsername}</strong></a>
                </span>
                    <span class="location">📍 ${santizedPostCity}, ${sanitizedPostState}</span>
                    <span class="date">
                        <time datetime="${sanitizedPostCreatedAt}">${sanitizedPostDatePosted || ""}</time>
                    </span>
                    ${
                        sanitizedPostFulfilledState === "fulfilled" ? 
                        `<span class="status fulfilled">✅ Fulfilled</span>` : ""
                    }
                </div>

                <div class="post-details">
                    <p class="type ${sanitizedPostType}">${sanitizedPostType}</p>
                    <span class="category">${sanitizedPostCategory}</span>
                    <span class="priority priority-${sanitizedPostPriority}">
                        ${(() => {
                            if (sanitizedPostPriority === "4")
                                return `🔴 Urgent`
                            else if (sanitizedPostPriority === "3")
                                return `🟠 High Priority`
                            else if (sanitizedPostPriority === "2")
                                return `🟡 Normal`
                            else if (sanitizedPostPriority === "1")
                                return `🟢 Low Priority`
                            else 
                                return ""
                        })()}
                    </span>
                    ${
                        sanitizedPostExpiresAt ? 
                        `<span class="expiration">
                            Expires:
                            <time datetime="${sanitizedPostExpiresAt}">
                            ${formatDate(sanitizedPostExpiresAt)}
                            </time>
                        </span>
                        ` : ""
                    }           
                    ${
                        sanitizedPostTags ?
                        `<div class="tags">
                            ${(() => {
                                return sanitizedPostTags.map((tag) => `
                                    <span class="tag">${tag}</span>
                                `).join("")
                            })()}
                        </div>
                        ` : ""
                    }
                </div>

                <p class="post-preview">${sanitizedPostContent}</p>
                <a href="/posts/${sanitizedPostId}">Read more</a>

            </article>
        `
    }

    function appendPosts(posts) {

        const postsHTML = posts.map(post => buildPostHTML(post)).join('');

        postsContainer.insertAdjacentHTML('beforeend', postsHTML);
    }

    async function loadFilteredPosts() {
        try {
            const postsListContainer = document.querySelector('#posts-container');
            postsListContainer.innerHTML = '<p>Loading posts...</p>';

            const params = buildQueryParams();
            params.append('limit', 10);

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
                
                const postsHTML = data.posts.map(post => buildPostHTML(post)).join('');

                postsListContainer.innerHTML = postsHTML;

                currentSkip = data.posts.length;

            } else {
                postsListContainer.innerHTML = '<p>No posts available in your area at the moment. Please check back later!</p>';
            }

        } catch (error) {
            console.error('Error loading posts:', error);
            const errorElement = document.querySelector('.post-error');
            if (errorElement) {
                errorElement.textContent = 'Error loading posts. Please try again.';
                errorElement.style.display = 'block';
                setTimeout(() => {
                    errorElement.style.display = 'none';
                    errorElement.textContent = '';
                }, 5000);
            }
        }
    }

})();
