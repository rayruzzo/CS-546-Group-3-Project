// Handlebars helper functions

export const eq = (a, b) => a === b;

export const formatDate = (date, format) => {
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

export const join = (array, separator) => {
    if (!array || !Array.isArray(array)) return '';
    return array.join(separator);
};

export default {
    eq,
    formatDate,
    join
};
