const { io } = require('c:/Users/khata/OneDrive/Desktop/codesphere/Realtime-Collaborative-Code-Editor/node_modules/socket.io-client');
const ACTIONS = require('c:/Users/khata/OneDrive/Desktop/codesphere/Realtime-Collaborative-Code-Editor/src/actions/Actions');

const SERVER_URL = 'http://localhost:5000';
const ROOM_ID = 'test-verification-room';

async function runTests() {
    console.log('--- Starting Group Chat Verification Tests ---');

    // Test 1: Connect Client A and Join Room
    console.log('\n[Test 1] Connecting Client A (Alice)...');
    const clientA = io(SERVER_URL, { transports: ['websocket'], 'force new connection': true });
    
    await new Promise((resolve) => clientA.on('connect', resolve));
    console.log('Alice connected!');

    let clientASyncedHistory = null;
    clientA.on(ACTIONS.SYNC_CHAT, ({ messages }) => {
        clientASyncedHistory = messages;
        console.log(`Alice received synced history: ${messages.length} messages.`);
    });

    clientA.emit(ACTIONS.JOIN, { roomId: ROOM_ID, username: 'Alice' });

    // Wait a brief moment for join and history sync
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Test 2: Send normal message and receive it
    console.log('\n[Test 2] Alice sending a message...');
    let aliceReceivedMessage = null;
    clientA.on(ACTIONS.RECEIVE_MESSAGE, (msg) => {
        aliceReceivedMessage = msg;
        console.log(`Alice received message: [${msg.username}] -> "${msg.text}" (ID: ${msg.id}, Timestamp: ${msg.timestamp})`);
    });

    clientA.emit(ACTIONS.SEND_MESSAGE, { roomId: ROOM_ID, text: 'Hello, this is Alice!' });
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (aliceReceivedMessage && aliceReceivedMessage.username === 'Alice' && aliceReceivedMessage.text === 'Hello, this is Alice!') {
        console.log('✅ Test 2 Passed: Message broadcasted and received successfully with server-injected metadata.');
    } else {
        console.error('❌ Test 2 Failed.');
        process.exit(1);
    }

    // Test 3: Truncation of messages > 1000 characters
    console.log('\n[Test 3] Alice sending a very long message (>1000 characters)...');
    const longText = 'A'.repeat(1050);
    clientA.emit(ACTIONS.SEND_MESSAGE, { roomId: ROOM_ID, text: longText });
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (aliceReceivedMessage && aliceReceivedMessage.text.endsWith('...')) {
        console.log(`✅ Test 3 Passed: Message truncated correctly. Length is ${aliceReceivedMessage.text.length} chars.`);
    } else {
        console.error('❌ Test 3 Failed: Long message not truncated.');
        process.exit(1);
    }

    // Test 4: Connect Client B and verify history sync
    console.log('\n[Test 4] Connecting Client B (Bob) to verify history synchronization...');
    const clientB = io(SERVER_URL, { transports: ['websocket'], 'force new connection': true });
    await new Promise((resolve) => clientB.on('connect', resolve));

    let bobSyncedMessages = null;
    clientB.on(ACTIONS.SYNC_CHAT, ({ messages }) => {
        bobSyncedMessages = messages;
        console.log(`Bob received synced history: ${messages.length} messages.`);
    });

    clientB.emit(ACTIONS.JOIN, { roomId: ROOM_ID, username: 'Bob' });
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (bobSyncedMessages && bobSyncedMessages.length === 2) {
        console.log('✅ Test 4 Passed: Bob successfully received the chat history of 2 messages.');
    } else {
        console.error('❌ Test 4 Failed.');
        process.exit(1);
    }

    // Test 5: Sliding Window Rate Limiting (max 5 messages per 3 seconds)
    console.log('\n[Test 5] Bob testing rate limits (spamming messages)...');
    let bobErrors = [];
    clientB.on('chat-error', ({ message }) => {
        bobErrors.push(message);
        console.log(`Bob received rate-limit error: "${message}"`);
    });

    // Bob sends 6 messages quickly
    for (let i = 1; i <= 6; i++) {
        clientB.emit(ACTIONS.SEND_MESSAGE, { roomId: ROOM_ID, text: `Spam ${i}` });
    }
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (bobErrors.length > 0) {
        console.log(`✅ Test 5 Passed: Rate limits kicked in! Bob received ${bobErrors.length} error message(s).`);
    } else {
        console.error('❌ Test 5 Failed: Rate limit did not trigger.');
        process.exit(1);
    }

    // Test 6: Room history deletion on disconnect of last client
    console.log('\n[Test 6] Disconnecting all clients to verify memory cleanups...');
    clientA.disconnect();
    clientB.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log('Reconnecting Bob to verify if history was cleared...');
    const clientC = io(SERVER_URL, { transports: ['websocket'], 'force new connection': true });
    await new Promise((resolve) => clientC.on('connect', resolve));

    let cleanSyncedMessages = null;
    clientC.on(ACTIONS.SYNC_CHAT, ({ messages }) => {
        cleanSyncedMessages = messages;
        console.log(`Reconnected client received synced history: ${messages.length} messages.`);
    });

    clientC.emit(ACTIONS.JOIN, { roomId: ROOM_ID, username: 'Charlie' });
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (cleanSyncedMessages && cleanSyncedMessages.length === 0) {
        console.log('✅ Test 6 Passed: Chat history was correctly purged from memory (no memory leaks).');
    } else {
        console.error('❌ Test 6 Failed: Chat history was not purged.');
        process.exit(1);
    }

    clientC.disconnect();
    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉');
    process.exit(0);
}

runTests().catch((err) => {
    console.error('Test suite crashed:', err);
    process.exit(1);
});
