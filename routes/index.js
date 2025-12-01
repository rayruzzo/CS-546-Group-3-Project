import {default as postRouter} from './posts.js'
import {default as userRouter} from './users.js'

const constructorMethod = (app) => {
    app.use('/posts', postRouter);
    app.use('/user', userRouter);

    app.use((req, res) => {
    return res.status(404).json({error: 'Route Not found'});
  });
};

export default constructorMethod;