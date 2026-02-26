import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "./Admin.css";

import logo from '../Images/Logo Olfu.png';
import bgImage from '../Images/bgImage.jpg';

export default function Admin({ setUser }) {
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState(""); // Changed from email to username
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleAdminLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("http://127.0.0.1:8000/api/accounts/admin-login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username, // Matches the 'username' key in Django view
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Success: 'data.user' comes from your Django JsonResponse
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
        setError("");
        
        // Redirect based on role
        if (data.user.role === "SUPERADMIN" || data.user.role === "ADMIN") {
          navigate("/homepage");
        } else {
          setError("Access denied: Not an administrator.");
        }
      } else {
        // Error: Displays "Invalid username or password" or "Access denied"
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError("Cannot connect to server. Check if Django is running.");
    }
  };

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <div className="home-container">
      {/* HEADER */}
      <header className="header">
        <img className="logo" src={logo} alt="Logo" />
      </header>

      {/* BACKGROUND */}
      <div className="home-background">
        <img src={bgImage} alt="background" className="bg-img" />
        <div className="gradient-overlay"></div>
      </div>

      {/* CONTENT */}
      <div className="home-content">
        {!showLogin ? (
          <>
            <h1>ADMIN PORTAL</h1>
            <h2>COLLEGE OF COMPUTER STUDIES</h2>
            <p>ONLINE PUBLIC ACCESS CATALOG</p>

            <button
              className="login-btn"
              onClick={() => setShowLogin(true)}
            >
              ADMIN LOGIN
            </button>
          </>
        ) : (
          <div className="login-admin-overlay">
            <div className="login-admin">
              <button className="close-btn" onClick={() => setShowLogin(false)}>
                ×
              </button>

              <h2>Admin Login</h2>

              <form onSubmit={handleAdminLogin}>
                <div className="input-admin">
                  <input
                    type="text" 
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>

                <div className="input-admin password-admin">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <span
                    className="eye-icon"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </span>
                </div>

                {error && <h5 className="error-text-admin">{error}</h5>}

                <button type="submit" className="login-btn">
                  Login
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}