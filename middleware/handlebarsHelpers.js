// Handlebars helper functions

export const eq = (a, b) => a === b;
export const and = (...args) => args.every(Boolean);
export const or = (...args) => args.some(Boolean);

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

// Return the last element of an array
export const last = (array) => {
    if (!array || !Array.isArray(array) || array.length === 0) return null;
    return array[array.length - 1];
};

// Truncate long text for previews in DM
export const truncate = (str, len) => {
    if (!str || typeof str !== "string") return "";
    if (str.length <= len) return str;
    return str.substring(0, len) + "...";
};

export const set = function (name, value, options) {
    if (!options.data.root) options.data.root = {};
    options.data.root[name] = value;
};

export default {
    eq,
    and,
    or,
    formatDate,
    join,
    last,
    truncate,
    set
};
