import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';

const Signup = () => {
    const { signup } = useContext(AuthContext);
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSignup = async (e) => {
        e.preventDefault();

        if (!username.trim() || !email.trim() || !password) {
            toast.error('All fields are required');
            return;
        }

        if (password.length < 6) {
            toast.error('Password must be at least 6 characters long');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to sign up');
            }

            signup(data.token, data.user);
            toast.success('Account created successfully!');
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
                <h4 className="mainLabel">Create Account</h4>
                <form onSubmit={handleSignup} className="inputGroup">
                    <input
                        type="text"
                        className="inputBox"
                        placeholder="USERNAME"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={loading}
                    />
                    <input
                        type="email"
                        className="inputBox"
                        placeholder="EMAIL"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                    />
                    <input
                        type="password"
                        className="inputBox"
                        placeholder="PASSWORD (MIN 6 CHARS)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                    />
                    <button type="submit" className="btn joinBtn" disabled={loading}>
                        {loading ? 'Creating...' : 'Sign Up'}
                    </button>
                    <span className="createInfo">
                        Already have an account? &nbsp;
                        <Link to="/login" className="createNewBtn">
                            Login
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

export default Signup;
