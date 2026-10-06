import React from 'react'
import { FiX } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom' // Added to handle redirection
import "./logout.css"

const Logout = ({ isOpen, onClose, setUser }) => {

    const navigate = useNavigate();

    if (!isOpen) return null;

    const handleConfirmLogout = async () => {
        // Detect how this session was created BEFORE clearing local state, so
        // Google-signed-in users (students/teachers) ALSO get signed out of
        // Google - the next "Sign in with Google" then requires the password.
        let isGoogleLogin = true;
        try {
            const saved = localStorage.getItem("user");
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && parsed.via) {
                    isGoogleLogin = parsed.via === "google";
                } else {
                    // Sessions created before the `via` flag existed:
                    // only content managers/superadmins ever use the password portal.
                    const role = parsed && parsed.role ? parsed.role.toUpperCase() : "";
                    isGoogleLogin = role !== "CONTENT_MANAGER" && role !== "SUPERADMIN";
                }
            }
        } catch {
            // If we cannot tell, default to also ending the Google session (safer on shared PCs).
        }

        // Open Google's sign-out page in a small popup SYNCHRONOUSLY - popup
        // blockers suppress window.open() calls made after an await, so this
        // must happen while still inside the click gesture. Google processes
        // the sign-out there and clears its browser session. The popup uses
        // the plain Logout URL because Google now rejects `continue` to
        // non-Google domains with a 400 error; a popup keeps our main window
        // in the app, so no auto-return URL is needed.
        const googlePopup = isGoogleLogin
            ? window.open(
                  "https://accounts.google.com/Logout",
                  "google-session-logout",
                  "width=520,height=600"
              )
            : null;

        try {
            await fetch(`${process.env.REACT_APP_API_URL}/api/accounts/logout/`, {
                method: "POST",
                credentials: "include",
            });
        } catch {
            // Continue clearing local state even if the server is unreachable.
        }
        // 1. Clear the storage so it doesn't auto-login on refresh
        localStorage.removeItem("user");

        // 2. Clear the React state in App.js (this locks the ProtectedRoutes)
        setUser(null);

        // 3. Close the modal
        onClose();

        // 4. End the sessions:
        //    - Google users: the popup above already ended the browser's Google
        //      session (automatic - no manual Google logout), the main window
        //      returns to the landing/login page by itself, and the next
        //      "Sign in with Google" asks for the password again. The popup is
        //      auto-closed after a short delay. If a popup blocker suppressed
        //      it, OUR session still ends - only the Google hop is skipped.
        //    - Content-manager portal users: plain SPA redirect (no Google involved).
        if (googlePopup) {
            window.setTimeout(() => {
                try {
                    googlePopup.close();
                } catch {
                    // The user may have already closed the popup themselves.
                }
            }, 1800);
            return;
        }
        navigate("/");
    };

    return (
        <main className='logout-page' onClick={onClose}>
            <div className='logout-modal' onClick={(e) => e.stopPropagation()}>
                <button className='logout-close' type='button' onClick={onClose} aria-label='Close logout dialog'><FiX size={20} /></button>
                
                <h2>Logout</h2>
                <p>Are you sure you want to logout?</p>

                <div className="logout-button-group">
                    <button className='cancel' onClick={onClose}>
                        Cancel
                    </button>
                    <button className='confirm-logout-btn' onClick={handleConfirmLogout}>
                        Logout
                    </button>
                </div>
            </div>
        </main>
    )
}

export default Logout
