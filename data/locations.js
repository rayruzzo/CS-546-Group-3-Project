import { get } from 'http';
import {locations} from '../config/mongoCollections.js';
import validators from '../validation.js';

const _validateZipcode = (zipcode) => {
    if (zipcode.length < 5 || zipcode.length > 10) {
        throw "Invalid zipcode length";
    }
    return zipcode;
}

const _validateLatLong = (value, name) => {
    if (typeof value !== 'number' || value < -180 || value > 180) {
        throw `Invalid ${name} value`;
    }
    return value;
}

const _validateStateCode = (state_code) => {
    if (state_code.length !== 2) {
        throw "State code must be 2 characters";
    }
    return state_code.toUpperCase();
}

const _validateRadius = (radius) => {
    if (typeof radius !== 'number' || radius <= 0) {
        throw "Invalid radius value";
    }
    return radius;
}

const _validatePositiveNumber = (value, name) => {
    if (typeof value !== 'number' || value < 0) {
        throw `Invalid ${name} value`;
    }
    return value;
}

const _validateLocation = (zipcode, city, state, state_code, latitude, longitude) => {
    return {
        zipcode: _validateZipcode(zipcode),
        city: validators.validateString(city, "City"),
        state: validators.validateString(state, "State"),
        state_code: _validateStateCode(state_code),
        latitude: _validateLatLong(latitude, "Latitude"),
        longitude: _validateLatLong(longitude, "Longitude")
    };
}

const create_location = async (zipcode, city, state, state_code, latitude, longitude) => {

    const locCollection = await locations();

    newLocation = _validateLocation(zipcode, city, state, state_code, latitude, longitude);

    const insertInfo = await locCollection.insertOne(newLocation);
    if (!insertInfo.acknowledged || !insertInfo.insertedId) {
        throw "Could not add location";
    }
    return insertInfo.insertedId;
};

const getCoordinatesByZipcode = async (zipcode) => {
    zipcode = _validateZipcode(zipcode);
    const locCollection = await locations();
    const location = await locCollection.findOne({ zipcode: zipcode });
    if (!location) throw "Location not found";
    return {
        latitude: location.latitude,
        longitude: location.longitude
    };
}

const findLocationsInRadius = async (latitude, longitude, radius, n, skip) => {
    latitude = _validateLatLong(latitude, "Latitude");
    longitude = _validateLatLong(longitude, "Longitude");
    if (typeof radius !== 'number' || radius <= 0) {
        throw "Invalid radius value";
    }
    
    const locCollection = await locations();
    const locationsInRadius = await locCollection.find({
        loc: {$geoWithin: { $center: [ [ longitude, latitude ], radius ] } }
    }).skip(skip).limit(n).toArray();

    return locationsInRadius;
}

const getZipsInRadius = async (zipcode, radius, n, skip) => {
    zipcode = _validateZipcode(zipcode);
    radius = _validateRadius(radius);
    n = _validatePositiveNumber(n, "Number of locations");
    skip = _validatePositiveNumber(skip, "Skip value");

    const coords = await getCoordinatesByZipcode(zipcode);
    const latitude = coords.latitude;
    const longitude = coords.longitude;
    const locationsInRadius = await findLocationsInRadius(latitude, longitude, radius, n, skip);
    const zipcodes = locationsInRadius.map(loc => loc.zipcode);
    return zipcodes;
}


const getLocationByZipcode = async (zipcode) => {
    zipcode = _validateZipcode(zipcode);
    const locCollection = await locations();
    const location = await locCollection.findOne({ zipcode: zipcode });
    if (!location) throw "Location not found";
    return location;
}


export default {
    create_location,
    getCoordinatesByZipcode,
    findLocationsInRadius,
    getLocationByZipcode,
    getZipsInRadius
};