// Client-side validation for update post form
// Uses shared validation utilities

import { initializeFormValidation } from './formValidation.js';

const FIELDS_TO_VALIDATE = ['title', 'content', 'type', 'category', 'tags', 'priority', 'expiresAt'];

// Initialize validation on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeFormValidation('update-post-form', FIELDS_TO_VALIDATE);
});
