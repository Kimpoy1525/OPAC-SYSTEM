import React, { useState } from "react";
import "./home.css";

import logo from "../Images/Logo Olfu.png";
import bgImage from "../Images/bgImage.jpg";
import LoginModal from "../LoginF/loginModal";

export default function HomeF({ setUser }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <main className="landing-page">
      <header className="landing-header">
        <img className="landing-logo" src={logo} alt="Our Lady of Fatima University" />
      </header>

      <img src={bgImage} alt="Our Lady of Fatima University campus" className="landing-background" />
      <div className="landing-shade" aria-hidden="true" />

      <section className="landing-content" aria-labelledby="landing-title">
        <h1 id="landing-title">Our Lady of Fatima University</h1>
        <h2>College of Computer Studies</h2>
        <p>CCSTECHVAULT</p>
        <button type="button" className="landing-login-button" onClick={() => setShowModal(true)}>
          Log in
        </button>
      </section>

      {showModal && <LoginModal close={() => setShowModal(false)} setUser={setUser} />}
    </main>
  );
}
