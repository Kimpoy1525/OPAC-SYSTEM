import React, { useState } from "react";
import { Link, useNavigate } from 'react-router-dom'
import { FiMenu, FiX } from 'react-icons/fi';
import Logout from "../Logout/logout";
import logo from "../Images/Logo Olfu.png"
import './header.css'

// 1. Receive setUser and user props here
const Header = ({ setUser, user }) => {
    const [open, setOpen] = useState(false);
    const [isLogoutOpen, setIsLogoutOpen] = useState(false);
    const navigate = useNavigate();

    // 2. Updated Admin Check: Use the is_staff flag from your Django user object
    const isAdmin = user?.role === "Admin" || user?.role === "ADMIN";

    return (
        <header className='header2'>
            <Link to='/homepage' className='logo2'>
                <img src={logo} alt='logo'/>
            </Link>

      <nav className={`nav-links ${open ? "show" : ""}`}>
    <Link to='/homepage'>Home</Link>

    {isAdmin && (
      <Link to='/upload'>Upload</Link>
    )}

    <Link to='/repository'>Repository</Link>

<div className="user-area">
    {user && (
      <button 
        className='logout-btn' 
        onClick={() => setIsLogoutOpen(true)}
      >
        Logout
      </button>
    )}
  
    {/* ✅ Automatically show when logged in */}
    {user && (
      <div className="user-profile">
                            {/* --- CONDITIONAL AVATAR --- */}
                            {user && user.picture ? (
                                <img 
                                    src={user.picture} 
                                    alt="profile" 
                                    referrerPolicy="no-referrer"
                                    className="profile-pic"
                                />
                            ) : (
                                <div className="profile-letter-avatar">
                                    {/* Gets first letter of username or email */}
                                    {(user.username || user.email || "A").charAt(0).toUpperCase()}
                                </div>
                            )}

                            <span className="user-name">
                                {user.first_name || user.username || user.name}
                            </span>

            
                        </div>

    )}
    </div>
</nav>


            <div className='hamburger' onClick={() => setOpen(!open)}>
                {open ? <FiX size={28}/> : <FiMenu size={28}/>}
            </div>

            {/* 3. Pass setUser down to the Logout modal */}
            <Logout
              isOpen={isLogoutOpen}
              onClose={() => setIsLogoutOpen(false)}
              setUser={setUser} 
            />

        </header>
    );
}

export default Header