<<<<<<< HEAD
import {default as postRouter} from './posts.js';
import hubRouter from './hub.js';
import dmthreadsRouter from './dmthreads.js';

const constructorMethod = (app) => {
  app.use('/', hubRouter); // Main Landing Page
  app.use('/posts', postRouter); // Posts Feature
  app.use('/dmthreads', dmthreadsRouter); // DM feature
  
  // 404 handler
  app.use((req, res) => {
=======
import {default as postRouter} from './posts.js'
import {default as userRouter} from './users.js'
import {default as homeRouter} from './home.js'

const configRoutes = (app) => {
    app.use('/', homeRouter);
    app.use('/posts', postRouter);
    app.use('/user', userRouter);

    app.use((req, res) => {
>>>>>>> 9a446a2b70b456d17472dc9c74696a1e8ca834dc
    return res.status(404).json({error: 'Route Not found'});
  });
};

export default configRoutes;