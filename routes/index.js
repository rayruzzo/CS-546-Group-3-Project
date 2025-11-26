import {default as postRouter} from './posts.js';
import hubRouter from './hub.js';
import dmthreadsRouter from './dmthreads.js';

const constructorMethod = (app) => {
  app.use('/', hubRouter); // Main Landing Page
  app.use('/posts', postRouter); // Posts Feature
  app.use('/dmthreads', dmthreadsRouter); // DM feature
  
  // 404 handler
  app.use((req, res) => {
    return res.status(404).json({error: 'Route Not found'});
  });
};

export default constructorMethod;