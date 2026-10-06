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
        //    - Google users: redirect through Google's sign-out page, which clears
        //      the browser's Google session too (automatic, no manual Google logout).
        //      Google then redirects back to our login page, and the next sign-in
        //      asks for the Google password again. Note: this also signs the user
        //      out of other Google services (Gmail/Classroom) in THIS browser.
        //    - Content-manager portal users: plain SPA redirect (no Google involved).
        if (isGoogleLogin) {
            const returnUrl = window.location.origin + "/";
            window.location.replace(
                "https://accounts.google.com/Logout?continue=" + encodeURIComponent(returnUrl)
            );
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
