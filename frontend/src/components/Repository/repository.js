import React from 'react'
import { FaChevronDown } from "react-icons/fa6";
import './repository.css'
import {researchDetails} from '../../data/mockdata'
import Header from '../Header/header'
import Searchbar from '../SearchBar/searchbar'
import { Link } from 'react-router-dom';

// 1. Destructure setUser and user from props
const Repository = ({ setUser, user }) => {
  const dumpData = researchDetails;

  return (
    <main>
        {/* 2. Pass them down to the Header component */}
        <Header setUser={setUser} user={user} />
        
        <div className='repo-page'>
          <Searchbar />

          <header className='repository-header'>
            <h1>ONLINE PUBLIC ACCESS CATALOG</h1>
            <p>Explore all stored theses and capstone 
              projects from the College of Computer Studies
            </p>
          </header>

          <section className='filter-container'>
            <div className='filter-select'>
              <select>
                <option value=''>All Year</option>
              </select>
              <FaChevronDown className="dropdown-arrow" />
            </div>

            <div className='filter-select'>
              <select>
                <option value=''>All Programs</option>
                    <option value=''>BSCS</option>
                    <option value=''>BSIT</option>
                    <option value=''>BSEMC</option>
              </select>
              <FaChevronDown className="dropdown-arrow" />
            </div>

            <button className='apply-filter-btn'>Apply Filters</button>
          </section>


          <section className='filter-results'>
            {dumpData.map((research) => (
            <div key={research.id} className='research-card'>
              <h3>
                {research.title}
              </h3>
              <p className='authors-name'>
                <span className='labels'>Author(s):</span> {research.authors}
              </p>
              <p className='years-published'>
                <span className='labels'>Year:</span> {research.year}
              </p>
              <p className='abstract'>
                {research.abstract}
              </p>

              <div className='research-card-footer'>
                <span className='card-program'>{research.program}</span>
                <Link to={`/details/${research.id}`} className='details-btn'>View Details</Link>
              </div>

            </div>
            ))}
          </section>
        </div>
    </main>
  )
}

export default Repository