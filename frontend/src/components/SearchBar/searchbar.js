  import React from 'react'
  import { FaSearch } from 'react-icons/fa'
  import './searchbar.css'

  const Searchbar = () => {
    return (
      <section className='search-bar'>
          <input type='text' placeholder='Search by title, author, or keyword....'/>
          <button className='search-btn'>
          <FaSearch/>
          </button>
      </section>
    )
  }

  export default Searchbar