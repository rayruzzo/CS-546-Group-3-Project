import { create } from 'express-handlebars';
import db from '../config/mongoCollections.js';
import { locationSchema, zipcodeSchema } from '../models/locations.js';

const { locations } = db;

const Location = Object.freeze(class Location {
    _id;
    zipcode;
    city;
    state_code;
    latitude;
    longitude;

    constructor({ _id, zipcode, city, state_code, latitude, longitude }) {
        this._id = _id;
        this.zipcode = zipcode;
        this.city = city;
        this.state_code = state_code;
        this.latitude = latitude;
        this.longitude = longitude;
        this.loc = { type: "Point", coordinates: [this.longitude, this.latitude] };
    }
});

const locationFunctions = {
    async createLocation(zipcode, city, state_code, latitude, longitude) {
        const errors = {};

        const newLocationData = new Location({
            zipcode,
            city,
            state_code,
            latitude,
            longitude,
        });

        const validatedLocation = await locationSchema.validate(newLocationData);
        
        const locationsCollection = await locations();
        const insertInfo = await locationsCollection.insertOne(validatedLocation);
        if (!insertInfo.insertedId)
         errors.creationError = "Could not create a new location";

        if (Object.keys(errors).length > 0) {
         throw new Error("Error creating location", {
            cause: {errors: errors}
         });
      }

      console.log("NEW LOCATION CREATED");

      return { location: newLocationData, success: true };
    },

    async getLocationById(id) {
        if (!id) throw new Error("Location ID must be provided", { cause: { id: "Location ID not provided" } });
        
        const locationsCollection = await locations();
        const location = await locationsCollection.findOne({ _id: ObjectId.createFromHexString(id) });
        if (!location) throw new Error("Location not found", { cause: { id: "No location found with the provided ID" } });

        return { location: location, success: true };
    },

    async updateLocation(locationId, validLocationData) {
        if (!locationId) throw new Error("Location ID must be provided", { cause: { locationId: "Location ID not provided" } });
        if (!validLocationData || Object(validLocationData) !== validLocationData) throw new Error("Location data must be provided", { cause: { validLocationData: "Location data not provided" } });

        const locationsCollection = await locations();
        const updatedLocationData = await locationSchema.validate(validLocationData);

        const updateInfo = await locationsCollection.updateOne(
            { _id: ObjectId.createFromHexString(locationId) },
            { $set: {...validLocationData} }
        );

        if (updateInfo.matchedCount === 0) throw new Error("Location not found", { cause: { locationId: "No location found with the provided ID" } });
        if (updateInfo.modifiedCount === 0) throw new Error("Could not update location", { cause: { locationId: "Location update failed" } });
        return { location: this.getLocationById(updatedLocationData._id), success: true };
    },

    async deleteLocation(id) {
        if (!id) throw new Error("Location ID must be provided", { cause: { id: "Location ID not provided" } });

        const locationsCollection = await locations();
        const deletionInfo = await locationsCollection.deleteOne({ _id: ObjectId.createFromHexString(id) });

        if (deletionInfo.deletedCount === 0) throw new Error("Could not delete location", { cause: { id: "No location found with the provided ID" } });

        return { locationId: id, deleted: true };
    },

    async getLocationByZipcode(zipcode) {
        if (!zipcode) throw new Error("Zipcode must be provided", { cause: { zipcode: "Zipcode not provided" } });
        const validatedZipcode = await zipcodeSchema.validate(zipcode);

        const locationsCollection = await locations();
        const location = await locationsCollection.findOne({ zipcode: validatedZipcode });
        if (!location) throw new Error("Location not found", { cause: { zipcode: "No location found with the provided zipcode" } });

        return location;
    },

    async findLocationsInRadius(latitude, longitude, radiusMiles, limit = 100, skip = 0) {
        if (latitude === undefined || latitude === null) throw new Error("Latitude must be provided");
        if (longitude === undefined || longitude === null) throw new Error("Longitude must be provided");
        if (!radiusMiles) throw new Error("Radius must be provided");

        const radiusMeters = radiusMiles * 1609.34; // Convert miles to meters
        const locationsCollection = await locations();

        const locationsList = await locationsCollection
            .find({
                loc: {
                    $near: {
                        $geometry: {
                            type: "Point",
                            coordinates: [longitude, latitude]
                        },
                        $maxDistance: radiusMeters
                    }
                }
            })
            .skip(skip)
            .limit(limit)
            .toArray();

        return locationsList;
    },
}

export default locationFunctions;
