import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LuDownload } from "react-icons/lu";
import { FaLock } from "react-icons/fa";
import axios from 'axios';
import Header from '../Header/header';
import LoadingOverlay from '../LoadingOverlay/loadingOverlay';
import './researchdetails.css';
import '../Upload/upload.css';

const ResearchDetails = ({ setUser, user }) => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [researchItem, setResearchItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showSuccess, setShowSuccess] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // --- FILE STATES ---
    const [existingFiles, setExistingFiles] = useState([]); 
    const [newFiles, setNewFiles] = useState([]);           
    const [filesToDelete, setFilesToDelete] = useState([]); 
    const [newVideo, setNewVideo] = useState(null);
    const [removeVideo, setRemoveVideo] = useState(false);

    // --- FORM STATES ---
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [authors, setAuthors] = useState('');
    const [year, setYear] = useState('');
    const [abstract, setAbstract] = useState('');
    const [keywords, setKeywords] = useState('');
    const [panelists, setPanelists] = useState('');
    const [course, setCourse] = useState('');

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_URL}/home/detail/${id}/`);
                const data = response.data;
                setResearchItem(data);
                
                setTitle(data.title);
                setAuthors(data.authors);
                setYear(data.year);
                setAbstract(data.abstract);
                setKeywords(data.keywords || '');
                setPanelists(data.panelists || '');
                setCourse(data.course || '');
                setExistingFiles(data.files || []);
                
                setLoading(false);
            } catch (err) {
                console.error("Error fetching detail:", err);
                setLoading(false);
            }
        };
        fetchDetail();
    }, [id]);

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        setNewFiles((prev) => [...prev, ...selectedFiles]);
    };

    const removeNewFile = (index) => {
        setNewFiles(newFiles.filter((_, i) => i !== index));
    };

    const markForDeletion = (fileId) => {
        setFilesToDelete((prev) => [...prev, fileId]);
        setExistingFiles(existingFiles.filter(f => f.id !== fileId));
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setSaving(true);

        const formData = new FormData();
        formData.append('title', title);
        formData.append('authors', authors);
        formData.append('year', year);
        formData.append('abstract', abstract);
        formData.append('keywords', keywords);
        formData.append('panelists', panelists);
        formData.append('course', course);
        formData.append('delete_files', JSON.stringify(filesToDelete));
        formData.append('remove_video', removeVideo ? 'true' : 'false');
        if (newVideo) formData.append('video', newVideo);

        newFiles.forEach((file) => {
            formData.append('new_files', file);
        });

        try {
            await axios.put(`${process.env.REACT_APP_API_URL}/home/detail/${id}/update/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
           
            setSaving(false);
            setIsEditModalOpen(false);
            setShowSuccess(true);
            
        } catch (err) {
            setSaving(false);
            console.error(err);
            alert("Update failed.");
        }
    };

    const handleCloseSuccess = () => {
        setShowSuccess(false);
        window.location.reload();
    };

    if (loading) return <LoadingOverlay message="Loading research details..." />;
    if (!researchItem) return <div>Not found.</div>;

    return (
        <main>
            <Header setUser={setUser} user={user} />
            <div className='details-page'>
                <div className='details-content'>
                    <h1>{researchItem.title}</h1>
                    
                    {user && (user.role === 'ADMIN' || user.role === 'SUPERADMIN') && (
                        <button className='edit-details' onClick={() => setIsEditModalOpen(true)}>Edit</button>
                    )}

                    <p><strong>Author(s):</strong> {researchItem.authors}</p>
                    <p><strong>Year:</strong> {researchItem.year}</p>
                    <p className='details-abstract'><strong>Abstract:</strong> {researchItem.abstract}</p>
                    <p><strong>Panelists:</strong> {researchItem.panelists || "No panelists specified"}</p>
                    <p><strong>Keywords:</strong> {researchItem.keywords || "No keywords specified"}</p>

                    {researchItem.video && (
                        <section className='video-section'>
                            <strong>Thesis Video</strong>
                            <video controls preload='metadata'>
                                <source src={researchItem.video} />
                                Your browser does not support embedded video.
                            </video>
                        </section>
                    )}

                    <div className='file-section'>
                        <strong>Files:</strong>
                        {researchItem.files && researchItem.files.length > 0 ? (
                            researchItem.files.map((fileObj, index) => (
                                <div key={fileObj.id || index} className='file-download'>
                                    <span className='file-name'>
                                        {fileObj.file.split('/').pop()}
                                    </span>
                                    
                                    {user && (user.role === 'ADMIN' || user.role === 'SUPERADMIN' || user.role === 'TEACHER') ? (
                                        <a 
                                            href={`${process.env.REACT_APP_API_URL}/home/download/${fileObj.id}/`} 
                                            className='download-icon'
                                            title="Download File"
                                        >
                                            <LuDownload />
                                        </a>
                                    ) : (
                                        <span className='lock-icon' title="Access Restricted to Admins">
                                            <FaLock />
                                        </span>
                                    )}
                                </div>
                            ))
                        ) : (
                            <p>No files available for this research.</p>
                        )}
                    </div>
                
                    <button className='back-btn' onClick={() => navigate(-1)}>Back</button>
                </div>
            </div>

            {/* Loading overlay for save */}
            {saving && <LoadingOverlay message="Saving changes..." />}

            {/* --- EDIT MODAL --- */}
            {isEditModalOpen && !saving && (
                <div className="modal-overlay">
                    <div className="modal-container">
                        <button className="close-modal" onClick={() => setIsEditModalOpen(false)}>✕</button>
                        
                        <form className='upload-form edit-form' onSubmit={handleUpdate}>
                            <h2 className='form-header'>Edit Research Details</h2>

                            <div className='form-input'>
                                <label>Research Title</label>
                                <input type='text' value={title} onChange={(e) => setTitle(e.target.value)} required />
                            </div>

                            <div className='form-input'>
                                <label>Author(s)</label>
                                <input type='text' value={authors} onChange={(e) => setAuthors(e.target.value)} required />
                            </div>

                            <div className='form-input'>
                                <label>Year</label>
                                <input type='number' value={year} onChange={(e) => setYear(e.target.value)} required />
                            </div>

                            <div className='form-input'>
                                <label>Keywords</label>
                                <input type='text' value={keywords} onChange={(e) => setKeywords(e.target.value)} />
                            </div>

                            <div className='form-input'>
                                <label>Abstract</label>
                                <textarea rows={5} value={abstract} onChange={(e) => setAbstract(e.target.value)} required />
                            </div>

                            <div className='form-input'>
                                <label>Panelists</label>
                                <input type='text' value={panelists} onChange={(e) => setPanelists(e.target.value)} required />
                            </div>

                            <div className='form-input'>
                                <label>Existing Files (Click ✕ to delete)</label>
                                <div className="file-queue">
                                    {existingFiles.map((fileObj) => (
                                        <div key={fileObj.id} className="queue-item existing-file">
                                            <span>{fileObj.file.split('/').pop()}</span>
                                            <button type="button" className="remove-btn" onClick={() => markForDeletion(fileObj.id)}>✕</button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className='form-input'>
                                <label>Add New Files</label>
                                <div className='file-upload'>
                                    <input type='file' id='editFileUpload' multiple hidden onChange={handleFileChange} />
                                    <label htmlFor='editFileUpload' className='file-btn'>Choose Files</label>
                                </div>
                                <div className="file-queue">
                                    {newFiles.map((file, index) => (
                                        <div key={index} className="queue-item new-file">
                                            <span>{file.name} (New)</span>
                                            <button type="button" className="remove-btn" onClick={() => removeNewFile(index)}>✕</button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className='form-input'>
                                <label>Thesis Video <span className='optional-label'>Optional</span></label>
                                {researchItem.video && !removeVideo && !newVideo && (
                                    <div className='existing-video-row'><span>{researchItem.video.split('/').pop()}</span><button type='button' className='remove-btn' onClick={() => setRemoveVideo(true)}>Remove</button></div>
                                )}
                                <p className='field-help'>{newVideo ? `Selected: ${newVideo.name}` : removeVideo ? 'Existing video will be removed.' : 'MP4, WebM, or MOV; maximum 100 MB.'}</p>
                                <div className='file-upload'>
                                    <input type='file' id='editVideoUpload' accept='video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov' hidden onChange={(event) => { setNewVideo(event.target.files[0] || null); setRemoveVideo(false); }} />
                                    <label htmlFor='editVideoUpload' className='file-btn'>{researchItem.video ? 'Replace Video' : 'Choose Video'}</label>
                                    {newVideo && <button type='button' className='remove-btn' onClick={() => setNewVideo(null)}>Cancel</button>}
                                </div>
                            </div>

                            <div className='select-program'>
                                {['BSCS', 'BSIT', 'BSEMC'].map((prog) => (
                                    <button 
                                        key={prog} 
                                        type='button' 
                                        className={`program-btn ${course === prog ? 'active' : ''}`} 
                                        onClick={() => setCourse(prog)}
                                        style={{ backgroundColor: course === prog ? '#1a472a' : '' }}
                                    >
                                        {prog}
                                    </button>
                                ))}
                            </div>

                            <button type='submit' className='submit-btn'>SAVE CHANGES</button>
                        </form>
                    </div>
                </div>
            )}

            {/* --- SUCCESS POPUP --- */}
            {showSuccess && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="success-icon">✔</div>
                        <h3>Changes Saved!</h3>
                        <p>The research details have been updated successfully.</p>
                        <button className="modal-close-btn" onClick={handleCloseSuccess}>Done</button>
                    </div>
                </div>
            )}
        </main>
    );
}

export default ResearchDetails;
