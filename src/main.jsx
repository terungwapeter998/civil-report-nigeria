import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { auth, db } from './firebase-config'; // Ensure this file exists in src/
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
//import './index.css';

const App = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [status, setStatus] = useState({ text: '', color: 'var(--text-slate)' });
    const [isLocked, setIsLocked] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setStatus({ text: "ESTABLISHING SECURE TUNNEL...", color: "var(--text-slate)" });
        setIsLocked(true);

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            setStatus({ text: "VERIFYING CLEARANCE LEVEL...", color: "var(--text-slate)" });

            const userDoc = await getDoc(doc(db, "users", user.uid));

            if (userDoc.exists() && userDoc.data().role === 'ADMIN') {
                setStatus({ text: "ACCESS GRANTED. INITIALIZING...", color: "var(--accent-green)" });
                setTimeout(() => window.location.replace("menu.html"), 1000);
            } else {
                throw new Error("UNAUTHORIZED_ACCESS_LEVEL");
            }
        } catch (error) {
            await signOut(auth);
            setIsLocked(false);
            setStatus({
                text: error.message === "UNAUTHORIZED_ACCESS_LEVEL"
                    ? "ERROR: INSUFFICIENT PRIVILEGES"
                    : "ERROR: INVALID CREDENTIALS",
                color: "var(--error-red)"
            });
        }
    };

    return (
        <>
            <div className="bg-overlay"></div>
            <img src="/assets/image/hero-bg.jpg" alt="Background" className="hero-bg" />

            <div className="main-wrapper">
                <div className="brand-header">
                    <h1>CIVIC<span>SYSTEM</span></h1>
                    <p>Citizens' Assembly</p>
                </div>

                <div className={`login-card ${isLocked ? 'locked' : ''}`}>
                    <h2>Authorized Access Only</h2>
                    <form onSubmit={handleLogin}>
                        <div className="input-group">
                            <label>Personnel Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required placeholder="name@civicsystem.ng"
                            />
                        </div>
                        <div className="input-group">
                            <label>Security Credential</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required placeholder="••••••••"
                            />
                        </div>
                        <button type="submit" className="btn-primary" disabled={isLocked}>
                            {isLocked ? "PROCESSING..." : "INITIALIZE SESSION"}
                        </button>
                    </form>
                    <div className="status-msg" style={{ color: status.color }}>{status.text}</div>
                </div>

                <div className="footer-note">
                    Protocol v6.0.4 | <span style={{ color: 'white' }}>System Health: Optimal</span>
                </div>
            </div>
        </>
    );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);