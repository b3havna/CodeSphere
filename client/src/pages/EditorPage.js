import React, { useState, useRef, useEffect, useContext } from "react";
import toast from "react-hot-toast";
import Client from "../components/Client";
import Editor from "../components/Editor";
import FilePreview from "../components/FilePreview";
import { language, cmtheme } from "../../src/atoms";
import { useRecoilState } from "recoil";
import ACTIONS from "../actions/Actions";
import { initSocket } from "../socket";
import {
  useLocation,
  useNavigate,
  Navigate,
  useParams,
} from "react-router-dom";
import Chat from "../components/Chat";
import AIAssistant from "../components/AIAssistant";
import { AuthContext } from "../context/AuthContext";

const EditorPage = () => {
  const [lang, setLang] = useRecoilState(language);
  const [them, setThem] = useRecoilState(cmtheme);
  const { token, user } = useContext(AuthContext);

  const [clients, setClients] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [outputOpen, setOutputOpen] = useState(false);
  const [stdin, setStdin] = useState("");
  const [execResult, setExecResult] = useState(null);
  const [execError, setExecError] = useState(null);

  const socketRef = useRef(null);
  const codeRef = useRef(null);
  const location = useLocation();
  const { roomId } = useParams();
  const reactNavigator = useNavigate();

  const [filePreview, setFilePreview] = useState(false);
  const [fileContent, setFileContent] = useState("");
  const fileInputRef = useRef(null);
  const editorInstanceRef = useRef(null);

  // Keep ref updated to avoid stale closure inside socket event listeners
  const isChatOpenRef = useRef(isChatOpen);
  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
  }, [isChatOpen]);

  useEffect(() => {
    const init = async () => {
      socketRef.current = await initSocket(token);
      socketRef.current.on("connect_error", (err) => handleErrors(err));
      socketRef.current.on("connect_failed", (err) => handleErrors(err));

      function handleErrors(e) {
        console.log("socket error", e);
        toast.error("Socket connection failed, try again later.");
        reactNavigator("/");
      }

      socketRef.current.emit(ACTIONS.JOIN, {
        roomId,
        username: location.state?.username,
      });

      // Listening for joined event
      socketRef.current.on(
        ACTIONS.JOINED,
        ({ clients, username, socketId }) => {
          if (username !== location.state?.username) {
            toast.success(`${username} joined the room.`);
            console.log(`${username} joined`);
          }
          setClients(clients);
          socketRef.current.emit(ACTIONS.SYNC_CODE, {
            code: codeRef.current,
            socketId,
          });
        }
      );

      // Listening for disconnected
      socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
        toast.success(`${username} left the room.`);
        setClients((prev) => {
          return prev.filter((client) => client.socketId !== socketId);
        });
      });

      // Listening for chat messages sync
      socketRef.current.on(ACTIONS.SYNC_CHAT, ({ messages }) => {
        setMessages(messages);
      });

      // Listening for new incoming chat message
      socketRef.current.on(ACTIONS.RECEIVE_MESSAGE, (message) => {
        setMessages((prev) => [...prev, message]);
        if (!isChatOpenRef.current) {
          setUnreadCount((prev) => prev + 1);
        }
      });

      // Listening for chat rate-limit error notifications
      socketRef.current.on("chat-error", ({ message }) => {
        toast.error(message);
      });

      // Listening for initial room state from MongoDB
      socketRef.current.on('init-room-state', ({ code, language: savedLang }) => {
        if (savedLang && savedLang !== lang) {
          setLang(savedLang);
        }
        if (code !== null && code !== undefined) {
          editorInstanceRef.current?.setCode(code);
          codeRef.current = code;
        }
      });

      // Listening for language changes from other clients
      socketRef.current.on('room-language-changed', ({ language: newLang }) => {
        if (newLang && newLang !== lang) {
          setLang(newLang);
        }
      });
    };
    init();
    return () => {
      socketRef.current.off(ACTIONS.JOINED);
      socketRef.current.off(ACTIONS.DISCONNECTED);
      socketRef.current.off(ACTIONS.SYNC_CHAT);
      socketRef.current.off(ACTIONS.RECEIVE_MESSAGE);
      socketRef.current.off("chat-error");
      socketRef.current.off("init-room-state");
      socketRef.current.off("room-language-changed");
      socketRef.current.disconnect();
    };
  }, []);

  const toggleChat = () => {
    setIsChatOpen((prev) => {
      const nextState = !prev;
      if (nextState) {
        setUnreadCount(0);
        setIsAIOpen(false); // Close AI panel if opening chat
      }
      return nextState;
    });
  };

  const toggleAI = () => {
    setIsAIOpen((prev) => {
      const nextState = !prev;
      if (nextState) {
        setIsChatOpen(false); // Close chat if opening AI panel
      }
      return nextState;
    });
  };

  const getCurrentCode = () => {
    return codeRef.current || '';
  };

  const handleInsertCode = (code) => {
    editorInstanceRef.current?.insertCode(code);
  };

  const runCode = async () => {
    const source_code = codeRef.current || "";
    if (!source_code.trim()) {
      toast.error("Please write some code first before running!");
      return;
    }

    setExecuting(true);
    setExecError(null);
    setExecResult(null);
    setOutputOpen(true); // Open the bottom terminal drawer automatically

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          socketId: socketRef.current?.id,
          language: lang,
          source_code,
          stdin
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to execute code.");
      }

      setExecResult(data);
    } catch (err) {
      console.error("Code execution failed:", err);
      setExecError(err.message || "Something went wrong.");
    } finally {
      setExecuting(false);
    }
  };

  const downloadCode = () => {
    const code = codeRef.current || "";
    
    // Client-side mapping of selected language dropdown options to file extensions
    const languageExtensionMap = {
      'javascript': 'js',
      'python': 'py',
      'cpp': 'cpp',
      'java': 'java',
      'css': 'css',
      'dart': 'dart',
      'django': 'py',
      'dockerfile': 'dockerfile',
      'go': 'go',
      'htmlmixed': 'html',
      'jsx': 'jsx',
      'markdown': 'md',
      'php': 'php',
      'r': 'r',
      'rust': 'rs',
      'ruby': 'rb',
      'sass': 'sass',
      'shell': 'sh',
      'sql': 'sql',
      'swift': 'swift',
      'xml': 'xml',
      'yaml': 'yaml'
    };

    const extension = languageExtensionMap[lang] || 'txt';
    const filename = roomId ? `${roomId}.${extension}` : `code.${extension}`;

    // Create Blob preserving UTF-8 encoding
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup temporary resources to avoid memory leaks
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  async function copyRoomId() {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success("Room ID has been copied to clipboard");
    } catch (err) {
      toast.error("Could not copy the Room ID");
      console.error(err);
    }
  }

  function leaveRoom() {
    reactNavigator("/");
  }

  if (!location.state) {
    return <Navigate to="/" />;
  }

  function handleFileUpload(event) {
    console.log("hello");
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const fileContent = e.target.result;
        setFileContent(fileContent);
        setFilePreview(true);
      };
      reader.readAsText(file);
    }
  }
  const resetFileInput = () => {
    if (fileInputRef.current) {
    fileInputRef.current.value = "";
    }
  };

  const updateEditorCode = (newCode) => {
    editorInstanceRef.current?.setCode(newCode);
    codeRef.current = newCode;
    socketRef.current.emit(ACTIONS.CODE_CHANGE, {
      roomId,
      code: newCode,
    });
  };

  const handleAppendCode = () => {
  const currentCode = codeRef.current || "";

  const appendedCode = currentCode
    ? `${currentCode}\n\n${fileContent}`
    : fileContent;

    updateEditorCode(appendedCode);
    setFilePreview(false);
    resetFileInput();
  };

  const handleReplaceCode = () => {
    updateEditorCode(fileContent);
    setFilePreview(false);
    resetFileInput();
  };



  return (
    <div className="mainWrap">
      <div className="aside">
        <div className="asideInner">
          <div className="logo">
            <img className="logoImage" src="/logo.png" alt="logo" />
          </div>
          {user && (
            <div className="sidebarUser">
              <span>User: <strong>{user.username}</strong></span>
            </div>
          )}
          <h3>Connected</h3>
          <div className="clientsList">
            {clients.map((client) => (
              <Client key={client.socketId} username={client.username} />
            ))}
          </div>
        </div>

        <input type="file" accept=".js,.py,.java,.cpp,.c,.txt,.html,.css" style={{ display: "none" }} id="fileUpload" onChange={handleFileUpload} ref={fileInputRef} />
        <button className="uploadFileBtn" onClick={() => document.getElementById("fileUpload").click()}>
          Upload File
        </button>
        {
          filePreview && <FilePreview 
            setFilePreview={setFilePreview}
            fileContent={fileContent}
            resetFileInput={resetFileInput}
            onAppend={handleAppendCode}
            onReplace={handleReplaceCode}/>
        }

        <label>
          Select Language:
          <select
            value={lang}
            onChange={(e) => {
              const newLang = e.target.value;
              setLang(newLang);
              if (socketRef.current) {
                socketRef.current.emit('language-change', {
                  roomId,
                  language: newLang
                });
              }
            }}
            className="seLang"
          >
            <option value="cpp">C++</option>
            <option value="java">Java</option>
            <option value="css">CSS</option>
            <option value="dart">Dart</option>
            <option value="django">Django</option>
            <option value="dockerfile">Dockerfile</option>
            <option value="go">Go</option>
            <option value="htmlmixed">HTML-mixed</option>
            <option value="javascript">JavaScript</option>
            <option value="jsx">JSX</option>
            <option value="markdown">Markdown</option>
            <option value="php">PHP</option>
            <option value="python">Python</option>
            <option value="r">R</option>
            <option value="rust">Rust</option>
            <option value="ruby">Ruby</option>
            <option value="sass">Sass</option>
            <option value="shell">Shell</option>
            <option value="sql">SQL</option>
            <option value="swift">Swift</option>
            <option value="xml">XML</option>
            <option value="yaml">yaml</option>
          </select>
        </label>

        <label>
          Select Theme:
          <select
            value={them}
            onChange={(e) => {
              //   setCode(codeRef.current);
              setThem(e.target.value);
              //   window.location.reload();
            }}
            className="seLang"
          >
            <option value="default">default</option>
            <option value="3024-day">3024-day</option>
            <option value="3024-night">3024-night</option>
            <option value="abbott">abbott</option>
            <option value="abcdef">abcdef</option>
            <option value="ambiance">ambiance</option>
            <option value="ayu-dark">ayu-dark</option>
            <option value="ayu-mirage">ayu-mirage</option>
            <option value="base16-dark">base16-dark</option>
            <option value="base16-light">base16-light</option>
            <option value="bespin">bespin</option>
            <option value="blackboard">blackboard</option>
            <option value="cobalt">cobalt</option>
            <option value="colorforth">colorforth</option>
            <option value="darcula">darcula</option>
            <option value="duotone-dark">duotone-dark</option>
            <option value="duotone-light">duotone-light</option>
            <option value="eclipse">eclipse</option>
            <option value="elegant">elegant</option>
            <option value="erlang-dark">erlang-dark</option>
            <option value="gruvbox-dark">gruvbox-dark</option>
            <option value="hopscotch">hopscotch</option>
            <option value="icecoder">icecoder</option>
            <option value="idea">idea</option>
            <option value="isotope">isotope</option>
            <option value="juejin">juejin</option>
            <option value="lesser-dark">lesser-dark</option>
            <option value="liquibyte">liquibyte</option>
            <option value="lucario">lucario</option>
            <option value="material">material</option>
            <option value="material-darker">material-darker</option>
            <option value="material-palenight">material-palenight</option>
            <option value="material-ocean">material-ocean</option>
            <option value="mbo">mbo</option>
            <option value="mdn-like">mdn-like</option>
            <option value="midnight">midnight</option>
            <option value="monokai">monokai</option>
            <option value="moxer">moxer</option>
            <option value="neat">neat</option>
            <option value="neo">neo</option>
            <option value="night">night</option>
            <option value="nord">nord</option>
            <option value="oceanic-next">oceanic-next</option>
            <option value="panda-syntax">panda-syntax</option>
            <option value="paraiso-dark">paraiso-dark</option>
            <option value="paraiso-light">paraiso-light</option>
            <option value="pastel-on-dark">pastel-on-dark</option>
            <option value="railscasts">railscasts</option>
            <option value="rubyblue">rubyblue</option>
            <option value="seti">seti</option>
            <option value="shadowfox">shadowfox</option>
            <option value="solarized">solarized</option>
            <option value="the-matrix">the-matrix</option>
            <option value="tomorrow-night-bright">tomorrow-night-bright</option>
            <option value="tomorrow-night-eighties">
              tomorrow-night-eighties
            </option>
            <option value="ttcn">ttcn</option>
            <option value="twilight">twilight</option>
            <option value="vibrant-ink">vibrant-ink</option>
            <option value="xq-dark">xq-dark</option>
            <option value="xq-light">xq-light</option>
            <option value="yeti">yeti</option>
            <option value="yonce">yonce</option>
            <option value="zenburn">zenburn</option>
          </select>
        </label>

        <button className="btn copyBtn" onClick={copyRoomId}>
          Copy ROOM ID
        </button>
        <button className="btn leaveBtn" onClick={leaveRoom}>
          Leave
        </button>
      </div>

      <div className="editorWrap">
        <Editor
          ref={editorInstanceRef}
          socketRef={socketRef}
          roomId={roomId}
          onCodeChange={(code) => {
            console.log("on code change" + code);
            codeRef.current = code;
          }}
        />
        {!isChatOpen && (
          <button className="chatToggleBtn" onClick={toggleChat} title="Open Chat">
            <svg viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
            </svg>
            {unreadCount > 0 && <span className="unreadBadge">{unreadCount}</span>}
          </button>
        )}
        {!isAIOpen && (
          <button className="aiToggleBtn" onClick={toggleAI} title="Open AI Assistant">
            <svg viewBox="0 0 24 24">
              <path d="M19 9 20.25 11.75 23 13 20.25 14.25 19 17 17.75 14.25 15 13 17.75 11.75zM11.5 9.5 9 4 6.5 9.5 1 12 6.5 14.5 9 20 11.5 14.5 17 12zM19 3l1.25 2.75L23 7l-2.75 1.25L19 11l-1.25-2.75L15 7l2.75-1.25z"/>
            </svg>
          </button>
        )}
        <button className="downloadCodeBtn" onClick={downloadCode} title="Download Code">
          <svg style={{ width: '16px', height: '16px', fill: 'currentColor' }} viewBox="0 0 24 24">
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
          </svg>
          Download
        </button>

        <button className="runCodeBtn" onClick={runCode} disabled={executing} title="Run Code">
          <svg style={{ width: '16px', height: '16px', fill: 'currentColor' }} viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
          {executing ? 'Running...' : 'Run Code'}
        </button>

        {outputOpen && (
          <div className="outputPanel">
            <div className="outputHeader">
              <h4>
                <svg style={{ width: '16px', height: '16px', fill: 'currentColor', marginRight: '6px', verticalAlign: 'middle' }} viewBox="0 0 24 24">
                  <path d="M20 12H4V4h16v8zm0-10H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM4 18h16v2H4v-2z"/>
                </svg>
                Console Output
              </h4>
              <div className="outputMeta">
                {execResult && (
                  <span className={`statusBadge ${execResult.statusCode === 200 ? 'accepted' : 'error'}`}>
                    {execResult.statusCode === 200 ? 'SUCCESS' : `STATUS ${execResult.statusCode}`}
                  </span>
                )}
                {execResult?.cpuTime !== undefined && execResult?.cpuTime !== null && (
                  <span className="statItem">CPU Time: {execResult.cpuTime}s</span>
                )}
                {execResult?.memory !== undefined && execResult?.memory !== null && (
                  <span className="statItem">Memory: {execResult.memory}KB</span>
                )}
                <button className="closeOutputBtn" onClick={() => setOutputOpen(false)} title="Close Panel">
                  &times;
                </button>
              </div>
            </div>
            <div className="outputContent">
              <div className="stdinSection">
                <div className="stdinHeader">Input (stdin)</div>
                <textarea
                  className="stdinTextarea"
                  placeholder="Provide program input here..."
                  value={stdin}
                  onChange={(e) => setStdin(e.target.value)}
                  disabled={executing}
                />
              </div>
              <div className="consoleSection">
                <div className="consoleHeader">Console Log</div>
                <div className="consoleBody">
                  {executing && (
                    <div className="consoleLoader">
                      <div className="consoleSpinner"></div>
                      <span>Compiling and running code...</span>
                    </div>
                  )}

                  {execError && (
                    <div className="consoleErrorBanner">
                      <strong>Error:</strong> {execError}
                    </div>
                  )}

                  {!executing && !execError && !execResult && (
                    <div className="consoleText empty">No output yet. Click "Run Code" to compile and execute your code.</div>
                  )}

                  {execResult && (
                    <>
                      {execResult.output ? (
                        <pre className="consoleText stdout">
                          {execResult.output}
                        </pre>
                      ) : (
                        <div className="consoleText empty">Program execution completed with no output.</div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <Chat
        socketRef={socketRef}
        roomId={roomId}
        username={location.state?.username}
        messages={messages}
        isOpen={isChatOpen}
        toggleChat={toggleChat}
      />
      <AIAssistant
        socketId={socketRef.current?.id}
        getCurrentCode={getCurrentCode}
        onInsertCode={handleInsertCode}
        isOpen={isAIOpen}
        toggleAI={toggleAI}
      />
    </div>
  );
};

export default EditorPage;
