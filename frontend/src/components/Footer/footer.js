import React from "react";
import { FaFacebook, FaGlobe } from "react-icons/fa";
import { useLocation } from "react-router-dom";
import "./footer.css";

const Footer = () => {
  const location = useLocation();
  const currentYear = new Date().getFullYear();

  if (location.pathname !== "/" && location.pathname !== "/homepage") {
    return null;
  }

  return (
    <footer className="footer">
      <div className="footer-content">
        <section className="footer-identity" aria-labelledby="footer-title">
          <h3 id="footer-title">OLFU CCS OPAC Valenzuela</h3>
          <p>College of Computer Studies<br />Research Repository</p>
        </section>

        <nav className="footer-section" aria-label="Footer navigation">
          <h4>Quick links</h4>
          <ul>
            <li><a href="/repository">Browse research</a></li>
            <li><a href="https://fatima.edu.ph" target="_blank" rel="noreferrer">About OLFU</a></li>
          </ul>
        </nav>

        <section className="footer-section" aria-labelledby="connect-title">
          <h4 id="connect-title">Connect</h4>
          <div className="social-icons">
            <a href="https://fatima.edu.ph" target="_blank" rel="noreferrer" aria-label="OLFU website">
              <FaGlobe aria-hidden="true" />
            </a>
            <a href="https://www.facebook.com/our.lady.of.fatima.university/" target="_blank" rel="noreferrer" aria-label="OLFU on Facebook">
              <FaFacebook aria-hidden="true" />
            </a>
          </div>
        </section>
      </div>

      <p className="footer-copyright">
        &copy; {currentYear} Our Lady of Fatima University. All rights reserved.
      </p>
    </footer>
  );
};

export default Footer;
