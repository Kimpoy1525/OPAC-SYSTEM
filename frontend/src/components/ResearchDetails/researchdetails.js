import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { LuDownload } from "react-icons/lu";
import { researchDetails } from '../../data/mockdata';
import Header from '../Header/header'
import Searchbar from '../SearchBar/searchbar';
import './researchdetails.css'

// 1. Destructure setUser and user from props to maintain the "Relay"
const ResearchDetails = ({ setUser, user }) => {
    const {id} = useParams();
    const navigate = useNavigate();

    const researchItem = researchDetails.find(item => item.id === parseInt(id));
    
    if(!researchItem){
        return (
            <main>
                <Header setUser={setUser} user={user} />
                <div className='details-page'>
                    <div>Research item not found</div>
                </div>
            </main>
        )
    }

  return (
    <main>
        {/* 2. Pass setUser and user to Header */}
        <Header setUser={setUser} user={user} />
        
        <div className='details-page'>
            <Searchbar/>

            <div className='details-content'>
                <h1>{researchItem.title}</h1>
                <p>
                    <strong>Author(s):</strong> {researchItem.authors}
                </p>
                <p>
                    <strong>Year:</strong> {researchItem.year}
                </p>
                <p className='details-abstract'>
                    <strong>Abstract:</strong> {researchItem.abstract}
                </p>
                <p>
                    <strong>Keywords:</strong> {researchItem.keywords}
                </p>
                 <p>
                    <strong>APA:</strong> {researchItem.apa}
                </p>


                <div className='file-section'>
                    <strong>Files:</strong>
                    {researchItem.files.map((file, index) => (
                        <div key={index} className='file-download'>
                            <span className='file-name'>{file}</span>
                            <a href={`/files/${file}`} download className='download-icon'><LuDownload /></a>
                        </div>
                    ))}
                </div>

                <button className='back-btn' onClick={() => navigate(-1)}>Back to Repository</button>
            </div>
            
        </div>
    </main>
  )
}

export default ResearchDetails