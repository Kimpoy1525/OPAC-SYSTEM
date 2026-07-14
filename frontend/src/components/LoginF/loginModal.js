import React, { useCallback, useEffect, useRef, useState } from "react";
import { FiLock, FiShield, FiX } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import "./loginModal.css";

export default function LoginModal({ close, setUser }) {
  const navigate = useNavigate();
  const dialogRef = useRef(null);
  const [error, setError] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);

  const handleGoogleLogin = useCallback(async (response) => {
    if (!response?.credential) {
      setError("Google did not return a valid sign-in credential.");
      return;
    }

    setIsSigningIn(true);
    setError("");
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/google/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: response.credential }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Sign-in could not be completed.");
        return;
      }

      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      close();
      navigate("/homepage", { replace: true });
    } catch {
      setError("The secure login service is unavailable. Please try again.");
    } finally {
      setIsSigningIn(false);
    }
  }, [close, navigate, setUser]);

  useEffect(() => {
    const onKeyDown = (event) => event.key === "Escape" && close();
    document.addEventListener("keydown", onKeyDown);
    dialogRef.current?.focus();

    let attempts = 0;
    const initializeGoogle = () => {
      attempts += 1;
      if (!window.google?.accounts?.id) {
        if (attempts >= 20) {
          setError("Google Sign-In could not load. Check your connection and try again.");
          return true;
        }
        return false;
      }

      window.google.accounts.id.initialize({
        client_id: "937933959495-68b9nk1vdsvitocjj4hpco107esdovlq.apps.googleusercontent.com",
        callback: handleGoogleLogin,
        cancel_on_tap_outside: true,
      });
      const container = document.getElementById("googleLoginBtn");
      if (container) {
        container.replaceChildren();
        window.google.accounts.id.renderButton(container, {
          theme: "outline",
          size: "large",
          shape: "rectangular",
          text: "continue_with",
          width: Math.min(320, window.innerWidth - 72),
        });
        setGoogleReady(true);
      }
      return true;
    };

    if (!initializeGoogle()) {
      const timer = window.setInterval(() => initializeGoogle() && window.clearInterval(timer), 250);
      return () => {
        window.clearInterval(timer);
        document.removeEventListener("keydown", onKeyDown);
      };
    }
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [close, handleGoogleLogin]);

  return (
    <div className="login-overlay" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <section className="login-dialog" role="dialog" aria-modal="true" aria-labelledby="login-title" ref={dialogRef} tabIndex="-1">
        <button className="login-close" type="button" onClick={close} aria-label="Close login dialog"><FiX /></button>
        <div className="login-security-icon" aria-hidden="true"><FiShield /></div>
        <p className="login-eyebrow">Secure institutional access</p>
        <h2 id="login-title">Sign in to CCSTECHVAULT</h2>
        <p className="login-description">Use your official OLFU Google account to access the research repository.</p>

        <div className="google-button-wrap">
          {!googleReady && !error && <span className="login-loading">Loading secure sign-in…</span>}
          <div id="googleLoginBtn" aria-hidden={isSigningIn}></div>
          {isSigningIn && <div className="login-busy" role="status">Verifying your account…</div>}
        </div>

        {error && <p className="login-error" role="alert">{error}</p>}
        <div className="login-trust-note"><FiLock aria-hidden="true" /><span>Only authorized <strong>@student.fatima.edu.ph</strong> and institutional accounts are accepted.</span></div>
        <p className="login-privacy">Authentication is handled securely by Google. CCSTECHVAULT never receives your Google password.</p>
      </section>
    </div>
  );
}
