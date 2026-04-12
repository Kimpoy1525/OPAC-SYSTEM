import React from 'react';
import { FaFacebook, FaGithub, FaGlobe } from 'react-icons/fa';
import './footer.css';
import { useLocation } from 'react-router-dom';

const Footer = () => {
    const location = useLocation();
    const currentYear = new Date().getFullYear();

    // ADD THIS LOGIC:
    // If the path is not exactly "/", return null so nothing renders
    if (location.pathname !== '/' && location.pathname !== '/homepage') {
        return null;
    }

    return (
        <footer className="footer">
            <div className="footer-content">
                <div className="footer-section">
                    <h3>OLFU CCS OPAC VAL</h3>
                    <p>College of Computer Studies Research Repository</p>
                </div>

                <div className="footer-section">
                    <h4>Quick Links</h4>
                    <ul>
                        <li><a href="/repository">Browse Research</a></li>
                        <li><a href="https://fatima.edu.ph">About CCS</a></li>
                    </ul>
                </div>

                <div className="footer-section">
                    <h4>Connect</h4>
                    <div className="social-icons">
                        <a href="https://fatima.edu.ph" target="_blank" rel="noreferrer"><FaGlobe /></a>
                        <a href="https://www.facebook.com/our.lady.of.fatima.university/"><FaFacebook /></a>
                        <a href="https://github.com/"><FaGithub /></a>
                    </div>
                </div>
            </div>

            <div className="footer-bottom">
                <p>&copy; {currentYear} Our Lady of Fatima University. All rights reserved.</p>
            </div>
        </footer>
    );
};

export default Footer;