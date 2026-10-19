import React, { useEffect, useState } from "react";
import { FiX, FiTrash2 } from "react-icons/fi";
import LoadingOverlay from "../LoadingOverlay/loadingOverlay";
import "./security.css";

// Account-security modal for portal accounts (content managers / superadmins):
// change password (password + 2FA code required) and manage the up-to-three
// paired authenticator devices. Styled to match the admin login dialog.
export default function Security({ isOpen, onClose }) {
  const [status, setStatus] = useState(null);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwCode, setPwCode] = useState("");
  const [logoutOthers, setLogoutOthers] = useState(true);

  const [removeTarget, setRemoveTarget] = useState(null);
  const [removeCode, setRemoveCode] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [addPassword, setAddPassword] = useState("");
  const [addCode, setAddCode] = useState("");
  const [addName, setAddName] = useState("New device");
  const [newQr, setNewQr] = useState("");

  const [showDisable, setShowDisable] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");

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

  const loadStatus = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/accounts/2fa/status/`, {
        credentials: "include",
      });
      if (res.ok) {
        setStatus(await res.json());
      }
    } catch {
      // Status stays null - the section shows a loading hint.
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStatus();
      setError("");
      setNotice("");
    }
  }, [isOpen]);

  const flash = (message) => {
    setNotice(message);
    setTimeout(() => setNotice(""), 5000);
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoadingMsg("Changing password...");
    try {
      const { ok, data } = await post("change-password/", {
        current_password: currentPw,
        new_password: newPw,
        confirm_password: confirmPw,
        code: pwCode,
        logout_others: logoutOthers,
      });
      if (!ok) {
        setError(data.error || "Could not change the password.");
        return;
      }
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setPwCode("");
      flash(data.other_sessions_ended ? "Password changed. Other sessions were signed out." : "Password changed successfully.");
    } catch {
      setError("Cannot connect to the server. Please try again later.");
    } finally {
      setLoadingMsg("");
    }
  };

  const handleRemoveDevice = async () => {
    if (!removeTarget) return;
    setError("");
    setNotice("");
    setLoadingMsg("Removing device...");
    try {
      const { ok, data } = await post("2fa/device/remove/", {
        device_id: removeTarget.id,
        code: removeCode,
      });
      if (!ok) {
        setError(data.error || "Invalid code.");
        return;
      }
      setRemoveTarget(null);
      setRemoveCode("");
      await loadStatus();
      flash(data.message || "Device removed.");
    } catch {
      setError("Cannot connect to the server. Please try again later.");
    } finally {
      setLoadingMsg("");
    }
  };

  const handleAddDevice = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoadingMsg("Pairing new device...");
    try {
      const { ok, data } = await post("2fa/device/add/", {
        password: addPassword,
        code: addCode,
        name: addName,
      });
      if (!ok) {
        setError(data.error || "Could not pair the device.");
        return;
      }
      setNewQr(data.qr_svg);
      setAddPassword("");
      setAddCode("");
      await loadStatus();
      flash("Device paired. Scan the QR below with the new device.");
    } catch {
      setError("Cannot connect to the server. Please try again later.");
    } finally {
      setLoadingMsg("");
    }
  };

  const handleDisable = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoadingMsg("Disabling two-factor authentication...");
    try {
      const { ok, data } = await post("2fa/disable/", {
        password: disablePassword,
        code: disableCode,
      });
      if (!ok) {
        setError(data.error || "Could not disable two-factor authentication.");
        return;
      }
      setShowDisable(false);
      setDisablePassword("");
      setDisableCode("");
      await loadStatus();
      flash(data.message || "Two-factor authentication disabled.");
    } catch {
      setError("Cannot connect to the server. Please try again later.");
    } finally {
      setLoadingMsg("");
    }
  };

  if (!isOpen) return null;

  const devices = (status && status.devices) || [];
  const atLimit = devices.length >= 3;

  return (
    <main className="security-overlay" onMouseDown={onClose}>
      <section
        className="security-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="security-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="security-close" onClick={onClose} aria-label="Close security dialog">
          <FiX size={20} />
        </button>
        <h2 id="security-title">Account</h2>

        {error && <p className="security-error" role="alert">{error}</p>}
        {notice && <p className="security-notice" role="status">{notice}</p>}

        <h3>Change Password</h3>
        <form onSubmit={handleChangePassword} className="security-form">
          <label className="security-field">
            <span>Current password</span>
            <input type="password" autoComplete="current-password" value={currentPw} onChange={(event) => setCurrentPw(event.target.value)} required />
          </label>
          <label className="security-field">
            <span>New password (minimum 8 characters)</span>
            <input type="password" autoComplete="new-password" value={newPw} onChange={(event) => setNewPw(event.target.value)} required />
          </label>
          <label className="security-field">
            <span>Confirm new password</span>
            <input type="password" autoComplete="new-password" value={confirmPw} onChange={(event) => setConfirmPw(event.target.value)} required />
          </label>
          <label className="security-field">
            <span>Authenticator code</span>
            <input className="security-code-input" inputMode="numeric" maxLength={6} placeholder="000000" value={pwCode} onChange={(event) => setPwCode(event.target.value.replace(/[^0-9]/g, ""))} required />
          </label>
          <label className="security-checkbox">
            <input type="checkbox" checked={logoutOthers} onChange={(event) => setLogoutOthers(event.target.checked)} />
            Sign out my other sessions
          </label>
          <button type="submit" className="security-submit" disabled={Boolean(loadingMsg)}>Change password</button>
        </form>

        <hr className="security-divider" />

        <h3>Two-Factor Devices {status ? `(${devices.length}/3)` : ""}</h3>
        {!status ? (
          <p className="security-hint">Loading...</p>
        ) : !status.enabled ? (
          <p className="security-hint">Two-factor authentication is currently OFF for this account. It is enabled during your next login.</p>
        ) : (
          <>
            <ul className="security-devices">
              {devices.map((device) => (
                <li key={device.id} className="security-device">
                  <span className="security-device-name">{device.name}</span>
                  <span className="security-device-date">paired {new Date(device.created_at).toLocaleDateString()}</span>
                  <button type="button" className="security-remove-btn" onClick={() => { setRemoveTarget(device); setRemoveCode(""); }}>
                    <FiTrash2 /> Remove
                  </button>
                </li>
              ))}
            </ul>
            {removeTarget && (
              <div className="security-inline-confirm">
                <p className="security-hint">Enter a code to remove "{removeTarget.name}":</p>
                <div className="security-inline-row">
                  <input className="security-code-input" inputMode="numeric" maxLength={6} placeholder="000000" value={removeCode} onChange={(event) => setRemoveCode(event.target.value.replace(/[^0-9]/g, ""))} autoFocus />
                  <button type="button" className="security-submit" onClick={handleRemoveDevice} disabled={Boolean(loadingMsg)}>Remove</button>
                  <button type="button" className="security-link-btn" onClick={() => setRemoveTarget(null)}>Cancel</button>
                </div>
              </div>
            )}
            {!atLimit && !showAdd && (
              <button type="button" className="security-link-btn" onClick={() => { setShowAdd(true); setNewQr(""); }}>
                + Pair another device
              </button>
            )}
            {atLimit && <p className="security-hint">Maximum of 3 paired devices. Remove one before adding another.</p>}
            {showAdd && (
              <form onSubmit={handleAddDevice} className="security-form security-add-form">
                <label className="security-field">
                  <span>Device name</span>
                  <input type="text" maxLength={50} value={addName} onChange={(event) => setAddName(event.target.value)} required />
                </label>
                <label className="security-field">
                  <span>Current password</span>
                  <input type="password" autoComplete="current-password" value={addPassword} onChange={(event) => setAddPassword(event.target.value)} required />
                </label>
                <label className="security-field">
                  <span>Authenticator code</span>
                  <input className="security-code-input" inputMode="numeric" maxLength={6} placeholder="000000" value={addCode} onChange={(event) => setAddCode(event.target.value.replace(/[^0-9]/g, ""))} required />
                </label>
                <button type="submit" className="security-submit" disabled={Boolean(loadingMsg)}>Pair device</button>
                <button type="button" className="security-link-btn" onClick={() => { setShowAdd(false); setNewQr(""); }}>Cancel</button>
              </form>
            )}
            {newQr && (
              <div className="security-qr-panel">
                <div className="security-qr" dangerouslySetInnerHTML={{ __html: newQr }} />
              </div>
            )}

            <hr className="security-divider" />
            {!showDisable ? (
              <button type="button" className="security-danger-btn" onClick={() => setShowDisable(true)}>
                Disable two-factor authentication
              </button>
            ) : (
              <form onSubmit={handleDisable} className="security-form">
                <p className="security-hint">Enter your password and a code to turn OFF two-factor protection:</p>
                <label className="security-field">
                  <span>Current password</span>
                  <input type="password" autoComplete="current-password" value={disablePassword} onChange={(event) => setDisablePassword(event.target.value)} required />
                </label>
                <label className="security-field">
                  <span>Authenticator code</span>
                  <input className="security-code-input" inputMode="numeric" maxLength={6} placeholder="000000" value={disableCode} onChange={(event) => setDisableCode(event.target.value.replace(/[^0-9]/g, ""))} required />
                </label>
                <button type="submit" className="security-danger-btn" disabled={Boolean(loadingMsg)}>Confirm disable</button>
                <button type="button" className="security-link-btn" onClick={() => setShowDisable(false)}>Cancel</button>
              </form>
            )}
          </>
        )}
      </section>
      {loadingMsg && <LoadingOverlay message={loadingMsg} />}
    </main>
  );
}
