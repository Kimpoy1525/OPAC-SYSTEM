import React from 'react'
import { FiX } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom' // Added to handle redirection
import "./logout.css"

const Logout = ({ isOpen, onClose, setUser }) => {

    const navigate = useNavigate();

    if (!isOpen) return null;

    const handleConfirmLogout = async () => {
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

        // 3. Redirect to the landing page
        navigate("/");

        // 4. Close the modal
        onClose();
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
