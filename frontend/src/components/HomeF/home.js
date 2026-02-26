import React, { useState } from "react";
import "./home.css";

import logo from '../Images/Logo Olfu.png'
import bgImage from '../Images/bgImage.jpg'
import LoginModal from "../LoginF/loginModal";

// Added { setUser } as a prop so we can pass it to the Modal
export default function HomeF({ setUser }) { 
    const [showModal, setShowModal] = useState(false);

    return (
        <div className="home-container">
            <header className="header">
                <img className="logo" src={logo} alt="Logo" />
                <div className="header-inner">
                    {/* Header content stays the same */}
                </div>
            </header>

            <div className="home-background">
                <img src={bgImage} alt="background" className="bg-img" />
                <div className="gradient-overlay"></div>
            </div>

            <div className="home-content">
                <h1>OUR LADY OF FATIMA UNIVERSITY</h1>
                <h2>COLLEGE OF COMPUTER STUDIES</h2>
                <p>ONLINE PUBLIC ACCESS CATALOG</p>

                <button 
                    className="login-btn"
                    onClick={() => setShowModal(true)}
                >
                    LOGIN
                </button>
            </div>

            {/* Pass setUser to the LoginModal here */}
            {showModal && (
                <LoginModal 
                    close={() => setShowModal(false)} 
                    setUser={setUser} 
                />
            )}
        </div>
    );
}