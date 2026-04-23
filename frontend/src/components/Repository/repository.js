import React, { useState, useEffect, useCallback } from 'react'
import { FaChevronDown, FaTrash } from "react-icons/fa6"; // Added FaTrash
import axios from 'axios';
import './repository.css'
import Header from '../Header/header'
import Searchbar from '../SearchBar/searchbar'
import { Link, useSearchParams } from 'react-router-dom';
import '../Upload/upload.css'; 

const Repository = ({ setUser, user }) => {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const initialCourse = searchParams.get('course') || '';

  const [researches, setResearches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(initialCourse);
  const [searchQuery, setSearchQuery] = useState(initialSearch);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null); // Stores { id, title }

  const fetchResearches = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/home/all/`, {
        params: {
          year: selectedYear,
          course: selectedCourse,
          search: searchQuery 
        }
      });
      setResearches(response.data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching repository data:", err);
      setLoading(false);
    }
  }, [selectedYear, selectedCourse, searchQuery]);

  useEffect(() => {
    fetchResearches();
  }, [fetchResearches]);

  // --- DELETE HANDLER ---
  const openDeleteModal = (id, title) => {
    setItemToDelete({ id, title });
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

      try {
     await axios.delete(`${process.env.REACT_APP_API_URL}/home/detail/${itemToDelete.id}/delete/`);
       setResearches(prev => prev.filter(item => item.id !== itemToDelete.id));
      setShowDeleteConfirm(false);
      setShowDeleteSuccess(true);
    
      } catch (err) {
        console.error("Delete failed:", err);
        alert("Failed to delete the item.");
      }
  };

  return (
    <main>
        <Header setUser={setUser} user={user} />
        
        <div className='repo-page'>
          <Searchbar setSearchQuery={setSearchQuery} searchQuery={searchQuery} />

          <header className='repository-header'>
            <h1>ONLINE PUBLIC ACCESS CATALOG</h1>
            <p>Explore all stored theses and capstone projects from the College of Computer Studies</p>
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
                 maxLength={4}
                 onInput={(e) => {
                   const value = e.target.value;
                   if (value.length > 4) {
                     e.target.value = value.slice(0, 4);
                   }
                 }}
                 className="year-filter-input"
               />
            </div>

            <div className='filter-select'>
              <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}>
                <option value=''>All Programs</option>
                <option value='BSCS'>BSCS</option>
                <option value='BSIT'>BSIT</option>
                <option value='BSEMC'>BSEMC</option>
              </select>
              <FaChevronDown className="dropdown-arrow" />
            </div>
          </section>

          <section className='filter-results'>
            {loading ? (
              <p>Loading research papers...</p>
            ) : researches.length > 0 ? (
              researches.map((research) => (
                <div key={research.id} className='research-card'>
                  {/* --- DELETE BUTTON AT TOP RIGHT --- */}
                  {user && (user.role === 'ADMIN' || user.role === 'SUPERADMIN') && (
                    <button 
                      className='card-delete-btn' 
                      onClick={() => openDeleteModal(research.id, research.title)}
                      title="Delete Research"
                    >
                      <FaTrash />
                    </button>
                  )}

                  <h3>{research.title}</h3>
                  <p className='authors-name'>
                    <span className='labels'>Author(s):</span> {research.authors}
                  </p>
                  <p className='years-published'>
                    <span className='labels'>Year:</span> {research.year}
                  </p>
                  
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
        {/* --- MODAL: CONFIRM DELETION --- */}
        {showDeleteConfirm && (
            <div className="modal-overlay">
                <div className="modal-content">
                    <div className="success-icon" style={{ color: '#d9534f' }}><FaTrash /></div>
                    <h3>Confirm Deletion</h3>
                    <p>Are you sure you want to delete <strong>"{itemToDelete?.title}"</strong>? This action cannot be undone.</p>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <button className="modal-close-btn" onClick={handleConfirmDelete} style={{ backgroundColor: '#d9534f' }}>
                             Delete
                        </button>
                        <button className="modal-close-btn" onClick={() => setShowDeleteConfirm(false)} style={{ backgroundColor: '#6c757d' }}>
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        )}
        {/* --- MODAL: DELETE SUCCESS --- */}
        {showDeleteSuccess && (
            <div className="modal-overlay">
                <div className="modal-content">
                    <div className="success-icon">✔</div>
                    <h3>Record Deleted</h3>
                    <p>The research record has been permanently removed.</p>
                    <button className="modal-close-btn" onClick={() => setShowDeleteSuccess(false)}>
                        Dismiss
                    </button>
                </div>
            </div>
        )}
    </main>
  )
}

export default Repository