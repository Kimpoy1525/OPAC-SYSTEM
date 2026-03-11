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

  // Function to handle Enter key press
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch(e);
    }
  };

  // Function to handle category clicks (Program buttons)
  const handleCategoryClick = (course) => {
    // Navigates to repository with the course as a URL parameter
    navigate(`/repository?course=${course}`);
  };

  return (
    <div className="homepage-container">
      <Header setUser={setUser} user={user} />

      <div className='homepage-banner'>
          <img className="olfuhome" src={OLFU} alt="OLFU Campus" />
          <h1 className="homepage-title">ONLINE PUBLIC ACCESS CATALOG</h1>
           <div className="gradient-overlay1"></div>
      </div>
      
      {/* Search container - Wrapped in a form-like div for better UX */}
      <div className="search-container">
        <input
          type="text"
          placeholder="Search by title, author or keyword"
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="search-icon" onClick={handleSearch}>
          <FaSearch />
        </button>
      </div>
    </div>
  );
}