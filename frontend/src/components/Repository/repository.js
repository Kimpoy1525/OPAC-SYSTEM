import React, { useState, useEffect, useCallback } from 'react'
import { FaChevronDown } from "react-icons/fa6";
import axios from 'axios';
import './repository.css'
import Header from '../Header/header'
import Searchbar from '../SearchBar/searchbar'
import { Link } from 'react-router-dom';
import Select from 'react-select'

const Repository = ({ setUser, user }) => {
  const [researches, setResearches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State for Filters and Search
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Memoized fetch function to handle search and filters
  const fetchResearches = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:8000/home/all/', {
        params: {
          year: selectedYear,
          course: selectedCourse,
          search: searchQuery // Passes search to Django's icontains logic
        }
      });
      setResearches(response.data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching repository data:", err);
      setLoading(false);
    }
  }, [selectedYear, selectedCourse, searchQuery]);

  // Initial fetch and fetch on search change
  useEffect(() => {
    fetchResearches();
  }, [fetchResearches]);

  // Handle Apply Filters button
  const handleApplyFilters = () => {
    fetchResearches();
  };

  return (
    <main>
        <Header setUser={setUser} user={user} />
        
        <div className='repo-page'>
          {/* 2. Pass search state to Searchbar */}
          <Searchbar setSearchQuery={setSearchQuery} />

          <header className='repository-header'>
            <h1>ONLINE PUBLIC ACCESS CATALOG</h1>
            <p>Explore all stored theses and capstone 
              projects from the College of Computer Studies
            </p>
          </header>

          <section className='filter-container'>
            <div className='filter-select'>
              <input 
                type='number' 
                placeholder='Year (e.g. 2024)'
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                min="2019"
                max={new Date().getFullYear()}
                className="year-filter-input"
              />
            </div>

            <div className='filter-select'>
              <select 
                value={selectedCourse} 
                onChange={(e) => setSelectedCourse(e.target.value)}
              >
                <option value=''>All Programs</option>
                <option value='BSCS'>BSCS</option>
                <option value='BSIT'>BSIT</option>
                <option value='BSEMC'>BSEMC</option>
              </select>
              <FaChevronDown className="dropdown-arrow" />
            </div>

            <button className='apply-filter-btn' onClick={handleApplyFilters}>
              Apply Filters
            </button>
          </section>

          <section className='filter-results'>
            {loading ? (
              <p>Loading research papers...</p>
            ) : researches.length > 0 ? (
              researches.map((research) => (
                <div key={research.id} className='research-card'>
                  <h3>{research.title}</h3>
                  <p className='authors-name'>
                    <span className='labels'>Author(s):</span> {research.authors}
                  </p>
                  <p className='years-published'>
                    <span className='labels'>Year:</span> {research.year}
                  </p>
                  
                  {/* 3. Display Keyword Tags if they exist */}
                  {research.keywords && (
                    <p className='repo-keywords'>
                      <span className='labels'>Keywords:</span> {research.keywords}
                    </p>
                  )}

                  <p className='abstract'>
                    {research.abstract.substring(0, 250)}...
                  </p>

                  <div className='research-card-footer'>
                    <div className='detail-below'>
                       <span className='card-program'>{research.course}</span>
                    
                        {/* 4. Display how many documents are attached */}
                      <span className='file-count'>
                        {research.files?.length || 0} Document(s)
                      </span>
                    </div>
                   

                    <Link to={`/details/${research.id}`} className='details-btn'>View Details</Link>
                  </div>
                </div>
              ))
            ) : (
              <p>No research papers found matching your criteria.</p>
            )}
          </section>
        </div>
    </main>
  )
}

export default Repository