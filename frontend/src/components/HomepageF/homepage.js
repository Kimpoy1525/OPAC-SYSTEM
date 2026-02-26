import React from "react";
import "./homepage.css";
import { FaSearch } from "react-icons/fa";
import Header from '../Header/header'

// 1. Add { setUser, user } here to "catch" the props from App.js
export default function Homepage({ setUser, user }) {

  const handleCategoryClick = (course) => {
    alert("Clicked: " + course);
  };

  return (
    <div className="homepage-container">
      {/* 2. Pass setUser and user down to the Header */}
      <Header setUser={setUser} user={user} />
      
      <h1 className="homepage-title">ONLINE PUBLIC ACCESS CATALOG</h1>

      <div className="search-container">
        <input
          type="text"
          placeholder="Search by title, author or keyword"
          className="search-input"
        />
        <button className="search-icon">
          <FaSearch />
        </button>
      </div>

      <div className="category-container">
        <button onClick={() => handleCategoryClick("BSCS")} className="category-btn">BSCS</button>
        <button onClick={() => handleCategoryClick("BSIT")} className="category-btn">BSIT</button>
        <button onClick={() => handleCategoryClick("BSEMC")} className="category-btn">BSEMC</button>
      </div>
    </div>
  );
}