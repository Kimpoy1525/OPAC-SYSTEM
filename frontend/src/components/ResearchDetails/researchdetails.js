import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LuDownload } from "react-icons/lu";
import { FaLock } from "react-icons/fa";
import axios from 'axios';
import Header from '../Header/header';
import LoadingOverlay from '../LoadingOverlay/loadingOverlay';
import './researchdetails.css';
import '../Upload/upload.css';

const getYouTubeEmbedUrl = (url) => {
    if (!url) return '';
    try {
        const parsed = new URL(url);
        let videoId = '';
        if (parsed.hostname === 'youtu.be') videoId = parsed.pathname.slice(1).split('/')[0];
        else if (parsed.pathname.startsWith('/shorts/')) videoId = parsed.pathname.split('/')[2];
        else if (parsed.pathname.startsWith('/embed/')) videoId = parsed.pathname.split('/')[2];
        else videoId = parsed.searchParams.get('v') || '';
        return videoId ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}` : '';
    } catch {
        return '';
    }
};

const ResearchDetails = ({ setUser, user }) => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [researchItem, setResearchItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showSuccess, setShowSuccess] = useState(false);
    const [saving, setSaving] = useState(false);
    const [updateError, setUpdateError] = useState('');
    
    // --- FILE STATES ---
    const [existingFiles, setExistingFiles] = useState([]); 
    const [newFiles, setNewFiles] = useState([]);           
    const [filesToDelete, setFilesToDelete] = useState([]); 
    const [videoDemoUrl, setVideoDemoUrl] = useState('');

    // --- FORM STATES ---
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [authors, setAuthors] = useState('');
    const [year, setYear] = useState('');
    const [abstract, setAbstract] = useState('');
    const [keywords, setKeywords] = useState('');
    const [panelists, setPanelists] = useState('');
    const [course, setCourse] = useState('');

    const openEditModal = () => {
        setUpdateError('');
        setTitle(researchItem.title || '');
        setAuthors(researchItem.authors || '');
        setYear(researchItem.year || '');
        setAbstract(researchItem.abstract || '');
        setKeywords(researchItem.keywords || '');
        setPanelists(researchItem.panelists || '');
        setCourse(researchItem.course || '');
        setExistingFiles(researchItem.files || []);
        setNewFiles([]);
        setFilesToDelete([]);
        setVideoDemoUrl(researchItem.video_demo_url || '');
        setIsEditModalOpen(true);
    };

    const closeEditModal = () => setIsEditModalOpen(false);

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
                setVideoDemoUrl(data.video_demo_url || '');
                
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
        setUpdateError('');
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
        formData.append('video_demo_url', videoDemoUrl.trim());

        newFiles.forEach((file) => {
            formData.append('new_files', file);
        });

        try {
            const response = await axios.put(`${process.env.REACT_APP_API_URL}/home/detail/${id}/update/`, formData);
           
            setSaving(false);
            setResearchItem(response.data);
            setExistingFiles(response.data.files || []);
            setIsEditModalOpen(false);
            setShowSuccess(true);
            
        } catch (err) {
            setSaving(false);
            console.error(err);
            const serverMessage = err.response?.data && typeof err.response.data === 'object'
                ? Object.values(err.response.data).flat().join(' ')
                : '';
            setUpdateError(serverMessage || 'We could not save the changes. Please check your connection and try again.');
        }
    };

    const handleCloseSuccess = () => {
        setShowSuccess(false);
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
                        <button className='edit-details' onClick={openEditModal}>Edit details</button>
                    )}

                    <p><strong>Author(s):</strong> {researchItem.authors}</p>
                    <p><strong>Year:</strong> {researchItem.year}</p>
                    <p className='details-abstract'><strong>Abstract:</strong> {researchItem.abstract}</p>
                    <p><strong>Panelists:</strong> {researchItem.panelists || "No panelists specified"}</p>
                    <p><strong>Keywords:</strong> {researchItem.keywords || "No keywords specified"}</p>

                    {researchItem.video_demo_url && getYouTubeEmbedUrl(researchItem.video_demo_url) && (
                        <section className='video-section'>
                            <strong>Thesis Video Demo Link</strong>
                            <div className='video-frame'>
                                <iframe src={getYouTubeEmbedUrl(researchItem.video_demo_url)} title={`${researchItem.title} video demonstration`} allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture' allowFullScreen />
                            </div>
                            <a className='youtube-link' href={researchItem.video_demo_url} target='_blank' rel='noreferrer'>Watch on YouTube</a>
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
                    <div className="modal-container edit-modal-container">
                        <button type="button" className="close-modal" onClick={closeEditModal} aria-label="Close edit research details">&times;</button>
                        
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
                                <p className='field-help'>Add keywords separated by commas. Drag the corner to resize.</p>
                                <textarea className="keyword-editor" rows={4} value={keywords} onChange={(e) => setKeywords(e.target.value)} />
                            </div>

                            <div className='form-input'>
                                <label>Abstract</label>
                                <p className='field-help'>Drag the lower-right corner to make the writing area taller.</p>
                                <textarea className="abstract-editor" rows={10} value={abstract} onChange={(e) => setAbstract(e.target.value)} required />
                                <span className="character-count">{abstract.length.toLocaleString()} characters</span>
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
                                <label htmlFor='editVideoDemoUrl'>Thesis Video Demo Link <span className='optional-label'>Optional</span></label>
                                <p className='field-help'>Paste an Unlisted YouTube or youtu.be link. Clear the field to remove the current video.</p>
                                <input id='editVideoDemoUrl' type='url' placeholder='https://www.youtube.com/watch?v=...' value={videoDemoUrl} onChange={(event) => setVideoDemoUrl(event.target.value)} />
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

                            <div className="edit-modal-actions">
                                {updateError && <p className="edit-error-message" role="alert">{updateError}</p>}
                                <button type='button' className='cancel-edit-btn' onClick={closeEditModal}>Cancel</button>
                                <button type='submit' className='submit-btn'>Save changes</button>
                            </div>
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
