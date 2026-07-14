import React from 'react';
import { FaSearch } from 'react-icons/fa';
import './searchbar.css';

const Searchbar = ({ searchQuery, setSearchQuery, onSearch, loading }) => (
  <form className='search-bar' onSubmit={onSearch} role='search'>
    <FaSearch className='search-leading-icon' aria-hidden='true' />
    <input type='search' placeholder='Search title, author, or keyword' aria-label='Search research repository' value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
    <button className='search-btn' type='submit' disabled={loading}>{loading ? 'Searching…' : 'Search'}</button>
  </form>
);

export default Searchbar;
