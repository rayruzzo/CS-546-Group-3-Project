// Client-side validation for create post form
// Mirrors the Yup schema validation from models/posts.js

import { POST_CATEGORIES, POST_TYPES, PRIORITY_VALUES, VALIDATION_RULES } from './validationConstants.js';

// Validation functions
const validators = {
    title: (value) => {
        const trimmed = value.trim();
        if (VALIDATION_RULES.title.required && !trimmed) return "Title is required";
        if (trimmed.length < VALIDATION_RULES.title.minLength) {
            return `Title must be at least ${VALIDATION_RULES.title.minLength} characters long`;
        }
        if (trimmed.length > VALIDATION_RULES.title.maxLength) {
            return `Title cannot exceed ${VALIDATION_RULES.title.maxLength} characters`;
        }
        return null;
    },
    
    content: (value) => {
        const trimmed = value.trim();
        if (VALIDATION_RULES.content.required && !trimmed) return "Content is required";
        if (trimmed.length < VALIDATION_RULES.content.minLength) {
            return `Content must be at least ${VALIDATION_RULES.content.minLength} characters long`;
        }
        if (trimmed.length > VALIDATION_RULES.content.maxLength) {
            return `Content cannot exceed ${VALIDATION_RULES.content.maxLength} characters`;
        }
        return null;
    },
    
    type: (value) => {
        if (!value) return "Post type is required";
        if (!POST_TYPES.includes(value.trim())) return "Invalid post type";
        return null;
    },
    
    category: (value) => {
        if (!value) return "Post category is required";
        if (!POST_CATEGORIES.includes(value.trim())) return "Invalid post category";
        return null;
    },
    
    tags: (value) => {
        if (!value || !value.trim()) return null; // Tags are optional
        
        const tags = value.split(',').map(tag => tag.trim()).filter(tag => tag);
        
        if (tags.length > VALIDATION_RULES.tags.maxCount) {
            return `Cannot have more than ${VALIDATION_RULES.tags.maxCount} tags`;
        }
        
        for (const tag of tags) {
            if (tag.length < VALIDATION_RULES.tags.minLength) {
                return `Tag must be at least ${VALIDATION_RULES.tags.minLength} character long`;
            }
            if (tag.length > VALIDATION_RULES.tags.maxLength) {
                return `Tag cannot exceed ${VALIDATION_RULES.tags.maxLength} characters`;
            }
        }
        
        return null;
    },
    
    priority: (value) => {
        const num = parseInt(value, 10);
        if (isNaN(num)) return "Priority is required";
        if (!PRIORITY_VALUES.includes(num)) return "Invalid priority level";
        return null;
    },
    
    expiresAt: (value) => {
        if (!value) return null; // Optional field
        
        const selectedDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day for fair comparison
        
        if (selectedDate < today) return "Expiration date cannot be in the past";
        return null;
    }
};

// Display error message
function showError(fieldId, message) {
    const field = document.getElementById(fieldId);
    let errorDiv = field.parentElement.querySelector('.error-message');
    
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        field.parentElement.appendChild(errorDiv);
    }
    
    errorDiv.textContent = message;
    field.classList.add('error');
}

// Clear error message
function clearError(fieldId) {
    const field = document.getElementById(fieldId);
    const errorDiv = field.parentElement.querySelector('.error-message');
    
    if (errorDiv) {
        errorDiv.remove();
    }
    
    field.classList.remove('error');
}

// Validate single field
function validateField(fieldId) {
    const field = document.getElementById(fieldId);
    const value = field.value;
    
    clearError(fieldId);
    
    const validator = validators[fieldId];
    if (validator) {
        const error = validator(value);
        if (error) {
            showError(fieldId, error);
            return false;
        }
    }
    
    return true;
}

// Validate all fields
function validateForm() {
    const fieldsToValidate = ['title', 'content', 'type', 'category', 'tags', 'priority', 'expiresAt'];
    let isValid = true;
    
    fieldsToValidate.forEach(fieldId => {
        if (!validateField(fieldId)) {
            isValid = false;
        }
    });
    
    return isValid;
}

// Initialize validation
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('create-post-form');
    
    if (!form) return;
    
    // Add blur event listeners for real-time validation
    const fieldsToValidate = ['title', 'content', 'type', 'category', 'tags', 'priority', 'expiresAt'];
    
    fieldsToValidate.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('blur', () => validateField(fieldId));
            field.addEventListener('input', () => {
                // Clear error on input if field was previously invalid
                if (field.classList.contains('error')) {
                    clearError(fieldId);
                }
            });
        }
    });
    
    // Validate on form submit
    form.addEventListener('submit', (e) => {
        if (!validateForm()) {
            e.preventDefault();
            
            // Scroll to first error
            const firstError = form.querySelector('.error');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                firstError.focus();
            }
        }
    });
});
