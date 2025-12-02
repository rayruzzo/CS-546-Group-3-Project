import yup from "yup";
import { loadYupCustomMethods } from "../utils/yupUtils.js";

/** load custom Yup methods */
loadYupCustomMethods();

const usStateAbbreviations = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'HD', 
  'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT',
  'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI',
  'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export const citySchema = yup
    .string()
    .sequence([
        () => yup.string().trim(),
        () => yup.string().min(1, "City name must be at least 1 character long"),
        () => yup.string().max(100, "City name must be at most 100 characters long"),
    ])
    .required();

export const stateCodeSchema = yup
    .string()
    .sequence([
        () => yup.string().trim().uppercase(),
        () => yup.string().length(2, "State code must be exactly 2 characters long"),
        () => yup.string().oneOf(usStateAbbreviations, "Invalid US state code"),
    ])
    .required();

export const zipcodeSchema = yup
    .string()
    .sequence([
        () => yup.string().trim(),
        () => yup.string().matches(/^\d{5}(-\d{4})?$/, "Invalid zipcode format"),
    ])
    .required();

export const latitudeSchema = yup
    .number()
    .min(-90, "Latitude must be at least -90")
    .max(90, "Latitude must be at most 90")
    .required();

export const longitudeSchema = yup
    .number()
    .min(-180, "Longitude must be at least -180")
    .max(180, "Longitude must be at most 180")
    .required();

export const locSchema = yup.object().shape({
    type: yup.string().oneOf(["Point"]).required(),
    coordinates: yup.array()
        .of(yup.number())
        .length(2, "Coordinates must be an array of two numbers [longitude, latitude]")
        .required()
});

export const locationSchema = yup.object().shape({
    zipcode: zipcodeSchema,
    city: citySchema,
    state_code: stateCodeSchema,
    latitude: latitudeSchema,
    longitude: longitudeSchema,
    loc: locSchema
});