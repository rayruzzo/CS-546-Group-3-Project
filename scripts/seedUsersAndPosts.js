import db from '../config/mongoCollections.js';
import userData from '../data/users.js';
import postData from '../data/posts.js';
import locationData from '../data/locations.js';
import { userSchema } from '../models/users.js';
import { postSchema } from '../models/posts.js';

const seedUsersAndPosts = async () => {
    try {
        const usersCollection = await db.users();
        const postsCollection = await db.posts();
        
        // Check if already seeded
        const userCount = await usersCollection.countDocuments();
        const postCount = await postsCollection.countDocuments();
        
        if (userCount > 0 || postCount > 0) {
            console.log(`Database already has ${userCount} users and ${postCount} posts`);
            console.log('Skipping seed. Delete collections to re-seed.');
            return;
        }

        console.log('Starting user and post seed...');

        // Create test users with Marvel characters
        const testUsers = [
            {
                email: 'steve.rogers@avengers.com',
                password: 'Password123!',
                zipcode: '11201', // Brooklyn Heights
                profile: {
                    username: 'starspangledman',
                    firstName: 'Steve',
                    lastName: 'Rogers',
                    dob: new Date('1918-07-04'),
                    bio: 'I can do this all day. Brooklyn native, always ready to help my neighbors.',
                    profilePicture: null
                },
                settings: {
                    dmsEnabled: true
                }
            },
            {
                email: 'kamala.khan@gmail.com',
                password: 'Password123!',
                zipcode: '07305', // Jersey City
                profile: {
                    username: 'msmarvel-jc',
                    firstName: 'Kamala',
                    lastName: 'Khan',
                    dob: new Date('2000-08-15'),
                    bio: 'Jersey City represent! Embiggen your life by helping others!',
                    profilePicture: null
                },
                settings: {
                    dmsEnabled: true
                }
            },
            {
                email: 'carol.danvers@usaf.mil',
                password: 'Password123!',
                zipcode: '02108', // Boston
                profile: {
                    username: 'higherfurtherfaster',
                    firstName: 'Carol',
                    lastName: 'Danvers',
                    dob: new Date('1968-04-24'),
                    bio: 'Higher, further, faster. Former Air Force pilot, happy to help my community.',
                    profilePicture: null
                },
                settings: {
                    dmsEnabled: true
                }
            },
            {
                email: 'jennifer.walters@law.com',
                password: 'Password123!',
                zipcode: '90028', // Los Angeles
                profile: {
                    username: 'superhero-at-law',
                    firstName: 'Jennifer',
                    lastName: 'Walters',
                    dob: new Date('1980-05-12'),
                    bio: 'Attorney at law. Strong advocate for my neighbors (literally and figuratively).',
                    profilePicture: null
                },
                settings: {
                    dmsEnabled: true
                }
            },
            {
                email: 'matt.murdock@nelsonmurdock.com',
                password: 'Password123!',
                zipcode: '10036', // Hell\'s Kitchen, Manhattan
                profile: {
                    username: 'devils-advocate',
                    firstName: 'Matt',
                    lastName: 'Murdock',
                    dob: new Date('1982-10-16'),
                    bio: 'I\'m not daredevil.',
                    profilePicture: null
                },
                settings: {
                    dmsEnabled: true
                }
            },
            {
                email: 'peter.parker@empire.edu',
                password: 'Password123!',
                zipcode: '11375', // Forest Hills, Queens
                profile: {
                    username: 'friendly-neighbor',
                    firstName: 'Peter',
                    lastName: 'Parker',
                    dob: new Date('2001-08-10'),
                    bio: 'Your friendly neighborhood helper! Queens born and raised. With great power comes great responsibility.',
                    profilePicture: null
                },
                settings: {
                    dmsEnabled: true
                }
            }
        ];

        console.log('Creating users...');
        const createdUsers = [];
        
        await userData.server.calculateOptimalSaltRounds();  
        
        await Promise.all(  
            testUsers.map(async (user) => {  
                try {
                    // Validate user data against schema
                    // Pass empty session context to indicate no logged-in user (for requiredIfNotLoggedIn)
                    const validatedUser = await userSchema.validate(user, { 
                        abortEarly: false,
                        context: { session: {} } 
                    });
                    
                    const result = await userData.createUser(validatedUser);  
                    createdUsers.push({ ...result.user, zipcode: user.zipcode });  
                    console.log(`Created user: ${user.profile.username}`);  
                } catch (error) {
                    console.error(`Error creating user ${user.profile.username}:`, error.message);
                    if (error.inner) {
                        error.inner.forEach(err => console.error(`  - ${err.path}: ${err.message}`));
                    }
                    if (error.cause) {
                        console.error('  Cause:', error.cause);
                    }
                    console.error('  Full error:', error);
                }  
            })  
        )  

        console.log(`\nCreated ${createdUsers.length} users`);

        const seedPosts = {
            'starspangledman': [
                {
                    title: 'Offering self-defense training for seniors',
                    content: 'Former military here. I\'d like to offer free self-defense classes for seniors in the Brooklyn area. Classes will be gentle but effective. Let\'s keep our community safe!',
                    type: 'offer',
                    category: 'services',
                    tags: ['self-defense', 'seniors', 'safety', 'brooklyn'],
                    priority: 3 // High priority
                },
                {
                    title: 'Looking for vintage motorcycle parts',
                    content: 'Restoring a 1940s Harley-Davidson. Anyone have leads on authentic parts or know a good restoration shop in Brooklyn? Would really appreciate the help.',
                    type: 'request',
                    category: 'other',
                    tags: ['motorcycle', 'vintage', 'restoration'],
                    priority: 1 // Low priority
                },
                {
                    title: 'Free art history lectures at community center',
                    content: 'Giving talks about 1940s American art and culture at the Brooklyn Community Center every Thursday. All ages welcome. It\'s important to remember our history.',
                    type: 'offer',
                    category: 'education',
                    tags: ['history', 'art', 'education', 'community'],
                    priority: 2, // Normal priority
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Expires in 30 days
                }
            ],
            'msmarvel-jc': [
                {
                    title: 'Gaming night organizer needed!',
                    content: 'Want to start a weekly gaming group for teens in Jersey City. Looking for someone to help organize and maybe host. Thinking board games, video games, all the good stuff!',
                    type: 'request',
                    category: 'event',
                    tags: ['gaming', 'teens', 'community', 'fun'],
                    priority: 2
                },
                {
                    title: 'Can help with fan fiction writing workshops',
                    content: 'Love creative writing and fan fiction! Happy to lead workshops for aspiring writers. All fandoms welcome. Let\'s get those stories out there!',
                    type: 'offer',
                    category: 'education',
                    tags: ['writing', 'creative', 'workshop', 'fanfiction'],
                    priority: 2
                },
                {
                    title: 'Embiggen your wardrobe - clothing swap event',
                    content: 'Organizing a clothing swap for teens next Saturday at the community center. Bring clothes you don\'t wear, take home something new! Sustainable and fun.',
                    type: 'offer',
                    category: 'event',
                    tags: ['clothing', 'swap', 'sustainable', 'teens'],
                    priority: 3,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Expires in 7 days
                }
            ],
            'higherfurtherfaster': [
                {
                    title: 'Aviation career mentorship available',
                    content: 'Former Air Force pilot. Happy to mentor anyone interested in aviation or military careers. Especially encouraging women to reach for the skies!',
                    type: 'offer',
                    category: 'education',
                    tags: ['aviation', 'mentorship', 'career', 'military'],
                    priority: 2
                },
                {
                    title: 'Need cat sitter for the weekend',
                    content: 'Looking for someone to check in on my cat Chewie this weekend. He\'s orange, fluffy, and thinks he\'s tougher than he is. Will pay $30/day.',
                    type: 'request',
                    category: 'pet care',
                    tags: ['cat', 'pet-sitting', 'weekend'],
                    priority: 4, // Urgent
                    expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // Expires in 2 days
                },
                {
                    title: 'Free fitness bootcamp in the park',
                    content: 'Running a high-intensity workout session every Saturday morning in Boston Common. All fitness levels welcome - we\'ll go higher, further, faster together!',
                    type: 'offer',
                    category: 'services',
                    tags: ['fitness', 'workout', 'bootcamp', 'free'],
                    priority: 3
                }
            ],
            'superhero-at-law': [ // Jennifer Walters
                {
                    title: 'Free legal clinic for small claims',
                    content: 'Offering pro bono legal advice for small claims court cases. LA residents dealing with landlord disputes, contract issues, etc. Let\'s get you justice!',
                    type: 'offer',
                    category: 'services',
                    tags: ['legal', 'pro-bono', 'advice', 'justice'],
                    priority: 3
                },
                {
                    title: 'Need recommendations for strength training gym',
                    content: 'New to the LA area and looking for a gym with serious strength training equipment. Preferably somewhere that won\'t judge if I get a little intense with the weights.',
                    type: 'request',
                    category: 'other',
                    tags: ['gym', 'fitness', 'strength-training'],
                    priority: 1
                },
                {
                    title: 'Women in law mentorship program',
                    content: 'Starting a mentorship program for women law students and recent graduates. Monthly meetups, networking, and career advice. Let\'s break through those glass ceilings!',
                    type: 'offer',
                    category: 'education',
                    tags: ['law', 'mentorship', 'women', 'career'],
                    priority: 3,
                    expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // Expires in 60 days
                }
            ],
            'devils-advocate': [ // Matt Murdock
                {
                    title: 'Free legal services for Hell\'s Kitchen residents',
                    content: 'Nelson & Murdock offering pro bono legal representation for Hell\'s Kitchen residents. Criminal defense, housing issues, civil rights cases. Justice for all.',
                    type: 'offer',
                    category: 'services',
                    tags: ['legal', 'pro-bono', 'justice', 'hells-kitchen'],
                    priority: 4 // Urgent
                },
                {
                    title: 'Looking for audio book recommendations',
                    content: 'Prefer audio books for obvious reasons. Anyone have great mystery or legal thriller recommendations? Bonus points for NYC-based stories.',
                    type: 'request',
                    category: 'other',
                    tags: ['books', 'audiobooks', 'recommendations'],
                    priority: 1
                },
                {
                    title: 'Boxing lessons for self-defense',
                    content: 'Offering boxing lessons with focus on self-defense and fitness. Training at Fogwell\'s Gym. All skill levels welcome. First month free for Hell\'s Kitchen residents.',
                    type: 'offer',
                    category: 'services',
                    tags: ['boxing', 'self-defense', 'fitness', 'gym'],
                    priority: 3,
                    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // Expires in 14 days
                }
            ],
            'friendly-neighbor': [ // Peter Parker
                {
                    title: 'Science tutoring for middle/high schoolers',
                    content: 'Physics and chemistry tutor available! I\'m a science nerd and love helping students understand complex concepts. Queens students get priority. Very reasonable rates!',
                    type: 'offer',
                    category: 'education',
                    tags: ['tutoring', 'science', 'physics', 'chemistry'],
                    priority: 2
                },
                {
                    title: 'Need camera equipment for school project',
                    content: 'Working on a photography project for school. Anyone have a decent camera I could borrow for a week? Will take amazing care of it, I promise!',
                    type: 'request',
                    category: 'tool',
                    tags: ['camera', 'photography', 'borrow', 'school'],
                    priority: 3,
                    expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // Expires in 5 days
                },
                {
                    title: 'Web design help for small businesses',
                    content: 'Can help local Queens businesses set up basic websites. I\'m pretty good with web stuff. Low cost or trade for food (college student here). Let\'s get your business online!',
                    type: 'offer',
                    category: 'services',
                    tags: ['web-design', 'business', 'technology', 'affordable'],
                    priority: 2
                }
            ]
        };

        console.log('\nCreating posts...');
        let postsCreated = 0;

        for (const user of createdUsers) {
            const username = user.profile.username;
            const userPosts = seedPosts[username];

            if (userPosts) {
                for (const template of userPosts) {
                    try {
                        // Add some variety to priority and expiration dates
                        const priority = template.priority || 2; // Default to normal
                        const expiresAt = template.expiresAt || null;
                        
                        await postData.createPost(
                            template.title,
                            user._id.toString(),
                            template.content,
                            template.type,
                            template.category,
                            true, // commentsEnabled
                            template.tags,
                            priority,
                            expiresAt
                        );
                        postsCreated++;
                        console.log(`Created post: "${template.title}" for user ${username}`);
                    } catch (error) {
                        console.error(`Error creating post for user ${username}:`, error.message);
                    }
                }
            }
        }

        console.log(`\n✅ Seed complete!`);
        console.log(`Created ${createdUsers.length} users and ${postsCreated} posts`);
        console.log('\nTest user credentials (all use password: Password123!):');
        testUsers.forEach(u => console.log(`  - ${u.email} (${u.zipcode})`));

    } catch (error) {
        console.error('Error seeding users and posts:', error);
        throw error;
    }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    seedUsersAndPosts()
        .then(() => {
            console.log('\nSeed script completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\nSeed script failed:', error);
            process.exit(1);
        });
}

export default seedUsersAndPosts;
