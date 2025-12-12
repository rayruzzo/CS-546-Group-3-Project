import { default as postRouter } from './posts.js';
import { default as userRouter } from './users.js';
import { default as homeRouter } from './home.js';
import { default as dmthreadsRouter } from './dmthreads.js';
import { renderErrorPage } from '../utils/errorUtils.js';
import {default as loginRoutes} from './login.js'
import {default as signupRoutes} from './signup.js'
import {default as logoutRoutes} from './logout.js'

const configRoutes = (app) => {
    app.use('/', homeRouter);
    app.use('/posts', postRouter);
    app.use('/user', userRouter);
    app.use('/dmthreads', dmthreadsRouter);
    app.use('/login', loginRoutes);
    app.use('/signup',signupRoutes);
    app.use('/logout', logoutRoutes);

    app.use((req, res) => {
        return renderErrorPage(res, 404, null);
    });
};

export default configRoutes;
