import {default as postRouter} from './posts.js'
import {default as homeRouter} from './home.js'
import {default as loginRoutes} from './login.js'

const configRoutes = (app) => {
    app.use('/', homeRouter);
    app.use('/posts', postRouter);
    app.use('/login', loginRoutes);

    app.use((req, res) => {
    return res.status(404).json({error: 'Route Not found'});
  });
};

export default configRoutes;