import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import LoadingOverlay from "../LoadingOverlay/loadingOverlay";
import "./Admin.css";

import logo from "../Images/Logo Olfu.png";
import bgImage from "../Images/bgImage.jpg";

// Content-manager portal login with two-factor authentication.
// Steps:
//   "credentials" - email + password (step 1 of login)
//   "setup"       - first-time enrollment: scan the QR, enter the first code
//   "backup"      - save the one-time backup codes (shown exactly once)
//   "verify"      - step 2 of login: enter the 6-digit authenticator code
export default function Admin({ setUser }) {
  const [showLogin, setShowLogin] = useState(false);
  const [step, setStep] = useState("credentials");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loadingMsg, setLoadingMsg] = useState("");
  const [tmpToken, setTmpToken] = useState("");
  const [qrSvg, setQrSvg] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [deviceName, setDeviceName] = useState("My phone");
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState([]);
  const [pendingUser, setPendingUser] = useState(null);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const post = async (path, body) => {
    const res = await fetch(`${process.env.REACT_APP_API_URL}/api/accounts/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    let data = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }
    return { ok: res.ok, data };
  };

  const finishLogin = (userData) => {
    const safeUser = { ...userData, via: "password" };
    localStorage.setItem("user", JSON.stringify(safeUser));
    setUser(safeUser);
    setError("");
    navigate("/homepage", { replace: true });
  };

  const copyText = (text) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const loadSetup = async (token) => {
    setLoadingMsg("Preparing authenticator setup...");
    try {
      const { ok, data } = await post("2fa/setup/", { tmp_token: token });
      if (!ok) {
        setError(data.error || "Could not start setup. Please log in again.");
        setStep("credentials");
        return;
      }
      setQrSvg(data.qr_svg);
      setSecretKey(data.secret);
      setDeviceName(data.default_name || "My phone");
      setCode("");
      setStep("setup");
    } catch {
      setError("Cannot connect to the server. Please try again later.");
      setStep("credentials");
    } finally {
      setLoadingMsg("");
    }
  };

  const handleAdminLogin = async (event) => {
    event.preventDefault();
    setError("");
    setLoadingMsg("Verifying credentials...");
    try {
      const { ok, data } = await post("admin-login/", { username, password });
      if (!ok) {
        setError(data.error || "Login failed");
        return;
      }
      if (data.requires_2fa) {
        setTmpToken(data.tmp_token);
        setCode("");
        setStep("verify");
        return;
      }
      if (data.requires_setup) {
        setTmpToken(data.tmp_token);
        await loadSetup(data.tmp_token);
        return;
      }
      if (data.user.role !== "SUPERADMIN" && data.user.role !== "CONTENT_MANAGER") {
        setError("Access denied: Not a content manager.");
        return;
      }
      finishLogin(data.user);
    } catch {
      setError("Cannot connect to the server. Please try again later.");
    } finally {
      setLoadingMsg("");
    }
  };

  const handleSetupConfirm = async (event) => {
    event.preventDefault();
    setError("");
    setLoadingMsg("Confirming authenticator setup...");
    try {
      const { ok, data } = await post("2fa/confirm/", {
        tmp_token: tmpToken,
        code,
        device_name: deviceName,
      });
      if (!ok) {
        setError(data.error || "Invalid code. Please try again.");
        return;
      }
      setBackupCodes(data.backup_codes || []);
      setPendingUser(data.user);
      setStep("backup");
    } catch {
      setError("Cannot connect to the server. Please try again later.");
    } finally {
      setLoadingMsg("");
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    setError("");
    setLoadingMsg("Verifying code...");
    try {
      const { ok, data } = await post("2fa/verify/", { tmp_token: tmpToken, code });
      if (!ok) {
        setError(data.error || "Invalid code. Please try again.");
        return;
      }
      finishLogin(data.user);
    } catch {
      setError("Cannot connect to the server. Please try again later.");
    } finally {
      setLoadingMsg("");
    }
  };

  useEffect(() => {
    if (!error) return undefined;
    const timer = setTimeout(() => setError(""), 5000);
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
            <h1 id="admin-page-title">Content Manager Portal</h1>
            <h2>College of Computer Studies</h2>
            <p>CCSTECHVAULT</p>
            <button type="button" className="admin-open-login" onClick={() => setShowLogin(true)}>
              Content Manager login
            </button>
          </>
        ) : (
          <div className="admin-dialog-overlay">
            <section className="admin-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-dialog-title">
              <button type="button" className="admin-dialog-close" onClick={() => setShowLogin(false)} aria-label="Close admin login dialog">
                &times;
              </button>

              {step === "credentials" && (
                <>
                  <h2 id="admin-dialog-title">Content Manager Login</h2>
                  <form onSubmit={handleAdminLogin}>
                    <label className="admin-field">
                      <span className="admin-field-label">Email Address</span>
                      <input type="text" placeholder="Email Address" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required />
                    </label>

                    <label className="admin-field">
                      <span className="admin-field-label">Password</span>
                      <div className="admin-password-field">
                        <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
                        <button type="button" className="admin-password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>
                          {showPassword ? <FaEye /> : <FaEyeSlash />}
                        </button>
                      </div>
                    </label>

                    {error && <p className="admin-login-error" role="alert">{error}</p>}
                    <button type="submit" className="admin-submit-login" disabled={Boolean(loadingMsg)}>Login</button>
                  </form>
                </>
              )}

              {step === "setup" && (
                <>
                  <h2>Set Up Two-Factor Authentication</h2>
                  <p className="admin-2fa-hint">
                    Scan the QR code below with Google Authenticator (or any authenticator app),
                    then enter the 6-digit code it shows to finish.
                  </p>
                  <div className="admin-qr" dangerouslySetInnerHTML={{ __html: qrSvg }} />
                  <div className="admin-secret-row">
                    <code className="admin-secret-key">{secretKey}</code>
                    <button type="button" className="admin-copy-btn" onClick={() => copyText(secretKey)}>
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <form onSubmit={handleSetupConfirm}>
                    <label className="admin-field">
                      <span className="admin-field-label">Device name</span>
                      <input type="text" placeholder="Device name (e.g. My phone)" value={deviceName} maxLength={50} onChange={(event) => setDeviceName(event.target.value)} />
                    </label>
                    <label className="admin-field">
                      <span className="admin-field-label">6-digit code</span>
                      <input className="admin-2fa-code-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" value={code} onChange={(event) => setCode(event.target.value.replace(/[^0-9]/g, ""))} required />
                    </label>
                    {error && <p className="admin-login-error" role="alert">{error}</p>}
                    <button type="submit" className="admin-submit-login" disabled={Boolean(loadingMsg)}>Verify &amp; Enable</button>
                  </form>
                </>
              )}

              {step === "backup" && (
                <>
                  <h2>Save Your Backup Codes</h2>
                  <p className="admin-2fa-hint">
                    Store these somewhere safe (printed or in a password manager). Each code works
                    ONCE if you ever lose access to your authenticator app.
                  </p>
                  <div className="admin-backup-codes">
                    {backupCodes.map((backupCode) => (
                      <code key={backupCode}>{backupCode}</code>
                    ))}
                  </div>
                  <button type="button" className="admin-copy-btn admin-codes-copy" onClick={() => copyText(backupCodes.join("\n"))}>
                    {copied ? "Copied!" : "Copy all codes"}
                  </button>
                  <button type="button" className="admin-submit-login" onClick={() => finishLogin(pendingUser)}>
                    I saved my codes - Continue
                  </button>
                </>
              )}

              {step === "verify" && (
                <>
                  <h2>Two-Factor Verification</h2>
                  <p className="admin-2fa-hint">
                    Open your authenticator app and enter the 6-digit code for CCSTECHVAULT.
                  </p>
                  <form onSubmit={handleVerify}>
                    <label className="admin-field">
                      <span className="admin-field-label">6-digit code</span>
                      <input className="admin-2fa-code-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" value={code} onChange={(event) => setCode(event.target.value.replace(/[^0-9]/g, ""))} required autoFocus />
                    </label>
                    {error && <p className="admin-login-error" role="alert">{error}</p>}
                    <button type="submit" className="admin-submit-login" disabled={Boolean(loadingMsg)}>Verify</button>
                    <button type="button" className="admin-2fa-back" onClick={() => { setStep("credentials"); setError(""); }}>
                      Back to login
                    </button>
                  </form>
                </>
              )}
            </section>
          </div>
        )}
      </section>
      {loadingMsg && <LoadingOverlay message={loadingMsg} />}
    </main>
  );
}
