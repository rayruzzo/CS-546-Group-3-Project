import postRouter from './posts.js'

const constructorMethod = (app) => {
    app.use('/posts', postRouter);

    app.use((req, res) => {
    return res.status(404).json({error: 'Route Not found'});
  });
};

export default constructorMethod;