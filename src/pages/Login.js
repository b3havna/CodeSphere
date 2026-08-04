import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const [usernameOrEmail, setUsernameOrEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();

        if (!usernameOrEmail.trim() || !password) {
            toast.error('All fields are required');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ usernameOrEmail, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Invalid credentials');
            }

            login(data.token, data.user);
            toast.success('Logged in successfully!');
            navigate('/');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="homePageWrapper">
            <div className="formWrapper">
                <img
                    className="homePageLogo"
                    src="/logo.png"
                    alt="code-sync-logo"
                />
                <h4 className="mainLabel">Login to CodeSphere</h4>
                <form onSubmit={handleLogin} className="inputGroup">
                    <input
                        type="text"
                        className="inputBox"
                        placeholder="USERNAME OR EMAIL"
                        value={usernameOrEmail}
                        onChange={(e) => setUsernameOrEmail(e.target.value)}
                        disabled={loading}
                    />
                    <input
                        type="password"
                        className="inputBox"
                        placeholder="PASSWORD"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                    />
                    <button type="submit" className="btn joinBtn" disabled={loading}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                    <span className="createInfo">
                        Don't have an account? &nbsp;
                        <Link to="/signup" className="createNewBtn">
                            Sign Up
                        </Link>
                    </span>
                    <span className="createInfo" style={{ marginTop: '8px' }}>
                        Or continue as &nbsp;
                        <Link to="/" className="createNewBtn">
                            Guest User
                        </Link>
                    </span>
                </form>
            </div>
        </div>
    );
};

export default Login;
