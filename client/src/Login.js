import React, { useState } from "react";

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // validation
    if (!username || !password) {
      setError("enter username & password");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      await onLogin(username, password);
    } catch (err) {
      setError("Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={loginContainerStyle}>
      <div style={loginBoxStyle}>
        <h2 style={loginHeaderStyle}></h2>
        
        {error && <div style={errorStyle}>{error}</div>}
        
        <form onSubmit={handleSubmit} style={formStyle}>
          <div style={formGroupStyle}>
            <label htmlFor="username" style={labelStyle}>Username</label>
            <input
              id="username"
              type="text"
              placeholder="Enter Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={inputStyle}
              disabled={isLoading}
            />
          </div>
          
          <div style={formGroupStyle}>
            <label htmlFor="password" style={labelStyle}>Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              disabled={isLoading}
            />
          </div>
          
          <button 
            type="submit" 
            style={buttonStyle} 
            disabled={isLoading}
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>
        
        <div style={infoStyle}>
          <p>Available users: grade_creator, grade_approver</p>
        </div>
      </div>
    </div>
  );
};

const loginContainerStyle = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "80vh"
};

const loginBoxStyle = {
  width: "400px",
  padding: "2rem",
  backgroundColor: "#f9f9f9",
  borderRadius: "8px",
  boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
};

const loginHeaderStyle = {
  textAlign: "center",
  marginBottom: "1.5rem",
  color: "#333"
};

const formStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "1rem"
};

const formGroupStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem"
};

const labelStyle = {
  fontWeight: "bold",
  fontSize: "14px"
};

const inputStyle = {
  padding: "10px",
  borderRadius: "4px",
  border: "1px solid #ddd",
  fontSize: "16px"
};

const buttonStyle = {
  backgroundColor: "#4CAF50",
  color: "white",
  border: "none",
  padding: "12px",
  borderRadius: "4px",
  fontSize: "16px",
  cursor: "pointer",
  marginTop: "1rem"
};

const errorStyle = {
  backgroundColor: "#ffebee",
  color: "#c62828",
  padding: "10px",
  borderRadius: "4px",
  marginBottom: "1rem",
  textAlign: "center"
};

const infoStyle = {
  marginTop: "1.5rem",
  padding: "1rem",
  backgroundColor: "#e3f2fd",
  borderRadius: "4px",
  fontSize: "14px"
};

export default Login;