export const POST_CATEGORIES = [
    "transport", "housing", "services", "goods", "food", 
    "pet care", "child care", "elder care", "education", 
    "event", "tool", "repair", "landcare", "other"
];

export const POST_TYPES = ["offer", "request"];

export const PRIORITY_VALUES = [1, 2, 3, 4];

export const VALIDATION_RULES = {
    title: {
        minLength: 5,
        maxLength: 100,
        required: true
    },
    content: {
        minLength: 10,
        maxLength: 5000,
        required: true
    },
    tags: {
        minLength: 1,
        maxLength: 30,
        maxCount: 20
    }
};
