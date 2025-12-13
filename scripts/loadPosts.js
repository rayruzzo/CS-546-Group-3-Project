import postData from "../data/posts.js";
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

        const postFilters = {
            zipCodes,
            category: filters.category,
            type: filters.type,
            tags: filters.tags,
            expiring: filters.expiring,
            priority: filters.priority,
            sortBy: filters.sortBy,
            limit: filters.limit || 10,
            skip: filters.skip || 0
        };

        const postsList = await postData.filterPosts(postFilters);
        
        const enrichedPosts = await postData.enrichPostsWithUserAndLocation(postsList);

        return enrichedPosts;
    } catch (error) {
        throw error;
    }
}

export default loadPosts;