import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LuDownload } from "react-icons/lu";
import axios from 'axios';
import Header from '../Header/header';
import Searchbar from '../SearchBar/searchbar';
import './researchdetails.css';

const ResearchDetails = ({ setUser, user }) => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [researchItem, setResearchItem] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                // Fetching the document which now includes a 'files' array
                const response = await axios.get(`http://localhost:8000/home/detail/${id}/`);
                setResearchItem(response.data);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching detail:", err);
                setLoading(false);
            }
        };
        fetchDetail();
    }, [id]);

    if (loading) {
        return (
            <main>
                <Header setUser={setUser} user={user} />
                <div className='details-page'>
                    <div className='loading-spinner'>Loading research details...</div>
                </div>
            </main>
        );
    }
    
    if (!researchItem) {
        return (
            <main>
                <Header setUser={setUser} user={user} />
                <div className='details-page'>
                    <div className='error-msg'>Research item not found in the database.</div>
                    <button onClick={() => navigate('/repository')}>Go Back</button>
                </div>
            </main>
        );
    }

    const apaCitation = `${researchItem.authors} (${researchItem.year}). ${researchItem.title}.`;

    return (
        <main>
            <Header setUser={setUser} user={user} />
            
            <div className='details-page'>
                <Searchbar/>

                <div className='details-content'>
                    <h1>{researchItem.title}</h1>
                    <button className='edit-details'>
                        Edit
                    </button>
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
                        {/* Displaying the real keywords from the DB */}
                        <strong>Keywords:</strong> {researchItem.keywords || "No keywords specified"}
                    </p>
                     <p>
                        <strong>APA:</strong> {apaCitation}
                    </p>

                    <div className='file-section'>
                        <strong>Files:</strong>
                        {/* 1. Updated: Mapping through the 'files' array instead of a single 'file' field */}
                        {researchItem.files && researchItem.files.length > 0 ? (
                            researchItem.files.map((fileObj, index) => (
                                <div key={fileObj.id || index} className='file-download'>
                                    <span className='file-name'>
                                        {/* Extracts filename from the URL string provided by Django */}
                                        {fileObj.file.split('/').pop()}
                                    </span>
                                    <a 
                                        href={fileObj.file} 
                                        download 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className='download-icon'
                                    >
                                        <LuDownload />
                                    </a>
                                </div>
                            ))
                        ) : (
                            <p>No files available for this research.</p>
                        )}
                    </div>

                    <button className='back-btn' onClick={() => navigate(-1)}>Back to Repository</button>
                </div>
            </div>
        </main>
    );
}

export default ResearchDetails;