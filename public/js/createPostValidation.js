// Client-side validation for create post form
// Uses shared validation utilities

import { initializeFormValidation } from './formValidation.js';

const FIELDS_TO_VALIDATE = ['title', 'content', 'type', 'category', 'tags', 'priority', 'expiresAt'];

// Initialize validation on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeFormValidation('create-post-form', FIELDS_TO_VALIDATE);
});
