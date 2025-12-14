import { ObjectId } from "mongodb";
import db from "../config/mongoCollections.js"
import validators from "../validation.js"
import users from "./users.js"


//Validate User ID
const _validateUserId = (id, label) => {
    return validators.validateId(id, label);
};

//Add Friend
const addFriend = async (userId, friendId) => {
    userId = _validateUserId(userId, "User ID");
    friendId = _validateUserId(friendId, "Friend ID");

    if (userId === friendId) throw "Users cannot friend themselves";
    const user = await users.getUserById(userId);
    const friend = await users.getUserById(friendId);
    if (!user || !friend) {
        throw `Cannot add friend: user with Id's ${userId} or ${friendId} does not exist.`;
    }

    const userCollection = await db.users();
    // Add friend to user
    await userCollection.updateOne(
        { _id: new ObjectId(userId) },
        { $addToSet: { friends: friendId} }
    );

    // Add user to friend
    await userCollection.updateOne(
        { _id: new ObjectId(friendId) },
        { $addToSet: { friends: userId } }
    );
    return { message: "Users are now friends" };
};


//Remove Friend
const removeFriend = async (userId, friendId) => {
    userId = _validateUserId(userId, "User ID");
    friendId = _validateUserId(friendId, "Friend ID");

    const user = await users.getUserById(userId);
    const friend = await users.getUserById(friendId);
    if (!user || !friend) {
        throw `Cannot remove friend: user with Id's ${userId} or ${friendId} does not exist.`;
    }

    const userCollection = await db.users();
    // Remove friend from user
    await userCollection.updateOne(
        { _id: new ObjectId(userId) },
        { $pull : { friends: friendId } }
    );

    // Remove user from friend
    await userCollection.updateOne(
        { _id: new ObjectId(friendId) },
        { $pull : { friends: userId } }
    );
    return { message: "Users are no longer friends" };
};

//Get mutual friends
const getMutualFriends = async (userId1, userId2) => {
    userId1 = _validateUserId(userId1, "User ID 1");
    userId2 = _validateUserId(userId2, "User ID 2");

    // return empty result object if comparing against ourself
    if (userId1 === userId2) 
        return {};

    const user1 = await users.getUserById(userId1);
    const user2 = await users.getUserById(userId2);
    if (!user1 || !user2) {
        throw `Cannot get mutual friends: user with Id's ${userId1} or ${userId2} does not exist.`;
    }

    const friends1 = new Set(user1.user.friends || []);
    const friends2 = new Set(user2.user.friends || []);

    // find mutual friends - intersection
    let mutualFriendIds;
    if (Set.prototype.intersection) {
        mutualFriendIds = friends1.intersection(friends2);
    } else {
        mutualFriendIds = [...friends1].filter(id => friends2.has(id.toString()));
    }

    // check if the two are friends
    const friendsWith = friends2.has(userId1);

    return {
        mutualFriendIds: mutualFriendIds, 
        friendsWith:     friendsWith
    };
};



//Get all friends for a user
const getFriends = async (userId) => {
    userId = _validateUserId(userId, "User ID");
    const user = await users.getUserById(userId);
    if (!user) {
        throw `Cannot get user: user with Id ${userId} does not exist.`;
    }
    return user.user.friends || [];
};

const friendFunctions={
    addFriend,
    removeFriend,
    getMutualFriends,
    getFriends
};

export default friendFunctions;
