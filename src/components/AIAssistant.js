import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';

const AIAssistant = ({ socketId, getCurrentCode, onInsertCode, isOpen, toggleAI }) => {
    const [input, setInput] = useState('');
    const [conversation, setConversation] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const aiMessagesRef = useRef(null);

    // Auto-scroll when messages, loading state, or errors change
    useEffect(() => {
        if (aiMessagesRef.current) {
            aiMessagesRef.current.scrollTo({
                top: aiMessagesRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [conversation, loading, error]);

    const sendMessageToAI = async (labelText, promptText) => {
        setLoading(true);
        setError(null);

        // 1. Add user query to visual UI conversation log showing only the labelText
        const userMsg = {
            id: `user-${Date.now()}`,
            role: 'user',
            text: labelText
        };
        setConversation((prev) => [...prev, userMsg]);
        setInput('');

        try {
            // 2. Fetch code context. If empty, send the custom fallback instruction.
            let codeContext = getCurrentCode ? getCurrentCode() : '';
            if (!codeContext.trim()) {
                codeContext = "There is currently no code in the editor.\n\nPlease explain what information you need or provide guidance for this task.";
            }

            // 3. Post request to single-turn API endpoint (stateless backend)
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/ai-assist`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    socketId,
                    prompt: promptText,
                    code: codeContext
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch AI response.');
            }

            // 4. Add AI response to visual UI conversation log
            const aiMsg = {
                id: `ai-${Date.now()}`,
                role: 'assistant',
                text: data.text
            };
            setConversation((prev) => [...prev, aiMsg]);
        } catch (err) {
            console.error('AI Assistant request failed:', err);
            setError(err.message || 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        const trimmedPrompt = input.trim();
        if (!trimmedPrompt) return;
        await sendMessageToAI(trimmedPrompt, trimmedPrompt);
    };

    const handlePresetClick = async (labelText, presetPrompt) => {
        if (loading) return;
        await sendMessageToAI(labelText, presetPrompt);
    };

    const handleCopy = (code) => {
        navigator.clipboard.writeText(code)
            .then(() => toast.success('Code copied to clipboard!'))
            .catch(() => toast.error('Could not copy code.'));
    };

    // Regex-based simple Markdown parser to separate code blocks from plain text segments
    const parseResponseText = (text) => {
        if (!text) return [];
        const regex = /```(\w*)\n([\s\S]*?)\n```/g;
        const elements = [];
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(text)) !== null) {
            const matchIndex = match.index;
            if (matchIndex > lastIndex) {
                elements.push({
                    type: 'text',
                    content: text.substring(lastIndex, matchIndex)
                });
            }
            elements.push({
                type: 'code',
                language: match[1] || 'code',
                content: match[2]
            });
            lastIndex = regex.lastIndex;
        }

        if (lastIndex < text.length) {
            elements.push({
                type: 'text',
                content: text.substring(lastIndex)
            });
        }

        return elements;
    };

    const renderMessageContent = (text) => {
        const segments = parseResponseText(text);
        return segments.map((seg, idx) => {
            if (seg.type === 'code') {
                return (
                    <div key={idx} className="codeBlockContainer">
                        <div className="codeBlockHeader">
                            <span>{seg.language}</span>
                            <div className="codeBlockActions">
                                <button 
                                    className="codeActionBtn" 
                                    onClick={() => handleCopy(seg.content)}
                                >
                                    Copy
                                </button>
                                <button 
                                    className="codeActionBtn" 
                                    onClick={() => onInsertCode(seg.content)}
                                >
                                    Insert into Editor
                                </button>
                            </div>
                        </div>
                        <pre>
                            <code>{seg.content}</code>
                        </pre>
                    </div>
                );
            }
            return (
                <span key={idx} style={{ whiteSpace: 'pre-wrap' }}>
                    {seg.content}
                </span>
            );
        });
    };

    return (
        <div className={`aiWrap ${isOpen ? '' : 'collapsed'}`}>
            <div className="aiHeader">
                <h3>AI Coding Assistant</h3>
                <button className="aiCloseBtn" onClick={toggleAI} title="Close AI Assistant">
                    &times;
                </button>
            </div>

            <div className="aiMessages" ref={aiMessagesRef}>
                {conversation.length === 0 ? (
                    <div className="emptyAI">
                        <div className="emptyAIIcon">⚡</div>
                        <p>Ask me anything about your code. Request bug fixes, explanations, or code generations.</p>
                    </div>
                ) : (
                    conversation.map((msg) => {
                        const isMe = msg.role === 'user';
                        return (
                            <div
                                key={msg.id}
                                className={`aiMessageItem ${isMe ? 'outgoing' : 'incoming'}`}
                            >
                                <span className="aiMsgSender">
                                    {isMe ? 'You' : 'AI Assistant'}
                                </span>
                                <div className="aiMsgBubble">
                                    {renderMessageContent(msg.text)}
                                </div>
                            </div>
                        );
                    })
                )}

                {loading && (
                    <div className="loadingContainer">
                        <div className="aiSpinner"></div>
                        <span>AI is thinking...</span>
                    </div>
                )}

                {error && (
                    <div className="aiErrorBanner">
                        <strong>Error:</strong> {error}
                    </div>
                )}
            </div>

            <div className="aiPresets">
                <button
                    type="button"
                    className="aiPresetBtn"
                    onClick={() => handlePresetClick('Explain Code', 'Explain the following code step by step.\nDescribe its purpose, algorithm, important functions, data structures, time and space complexity (if applicable), and mention any potential improvements.')}
                    disabled={loading}
                >
                    Explain Code
                </button>
                <button
                    type="button"
                    className="aiPresetBtn"
                    onClick={() => handlePresetClick('Debug', 'Analyze the following code for syntax errors, logical bugs, runtime issues, edge cases, and incorrect assumptions.\nIf problems exist, explain them clearly and provide corrected code.')}
                    disabled={loading}
                >
                    Debug
                </button>
                <button
                    type="button"
                    className="aiPresetBtn"
                    onClick={() => handlePresetClick('Optimize', 'Review the following code and suggest improvements for performance, readability, maintainability, and best practices.\nExplain every optimization before providing improved code.')}
                    disabled={loading}
                >
                    Optimize
                </button>
                <button
                    type="button"
                    className="aiPresetBtn"
                    onClick={() => handlePresetClick('Add Comments', 'Rewrite the following code with clear and concise comments explaining important logic, functions, loops, and complex sections.\nDo not change the functionality.')}
                    disabled={loading}
                >
                    Add Comments
                </button>
            </div>

            <form className="aiInputForm" onSubmit={handleSend}>
                <input
                    type="text"
                    className="aiInput"
                    placeholder={loading ? "Waiting for AI..." : "Ask the AI assistant..."}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={loading}
                    maxLength={2000}
                />
                <button type="submit" className="aiSendBtn" disabled={loading || !input.trim()}>
                    Ask
                </button>
            </form>
        </div>
    );
};

export default AIAssistant;
