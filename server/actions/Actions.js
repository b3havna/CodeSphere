/**
 * NOTE: This file must remain synchronized with client/src/actions/Actions.js.
 * It contains Socket.io event name constants shared between the client and server.
 */
const ACTIONS = {
    JOIN: 'join',
    JOINED: 'joined',
    DISCONNECTED: 'disconnected',
    CODE_CHANGE: 'code-change',
    SYNC_CODE: 'sync-code',
    SEND_MESSAGE: 'send-message',
    RECEIVE_MESSAGE: 'receive-message',
    SYNC_CHAT: 'sync-chat',
    LEAVE: 'leave',
};

module.exports = ACTIONS;
