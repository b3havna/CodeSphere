import React, { useState, useRef, useEffect } from 'react';
import ACTIONS from '../actions/Actions';

const Chat = ({ socketRef, roomId, username, messages, isOpen, toggleChat }) => {
    const [text, setText] = useState('');
    const chatMessagesRef = useRef(null);

    // Auto-scroll logic to keep the user at the bottom when new messages arrive
    useEffect(() => {
        if (chatMessagesRef.current && messages.length > 0) {
            const { scrollHeight, scrollTop, clientHeight } = chatMessagesRef.current;
            // Determine if the user is scrolled near the bottom of the chat container
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 120;
            
            // Check if the latest message was sent by the current user
            const lastMessage = messages[messages.length - 1];
            const sentByMe = lastMessage && lastMessage.username === username;

            // Auto-scroll if already at bottom, or if the current user sent the message
            if (isNearBottom || sentByMe) {
                setTimeout(() => {
                    if (chatMessagesRef.current) {
                        chatMessagesRef.current.scrollTo({
                            top: chatMessagesRef.current.scrollHeight,
                            behavior: 'smooth'
                        });
                    }
                }, 50); // Small delay to guarantee React has updated the DOM
            }
        }
    }, [messages, username]);

    const handleSend = (e) => {
        e.preventDefault();
        const trimmed = text.trim();
        if (!trimmed) return;

        // Emit message payload to the server containing only the roomId and the text
        if (socketRef.current) {
            socketRef.current.emit(ACTIONS.SEND_MESSAGE, {
                roomId,
                text: trimmed,
            });
        }
        setText('');
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className={`chatWrap ${isOpen ? '' : 'collapsed'}`}>
            <div className="chatHeader">
                <h3>Room Chat</h3>
                <button className="chatCloseBtn" onClick={toggleChat} title="Close Chat">
                    &times;
                </button>
            </div>

            <div className="chatMessages" ref={chatMessagesRef}>
                {messages.length === 0 ? (
                    <div className="emptyChat">
                        <div className="emptyChatIcon">💬</div>
                        <p>No messages yet. Start the conversation!</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.username === username;
                        return (
                            <div
                                key={msg.id}
                                className={`messageItem ${isMe ? 'outgoing' : 'incoming'}`}
                            >
                                <span className="msgSender">
                                    {isMe ? 'You' : msg.username}
                                </span>
                                <div className="msgBubble">
                                    {msg.text}
                                </div>
                                <span className="msgMeta">
                                    {formatTime(msg.timestamp)}
                                </span>
                            </div>
                        );
                    })
                )}
            </div>

            <form className="chatInputForm" onSubmit={handleSend}>
                <input
                    type="text"
                    className="chatInput"
                    placeholder="Type a message..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    maxLength={1000}
                />
                <button type="submit" className="chatSendBtn">
                    Send
                </button>
            </form>
        </div>
    );
};

export default Chat;
