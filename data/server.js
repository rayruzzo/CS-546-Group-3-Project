import EventEmitter from "node:events";

export const serverEmitter = new EventEmitter({ captureRejections: true });

const sessionRoleUpdateTable   = new Map();
const sessionBannedUpdateTable = new Map();


export function setupServerEmitter() {
   
   serverEmitter.on("updateSessionRoleTable", updateSessionRoleTable);
   serverEmitter.on("updateSessionBannedTable", updateSessionBannedTable);
   
   serverEmitter.on("checkSessionUpdateTables", readAndUpdateSession);

   serverEmitter.on("error", (e) => {
      console.log("An error occurred with the serverEmitter");
   });

   return;
}


function readAndUpdateSession(userSession) {
   if (userSession) {

      const newRole      = sessionRoleUpdateTable.get(userSession._id);
      const bannedStatus = sessionBannedUpdateTable.get(userSession._id);

      if (newRole) {
         userSession.role = newRole;
         sessionRoleUpdateTable.delete(userSession._id);
      }

      if (bannedStatus) {
         userSession.isBanned = bannedStatus;
         sessionBannedUpdateTable.delete(userSession._id);
      }
   }
   
   return;
}

function updateSessionRoleTable({ targetUserId, newRole }) {
   sessionRoleUpdateTable.set(targetUserId, newRole);
   return;
}

function updateSessionBannedTable({ targetUserId, isBanned }) {
   sessionBannedUpdateTable.set(targetUserId, isBanned);
   return;
}
