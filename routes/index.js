import {default as postRouter} from './posts.js'
import {default as homeRouter} from './home.js'

const constructorMethod = (app) => {
    app.use('/', homeRouter);
    app.use('/posts', postRouter);

    app.use((req, res) => {
    return res.status(404).json({error: 'Route Not found'});
  });
};

export default constructorMethod;