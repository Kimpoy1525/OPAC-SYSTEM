import React from 'react'
import { FaSearch } from 'react-icons/fa'
import './searchbar.css'

// 1. Accept setSearchQuery as a prop from Repository.js
const Searchbar = ({ setSearchQuery }) => {
    
    // 2. Handle the input change
    const handleChange = (e) => {
        setSearchQuery(e.target.value);
    };

    return (
      <section className='search-bar'>
          <input 
            type='text' 
            placeholder='Search by title, author, or keyword....'
            // 3. Connect the input to the state updater
            onChange={handleChange}
          />
          <button className='search-btn' type="button">
            <FaSearch/>
          </button>
      </section>
    )
}

export default Searchbar