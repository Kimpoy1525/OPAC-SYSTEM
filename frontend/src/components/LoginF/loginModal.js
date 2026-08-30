import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import LoadingOverlay from "../LoadingOverlay/loadingOverlay";
import "./loginModal.css";

export default function LoginModal({ close, setUser }) {
  const navigate = useNavigate();
  const dialogRef = useRef(null);
  const [error, setError] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  const handleGoogleLogin = useCallback(async (response) => {
    setSigningIn(true);
    setError("");
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/google/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: response.credential }),
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed. Please try again.");
        return;
      }

      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      close();
      navigate("/homepage", { replace: true });
    } catch (err) {
      setError("Cannot connect to the server. Please try again later.");
    } finally {
      setSigningIn(false);
    }
  }, [close, navigate, setUser]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", handleKeyDown);
    dialogRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [close]);

  useEffect(() => {
    if (!window.google) {
      setError("Google sign-in is unavailable. Please refresh the page.");
      return;
    }

    window.google.accounts.id.initialize({
      client_id: "937933959495-68b9nk1vdsvitocjj4hpco107esdovlq.apps.googleusercontent.com",
      callback: handleGoogleLogin,
    });
    window.google.accounts.id.renderButton(
      document.getElementById("googleLoginBtn"),
      { theme: "outline", size: "large", width: 260 }
    );
  }, [handleGoogleLogin]);

  const closeOnBackdrop = (event) => {
    if (event.target === event.currentTarget) close();
  };

  return (
    <div className="login-modal-overlay" onMouseDown={closeOnBackdrop}>
      <section
        className="login-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
        ref={dialogRef}
        tabIndex="-1"
      >
        <button type="button" className="login-modal-close" onClick={close} aria-label="Close login dialog">
          &times;
        </button>
        <h2 id="login-modal-title">Student Login</h2>
        <div id="googleLoginBtn" className="google-login-button" />
        <p className="login-modal-hint">
          Use your <strong>@student.fatima.edu.ph</strong> Google account.
        </p>
        {error && <p className="login-modal-error" role="alert">{error}</p>}
      </section>
      {signingIn && <LoadingOverlay message="Signing in..." />}
    </div>
  );
}
