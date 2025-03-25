import React, { useState, useEffect } from "react";
import PdfList from "./components/PdfList";
import Login from "./Login";
import axios from "axios";

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Function to validate stored token on startup
    const validateToken = async (token) => {
        try {
            // documents endpoint to validate the token
            await axios.get("http://10.5.33.201:5000/documents", {
                headers: { Authorization: `Bearer ${token}` }
            });
            return true;
        } catch (error) {
            console.error("Token validation failed:", error);
            return false;
        }
    };

    // Load session on app start
    useEffect(() => {
        const initializeAuth = async () => {
            const storedToken = localStorage.getItem("token");
            const storedUser = localStorage.getItem("user");
            
            if (storedToken && storedUser) {
                const isValid = await validateToken(storedToken);
                if (isValid) {
                    setUser(storedUser);
                } else {
                    handleLogout();
                }
            }
            
            setLoading(false);
        };
        
        initializeAuth();
    }, []);

    const handleLogin = async (username, password) => {
        try {
            const response = await axios.post("http://10.5.33.201:5000/login", { username, password });
    
            localStorage.setItem("token", response.data.token);
            localStorage.setItem("user", response.data.username);
            setUser(response.data.username);
        } catch (error) {
            alert("Invalid credentials!");
        }
    };
    
    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="App" style={{ fontFamily: 'Arial, sans-serif' }}>
            <header style={headerStyle}>
                <h1></h1>
                {user && (
                    <div style={userInfoStyle}>
                        <span>Logged in as: <strong>{user}</strong></span>
                        <button onClick={handleLogout} style={logoutButtonStyle}>Logout</button>
                    </div>
                )}
            </header>
            
            <main style={{ padding: '20px' }}>
                {!user ? (
                    <Login onLogin={handleLogin} />
                ) : (
                    <PdfList user={user} onLogout={handleLogout} />
                )}
            </main>
        </div>
    );
}

const headerStyle = {
    backgroundColor: '#333',
    color: 'white',
    padding: '1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
};

const userInfoStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
};

const logoutButtonStyle = {
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '4px',
    cursor: 'pointer'
};

export default App;