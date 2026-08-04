import React, { useState, useEffect, useContext } from 'react';
import { v4 as uuidV4 } from 'uuid';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Home = () => {
    const navigate = useNavigate();
    const { user, token, logout } = useContext(AuthContext);

    const [roomId, setRoomId] = useState('');
    const [username, setUsername] = useState('');
    const [myRooms, setMyRooms] = useState([]);

    // Populate username if user is logged in
    useEffect(() => {
        if (user) {
            setUsername(user.username);
        }
    }, [user]);

    // Fetch user-created rooms
    useEffect(() => {
        if (token) {
            const fetchMyRooms = async () => {
                try {
                    const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/rooms/mine`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    if (response.ok) {
                        const data = await response.json();
                        setMyRooms(data);
                    }
                } catch (err) {
                    console.error('Failed to fetch rooms:', err);
                }
            };
            fetchMyRooms();
        }
    }, [token]);

    const createNewRoom = (e) => {
        e.preventDefault();
        const id = uuidV4();
        setRoomId(id);
        toast.success('Created a new room');
    };

    const joinRoom = () => {
        if (!roomId || !username) {
            toast.error('ROOM ID & username is required');
            return;
        }

        // Redirect
        navigate(`/editor/${roomId}`, {
            state: {
                username,
            },
        });
    };

    const handleRejoinRoom = (savedRoomId) => {
        if (!username && user) {
            // Fallback in case state isn't synchronous yet
            navigate(`/editor/${savedRoomId}`, {
                state: {
                    username: user.username,
                },
            });
            return;
        }
        navigate(`/editor/${savedRoomId}`, {
            state: {
                username: username || (user ? user.username : 'Guest'),
            },
        });
    };

    const handleInputEnter = (e) => {
        if (e.code === 'Enter') {
            joinRoom();
        }
    };

    return (
        <div className="homePageWrapper">
            {user ? (
                <div className="authHeader">
                    <span>Logged in as: <strong>{user.username}</strong></span>
                    <button className="authLinkBtn" onClick={logout}>Logout</button>
                </div>
            ) : (
                <div className="authHeader">
                    <Link to="/login" className="authLinkBtn">Login</Link>
                    <span className="authDivider">|</span>
                    <Link to="/signup" className="authLinkBtn">Sign Up</Link>
                </div>
            )}

            <div className="formWrapper">
                <img
                    className="homePageLogo"
                    src="/logo.png"
                    alt="code-sync-logo"
                />
                <h4 className="mainLabel">Generate new room or paste invitation ROOM ID</h4>
                <div className="inputGroup">
                    <input
                        type="text"
                        className="inputBox"
                        placeholder="ROOM ID"
                        onChange={(e) => setRoomId(e.target.value)}
                        value={roomId}
                        onKeyUp={handleInputEnter}
                    />
                    <input
                        type="text"
                        className="inputBox"
                        placeholder="USERNAME"
                        onChange={(e) => setUsername(e.target.value)}
                        value={username}
                        onKeyUp={handleInputEnter}
                    />
                    <button className="btn joinBtn" onClick={joinRoom}>
                        Join
                    </button>
                    <span className="createInfo">
                        If you don't have an invite then create &nbsp;
                        <Link
                            onClick={createNewRoom}
                            to=""
                            className="createNewBtn"
                        >
                            new room
                        </Link>
                    </span>
                </div>
            </div>

            {user && myRooms.length > 0 && (
                <div className="myRoomsWrapper">
                    <h3 className="myRoomsTitle">My Persisted Rooms</h3>
                    <div className="myRoomsList">
                        {myRooms.map((r) => (
                            <div key={r.roomId} className="myRoomItem" onClick={() => handleRejoinRoom(r.roomId)}>
                                <div className="myRoomInfo">
                                    <span className="myRoomId">ID: {r.roomId.substring(0, 8)}...</span>
                                    <span className="myRoomLang">Language: {r.language}</span>
                                </div>
                                <span className="myRoomDate">
                                    Saved: {new Date(r.updatedAt).toLocaleDateString()}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <footer>
                <h4>
                    Build by &nbsp;
                    <a href="https://github.com/b3havna" target="_blank" rel="noopener noreferrer">Bhavana</a>
                </h4>
            </footer>
        </div>
    );
};

export default Home;