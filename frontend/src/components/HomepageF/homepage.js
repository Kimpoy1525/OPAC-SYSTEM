import React, { useState } from "react"; // Added useState
import { useNavigate } from "react-router-dom"; // Added useNavigate
import "./homepage.css";
import { FaSearch } from "react-icons/fa";
import Header from '../Header/header';
import OLFU from '../Images/olfuhome.jpg';

export default function Homepage({ setUser, user }) {
  const [searchTerm, setSearchTerm] = useState(""); // State to track input
  const navigate = useNavigate();

  // Function to handle the search execution
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      // Navigates to repository with the search term as a URL parameter
      navigate(`/repository?search=${encodeURIComponent(searchTerm)}`);
    } else {
      // If empty, just go to repository
      navigate('/repository');
    }
  };

  return (
    <div className="homepage-container">
      <Header setUser={setUser} user={user} />

      <div className='homepage-banner'>
          <img className="olfuhome" src={OLFU} alt="OLFU Campus" />
          <h1 className="homepage-title">CCSTECHVAULT</h1>
           <div className="gradient-overlay1"></div>
      </div>
      
      {/* Search container - Wrapped in a form-like div for better UX */}
      <form className="search-container" onSubmit={handleSearch} role="search">
        <input
          type="text"
          placeholder="Search by title, author or keyword"
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Search the research repository"
        />
        <button className="search-icon" type="submit" aria-label="Search">
          <FaSearch />
        </button>
      </form>
    </div>
  );
}
