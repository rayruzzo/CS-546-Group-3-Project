import {dbConnection} from './mongoConnection.js';

const getCollectionFn = (collection) => {
  let _col = undefined;

  return async () => {
    if (!_col) {
      const db = await dbConnection();
      _col = await db.collection(collection);
    }

    return _col;
  };
};

const users = getCollectionFn('users');
const posts = getCollectionFn('posts');
const comments = getCollectionFn('comments');
const data = getCollectionFn('data');

const exports = {
  users,
  posts,
  comments,
  data
};

export default exports;