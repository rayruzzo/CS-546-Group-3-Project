import 'dotenv/config';
import express from 'express';
import exphbs from 'express-handlebars';
import session from 'express-session';
import { closeConnection } from "./config/mongoConnection.js";
import configRoutes from './routes/index.js';
import checkAndSeedLocations from './scripts/checkAndSeed.js';

const app = express();

// Check and seed locations if needed (runs once on startup)
await checkAndSeedLocations();

const { PORT } = process.env;

// setup middleware
app.use(session({
  name: 'TestSessionCookie',
  secret: 'your-session-secret', // replace with a secure secret in production
  resave: false,
  saveUninitialized: false
}));

// Middleware to set mock user data in session
app.use((req, res, next) => {
  if (!req.session.user) {
    req.session.user = { zipCode: "07030" }; // setting as a test user with a zip code
  }
  next();
});

// setup middleware
app.use('/public', express.static('public'));
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// handlebars
const handlebarsInstance = exphbs.create({
	defaultLayout: "main",
   partialsDir: ['views/partials/']
   // ...further config
});
app.engine('handlebars', handlebarsInstance.engine);
app.set('view engine', 'handlebars');

// config routes
configRoutes(app);

const server = app.listen(PORT);

// only display success log if listening
server.on('listening', () => {
   console.log(`Server up and running at http://localhost:${PORT}`);
});


// handle EADDRINUSE (port already in use) error
// Slightly modified from: https://nodejs.org/docs/latest/api/net.html#serverlisten
server.on('error', (e) => {
   const timeoutSeconds = 2;

   if (e.code === 'EADDRINUSE') {
      console.error(`port ${PORT} in use, retrying in ${timeoutSeconds}s`);
      
      setTimeout(() => {
         server.close();
         server.listen(PORT);
      }, timeoutSeconds * 1000);
   } else {
      console.error(e);
   }
});

// `process` is this Node process
// debugging graceful shutdown from 
// https://expressjs.com/en/advanced/healthcheck-graceful-shutdown.html
process.on('SIGTERM', shutdownGracefully);
process.on('SIGINT', shutdownGracefully);

async function shutdownGracefully(signal) {
   const forcefulShutdownDelaySecs = 3;
   
   try {
      console.log(`\n${signal} signal received: closing HTTP server`);
   
      const closeStatus = await closeConnection();  // check if MongoDB is even connected
      if (closeStatus) 
         console.log("MongoDB connection closed");
      else if (closeStatus === undefined)
         console.log("MongoDB is not connected. Continuing shutdown anyway.");

      server.close(() => {
         console.log('HTTP server closed');
      })
      
      server.getConnections((e, count) => {
         if (count) {
            console.log(`All connections will be forcefully closed in ${forcefulShutdownDelaySecs} seconds`);

            setTimeout(() => {
               server.closeAllConnections();
               console.log("All connections have been closed");
            }, forcefulShutdownDelaySecs * 1000);
         }
      })
      
   } catch (e) {
      console.error("An error occurred while shutting down gracefully:", e);
      process.exitCode = 1;   // set error code and allow Node to exit naturally
   }
}
