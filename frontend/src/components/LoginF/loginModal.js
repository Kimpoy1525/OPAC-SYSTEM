import React, { useState, useEffect } from "react";
import "./loginModal.css";
import { useNavigate } from "react-router-dom";

// Note: Removed the local "users" import if you are moving fully to Django/Google
export default function LoginModal({ close, setUser }) {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const handleGoogleLogin = async (response) => {
    try {
      // Use localhost to match your React origin (prevents CORS issues)
      const res = await fetch("https://ccstechvault-backend.up.railway.app/api/auth/google/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: response.credential }),
        credentials: "include", // Required for Django session cookies to work
      });

      const data = await res.json();

      if (res.ok) {
        // 1. Save the full user object to localStorage
        localStorage.setItem("user", JSON.stringify(data.user));
        
        // 2. Update the App.js state IMMEDIATELY
        setUser(data.user);
        
        setError("");
        close();
        
        // 3. Small delay ensures state is recognized before the route guard checks it
        setTimeout(() => {
          navigate("/homepage");
        }, 100);
      } else {
        setError(data.error || "Login failed");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Cannot connect to server.");
    }
  };

  // Keep manual login if you need it for testing, but update it to use setUser
  const handleLogin = (e) => {
    e.preventDefault();
    // This is still using your hardcoded list. 
    // For your thesis, you'll eventually want this to call a Django API too.
    setError("Please use Google Login for the repository.");
  };

  useEffect(() => {
    if (!window.google) return;

    window.google.accounts.id.initialize({
      client_id: "937933959495-68b9nk1vdsvitocjj4hpco107esdovlq.apps.googleusercontent.com",
      callback: handleGoogleLogin,
    });

    window.google.accounts.id.renderButton(
      document.getElementById("googleLoginBtn"),
      { theme: "outline", size: "large", width: 250 }
    );
  }, []);

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <button className="close-btn" onClick={close}>×</button>
        <h2 className="modal-title">Login</h2>
        <div id="googleLoginBtn" style={{ marginBottom: "16px"}}></div>

        
        <form onSubmit={handleLogin}>
          
          <p className="login-hint">
            Use your <strong>@student.fatima.edu.ph</strong> account
          </p>
          {error && <p className="error-text">{error}</p>}
       
        </form>
      </div>
    </div>
  );
}