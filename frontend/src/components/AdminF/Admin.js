import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "./Admin.css";

import logo from "../Images/Logo Olfu.png";
import bgImage from "../Images/bgImage.jpg";

export default function Admin({ setUser }) {
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleAdminLogin = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/accounts/admin-login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed");
        return;
      }

      if (data.user.role !== "SUPERADMIN" && data.user.role !== "ADMIN") {
        setError("Access denied: Not an administrator.");
        return;
      }

      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
      setError("");
      navigate("/admin-approval", { replace: true });
    } catch (err) {
      setError("Cannot connect to the server. Please try again later.");
    }
  };

  useEffect(() => {
    if (!error) return undefined;
    const timer = setTimeout(() => setError(""), 3000);
    return () => clearTimeout(timer);
  }, [error]);

  return (
    <main className="admin-login-page">
      <header className="admin-login-header">
        <img className="admin-login-logo" src={logo} alt="Our Lady of Fatima University" />
      </header>

      <img src={bgImage} alt="Our Lady of Fatima University campus" className="admin-login-background" />
      <div className="admin-login-shade" aria-hidden="true" />

      <section className="admin-login-content" aria-labelledby="admin-page-title">
        {!showLogin ? (
          <>
            <h1 id="admin-page-title">Admin Portal</h1>
            <h2>College of Computer Studies</h2>
            <p>Online Public Access Catalog</p>
            <button type="button" className="admin-open-login" onClick={() => setShowLogin(true)}>
              Admin login
            </button>
          </>
        ) : (
          <div className="admin-dialog-overlay">
            <section className="admin-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-dialog-title">
              <button type="button" className="admin-dialog-close" onClick={() => setShowLogin(false)} aria-label="Close admin login dialog">
                &times;
              </button>
              <h2 id="admin-dialog-title">Admin login</h2>
              <p className="admin-dialog-intro">Enter your authorized staff credentials.</p>

              <form onSubmit={handleAdminLogin}>
                <label className="admin-field">
                  <span>Username</span>
                  <input type="text" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required />
                </label>

                <label className="admin-field">
                  <span>Password</span>
                  <div className="admin-password-field">
                    <input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
                    <button type="button" className="admin-password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </label>

                {error && <p className="admin-login-error" role="alert">{error}</p>}
                <button type="submit" className="admin-submit-login">Log in</button>
              </form>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
