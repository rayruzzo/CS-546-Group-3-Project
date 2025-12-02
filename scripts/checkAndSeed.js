import db from '../config/mongoCollections.js';
import locationData from '../data/locations.js';
import fs from 'fs';
import { parse } from 'csv-parse';

const checkAndSeedLocations = async () => {
    try {
        const locationsCollection = await db.locations();
        
        // Create 2dsphere index for locations
        try {
            await locationsCollection.createIndex({ loc: "2dsphere" });
            console.log('Created 2dsphere index on locations collection');
        } catch (e) {
            console.log('2dsphere index already exists on locations');
        }

        // Create 2dsphere index for posts
        const postsCollection = await db.posts();
        try {
            await postsCollection.createIndex({ loc: "2dsphere" });
            console.log('Created 2dsphere index on posts collection');
        } catch (e) {
            console.log('2dsphere index already exists on posts');
        }
        
        const count = await locationsCollection.countDocuments();
        
        if (count > 0) {
            console.log(`Locations already seeded (${count} documents)`);
            return;
        }

        console.log('No locations found. Starting seed...');
        
        const csvFilePath = './data/zips.csv';
        const locations = [];

        const fileContent = fs.readFileSync(csvFilePath, 'utf-8');
        const parser = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });

        for await (const row of parser) {
            if (row['country code'] === 'US') {
                locations.push({
                    zipcode: row['postal code'],
                    city: row['place name'],
                    state: row['admin name1'],
                    state_code: row['admin code1'],
                    latitude: parseFloat(row['latitude']),
                    longitude: parseFloat(row['longitude']),
                    loc: { type: "Point", coordinates: [parseFloat(row['longitude']), parseFloat(row['latitude'])] }
                });
            }
        }

        console.log(`Inserting ${locations.length} locations...`);
        let inserted = 0;

        for (const location of locations) {
            try {
                await locationData.create_location(
                    location.zipcode,
                    location.city,
                    location.state,
                    location.state_code,
                    location.latitude,
                    location.longitude
                );
                inserted++;
                
                if (inserted % 5000 === 0) {
                    console.log(`Inserted ${inserted}/${locations.length} locations...`);
                }
            } catch (error) {
                // Skip duplicates silently
            }
        }

        console.log(`Seed complete! Inserted ${inserted} locations.`);
    } catch (error) {
        console.error('Error checking/seeding locations:', error);
    }
};

export default checkAndSeedLocations;
