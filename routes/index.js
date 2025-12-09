import {default as postRouter} from './posts.js'
import {default as userRouter} from './users.js'
import {default as homeRouter} from './home.js'
import {default as loginRoutes} from './login.js'
import {default as signupRoutes} from './signup.js'

const configRoutes = (app) => {
    app.use('/', homeRouter);
    app.use('/posts', postRouter);
    app.use('/user', userRouter);
    app.use('/login', loginRoutes);
    app.use('/signup',signupRoutes);

    app.use((req, res) => {
    return res.status(404).json({error: 'Route Not found'});
  });
};

export default configRoutes;