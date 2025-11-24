//This will allow us to show more posts without reloading the page
//get the current logged in user from session
import { filterPosts } from "../data/posts.js";
import locationData from "../data/locations.js";

const loadPosts = async (userZipCode, filters = {}) => {
    try {
        if (!userZipCode) {
            throw new Error("User zip code not provided");
        }

        // Get user's location
        const location = await locationData.getLocationByZipcode(userZipCode);
        const { latitude, longitude } = location;

        // Get distance from filters or default to 10 miles
        const distance = filters.distance || 10;
        
        // Find all zip codes within radius
        const nearbyLocations = await locationData.findLocationsInRadius(
            latitude, 
            longitude, 
            distance, 
            1000, // Get many locations
            0
        );
        const zipCodes = nearbyLocations.map(loc => loc.zipcode);

        // Build filter object for posts
        const postFilters = {
            zipCodes,
            category: filters.category,
            type: filters.type,
            tags: filters.tags,
            limit: filters.limit || 10,
            skip: filters.skip || 0
        };

        const postsList = await filterPosts(postFilters);
        return postsList;
    } catch (error) {
        throw error;
    }
}

export default loadPosts;