import React from 'react'
import { FaSearch } from 'react-icons/fa'
import './searchbar.css'

// 1. Accept both the setter (setSearchQuery) AND the current value (searchQuery)
const Searchbar = ({ setSearchQuery, searchQuery }) => {
    
    const handleChange = (e) => {
        setSearchQuery(e.target.value);
    };

    return (
      <section className='search-bar'>
          <input 
            type='text' 
            placeholder='Search by title, author, or keyword....'
            // 2. Connect the value to the searchQuery state (Two-way binding)
            value={searchQuery}
            onChange={handleChange}
          />
          <button className='search-btn' type="button">
            <FaSearch/>
          </button>
      </section>
    )
}

export default Searchbar