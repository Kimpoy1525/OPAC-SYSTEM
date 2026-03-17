import { useState } from 'react';
import axios from 'axios';
import Header from '../Header/header';
import './upload.css';

const Upload = ({ setUser, user }) => {
    const [title, setTitle] = useState('');
    const [authors, setAuthors] = useState('');
    const [year, setYear] = useState('');
    const [abstract, setAbstract] = useState('');
    const [keywords, setKeywords] = useState(''); 
    const [panelists, setPanelists] = useState('');
    const [course, setCourse] = useState(''); 
    const [files, setFiles] = useState([]); 
    const [fileLabel, setFileLabel] = useState('No files chosen');
    const [showSuccess, setShowSuccess] = useState(false);
    // 1. Updated: Append files one-by-one or in groups
    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        const allowedExtensions = ['pdf', 'docx', 'doc'];
        
        const validFiles = selectedFiles.filter(file => {
            const extension = file.name.split('.').pop().toLowerCase();
            return allowedExtensions.includes(extension);
        });

        if (validFiles.length !== selectedFiles.length) {
            alert("Some files were rejected. Only PDF, DOCX, and DOC files are allowed.");
        }

        if (validFiles.length > 0) {
            // Functional update to keep previous files and add new ones
            setFiles((prevFiles) => {
                const updatedFiles = [...prevFiles, ...validFiles];
                setFileLabel(`${updatedFiles.length} file(s) queued`);
                return updatedFiles;
            });
        }
    };

    // 2. Added: Function to remove a specific file from the queue
    const removeFile = (indexToRemove) => {
        setFiles((prevFiles) => {
            const updatedFiles = prevFiles.filter((_, index) => index !== indexToRemove);
            setFileLabel(updatedFiles.length === 0 ? 'No files chosen' : `${updatedFiles.length} file(s) queued`);
            return updatedFiles;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const currentYear = new Date().getFullYear();
        
        if (year < 2019 || year > currentYear) {
            alert(`Please enter a year between 2019 and ${currentYear}`);
            return;
        }

        if (!course) {
            alert("Please select a program (BSCS, BSIT, or BSEMC)");
            return;
        }

        const formData = new FormData();
        formData.append('title', title);
        formData.append('authors', authors);
        formData.append('year', year);
        formData.append('abstract', abstract);
        formData.append('keywords', keywords); 
        formData.append('panelists', panelists);
        formData.append('course', course);

        files.forEach((file) => {
            formData.append('files', file);
        });

        try {
            await axios.post('http://localhost:8000/home/upload/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setShowSuccess(true);
           
            
            setTitle(''); setAuthors(''); setYear(''); setAbstract('');
            setKeywords(''); setPanelists(''); setCourse('');
            setFiles([]); setFileLabel('No files chosen');
        } catch (err) {
            console.error(err.response?.data);
            alert("Upload failed. Check console for details.");
        }
    };

    return (
        <main>
            <Header setUser={setUser} user={user} />
            <div className='upload-page'>

                <form className='upload-form' onSubmit={handleSubmit}>
                    <h2 className='form-header'>Upload Thesis / Capstone</h2>

                    <div className='form-input'>
                        <label>Research Title</label>
                        <input type='text' placeholder='Enter research title' value={title} onChange={(e) => setTitle(e.target.value)} required />
                    </div>

                    <div className='form-input'>
                        <label>Author(s)</label>
                        <input type='text' placeholder='Enter author name(s)' value={authors} onChange={(e) => setAuthors(e.target.value)} required />
                    </div>

                    <div className='form-input'>
                        <label>Year (2019 - Present)</label>
                        <input type='number' placeholder='e.g. 2024' min="2019" max={new Date().getFullYear()} value={year} onChange={(e) => setYear(e.target.value)} required />
                    </div>

                    <div className='form-input'>
                        <label>Keywords</label>
                        <input type='text' placeholder='e.g. AI, React, Automation (comma separated)' value={keywords} onChange={(e) => setKeywords(e.target.value)} />
                    </div>

                    <div className='form-input'>
                        <label>Abstract / Description</label>
                        <textarea placeholder='Write the abstract here and include the video link if available...' rows={5} value={abstract} onChange={(e) => setAbstract(e.target.value)} required />
                    </div>

                    <div className='form-input'>
                        <label>Panelists</label>
                        <input type='text' placeholder='Enter panelist name(s)' value={panelists} onChange={(e) => setPanelists(e.target.value)} required />
                    </div>

                    <div className='form-input'>
                        <label>Upload Files (PDF, DOCX, DOC.)</label>
                        <div className='file-upload'>
                            <input type='file' id='fileUpload' accept='.pdf, .docx, .doc' onChange={handleFileChange} multiple hidden />
                            <label htmlFor='fileUpload' className='file-btn'>Choose Files</label>
                            <span className='file-name' style={{ color: fileLabel === 'No files chosen' ? 'gray' : 'black' }}>
                                {fileLabel}
                            </span>
                        </div>

                        {/* 3. NEW: Queued Files list display */}
                        {files.length > 0 && (
                            <div className="file-queue">
                                {files.map((file, index) => (
                                    <div key={index} className="queue-item">
                                        <span>{file.name}</span>
                                        <button type="button" onClick={() => removeFile(index)} className="remove-btn">✕</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className='select-program'>
                        {['BSCS', 'BSIT', 'BSEMC'].map((prog) => (
                            <button key={prog} type='button' className={`program-btn ${course === prog ? 'active' : ''}`} onClick={() => setCourse(prog)} style={{ backgroundColor: course === prog ? '#1a472a' : '' }}>
                                {prog}
                            </button>
                        ))}
                    </div>

                    <button type='submit' className='submit-btn'>SUBMIT</button>
                </form>
            </div>
            {showSuccess && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="success-icon">✔</div>
                        <h3>Upload Successful!</h3>
                        <p>Your research information has been added to the catalog.</p>
                        <button className="modal-close-btn" onClick={() => setShowSuccess(false)}>Great!</button>
                        </div></div>
            )}


        </main>
    );
}

export default Upload;