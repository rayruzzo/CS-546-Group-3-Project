// Prototype file (No Longer Used)

// User <-> Thread <-> Messages
// Will add in async once mongo is setup, for now just keeping engine normal to ensure works synchronously first.

/**************************************************************************** 
 * Function createMessage(from, to, content)
 * Description: creates a message object.
****************************************************************************/
function createMessage(from, to, content) {
    return {
        id: generateId(),
        from: from,
        to: to,
        content: content,
        timestamp: new Date()
    };
}

/**************************************************************************** 
 * Function createThread(user1, user2)
 * Description: creates a thread object.
****************************************************************************/
function createThread(user1, user2) {
    return {
        id: generateId(),
        participants: [user1, user2],
        messages: []
    }
}

/**************************************************************************** 
 * Function addMessageToThread(thread, message)
 * Description: adds a Message to a Thread.
****************************************************************************/
function addMessageToThread(thread, message) {
    return thread.messages.push(message);
}


/**************************************************************************** 
 * Function fetchThreadById(thread)
 * Description: Returns the thread object matching the given ID, or null if not found.
****************************************************************************/
function fetchThreadById(threadArray, threadId) {
    for (let i = 0; i < threadArray.length; i++) {
        if (threadArray[i].id == threadId) {
            return threadArray[i];
        }
    }
    return null;
}

/**************************************************************************** 
 * Function fetchThreadsForUser(threadsArray, username)
 * Description: Returns all threads within threadsArray where given user is a participant.
****************************************************************************/
function fetchThreadsForUser(threadsArray, username) {
    let foundThreadsforUser = [];
    for (let i = 0; i < threadsArray.length; i++) {
        for (let v = 0; v < threadsArray[i].participants.length; v++) {
            if (username === threadsArray[i].participants[v]) {
                foundThreadsforUser.push(threadsArray[i]);
                continue;
            }
        }
    }
    return foundThreadsforUser;
}
 

/**************************************************************************** 
 * Function generateId()
 * Description: Generates and returns a unique string ID.  Formatted to be 
 * (current date + timestamp in milliseconds)-(up to three random numbers) so as to avoid 
 * collision.
****************************************************************************/
function generateId() {
    const timestamp = Date.now();
    const randomGen = Math.round((Math.random()*1000)); 
    const generatedId = `${timestamp}-${randomGen}`;
    //console.log(generatedID); // Debug line
    return generatedId;
}


/****************************************************************************
 * Seeded Sample Data/Testing
 ****************************************************************************/

/*
let dmThreads = []; // Will be storing Threads in mongo but this is just for testing.

const thread1 = createThread("TestUser1", "TestUser2");
const msg1 = createMessage("User1", "User2", "howdy");
const msg2 = createMessage("User2", "User1", "hello!");
const msg3 = createMessage("User1", "User2", "how are you?");

addMessageToThread(thread1, msg1);
addMessageToThread(thread1, msg2);
addMessageToThread(thread1, msg3);
dmThreads.push(thread1);
*/

/*
console.log('***********SEED FOR DIRECT MESSAGING START***********');
console.log('---------------SEED FROM: MESSAGES.JS----------------');
console.log(fetchThreadById(dmThreads, thread1.id));
console.log(fetchThreadsForUser(dmThreads, "TestUser1"));
console.log('***********SEED FOR DIRECT MESSAGING END*************');
*/


/****************************************************************************
 * Exports
 ****************************************************************************/
export {
    createMessage,
    createThread,
    addMessageToThread,
    fetchThreadById,
    fetchThreadsForUser,
    dmThreads
};