import { default as postRouter } from './posts.js';
import { default as userRouter } from './users.js';
import { default as homeRouter } from './home.js';
import { default as dmthreadsRouter } from './dmthreads.js';
import { default as moderatorRouter } from "./moderator.js";
import { renderErrorPage } from '../utils/errorUtils.js';

const configRoutes = (app) => {
    app.use('/', homeRouter);
    app.use('/posts', postRouter);
    app.use('/user', userRouter);
    app.use('/dmthreads', dmthreadsRouter);
    app.use("/moderator", moderatorRouter);

    app.use((req, res) => {
        return renderErrorPage(res, 404, null);
    });
};

export default configRoutes;