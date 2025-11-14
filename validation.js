import { ObjectId } from "mongodb";

const validateString = (str, varName) => {
    if (!str) throw `${varName} is required`;
    if (typeof str !== "string") throw `${varName} must be a string`;
    str = str.trim();
    if (str.length === 0) throw `${varName} cannot be an empty string`;
    return str;
}

const validateId = (id, varName = "ID") => {
    id = validateString(id, varName);

    if (!ObjectId.isValid(id)) throw `Invalid ${varName}`;
    return id;
}

const validateArray = (arr, varName) => {
    if (!arr) throw `${varName} is required`;
    if (!Array.isArray(arr)) throw `${varName} must be an array`;
    if (arr.length === 0) throw `${varName} cannot be an empty array`;
    return arr;
}

const validateBoolean = (bool, varName) => { 
    if (typeof bool !== "boolean") throw `${varName} must be a boolean`;
    return bool;
}

const exports = {
    validateId,
    validateString,
    validateArray,
    validateBoolean
};

export default exports;