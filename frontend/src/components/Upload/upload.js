import { useState } from 'react';
import axios from 'axios';
import Header from '../Header/header';
import LoadingOverlay from '../LoadingOverlay/loadingOverlay';
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
    const [videoDemoUrl, setVideoDemoUrl] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [uploading, setUploading] = useState(false);

    // CSV upload states
    const [csvFile, setCsvFile] = useState(null);
    const [csvLabel, setCsvLabel] = useState('No CSV chosen');
    const [csvUploading, setCsvUploading] = useState(false);
    const [csvResults, setCsvResults] = useState(null);
    const [showCsvConfirm, setShowCsvConfirm] = useState(false);
    const [pendingCsvUpload, setPendingCsvUpload] = useState(null);
    const [duplicateInfo, setDuplicateInfo] = useState(null);

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
            setFiles((prevFiles) => {
                const updatedFiles = [...prevFiles, ...validFiles];
                setFileLabel(`${updatedFiles.length} file(s) queued`);
                return updatedFiles;
            });
        }
    };

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

        setUploading(true);

        const formData = new FormData();
        formData.append('title', title);
        formData.append('authors', authors);
        formData.append('year', year);
        formData.append('abstract', abstract);
        formData.append('keywords', keywords); 
        formData.append('panelists', panelists);
        formData.append('course', course);
        formData.append('video_demo_url', videoDemoUrl.trim());

        files.forEach((file) => {
            formData.append('files', file);
        });

        try {
            await axios.post(`${process.env.REACT_APP_API_URL}/home/upload/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setUploading(false);
            setShowSuccess(true);
           
            setTitle(''); setAuthors(''); setYear(''); setAbstract('');
            setKeywords(''); setPanelists(''); setCourse('');
            setFiles([]); setFileLabel('No files chosen');
            setVideoDemoUrl('');
        } catch (err) {
            setUploading(false);
            console.error(err.response?.data);
            alert("Upload failed. Check console for details.");
        }
    };

    // --- CSV UPLOAD HANDLERS ---
    const handleCsvFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setCsvFile(file);
            setCsvLabel(file.name);
            setCsvResults(null);
        }
    };

    const extractCsvResult = (responseData) => {
        if (responseData && (responseData.success_count !== undefined || responseData.results)) {
            return {
                success_count: responseData.success_count || 0,
                error_count: responseData.error_count || 0,
                skipped_count: responseData.skipped_count || 0,
                results: responseData.results || [],
            };
        }
        return null;
    };

    const handleCsvUpload = async () => {
        if (!csvFile) {
            alert("Please select a CSV file first.");
            return;
        }

        setCsvUploading(true);
        setCsvResults(null);

        const formData = new FormData();
        formData.append('csv_file', csvFile);

        try {
            const res = await axios.post(`${process.env.REACT_APP_API_URL}/home/upload-csv/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data.requires_confirmation) {
                setCsvUploading(false);
                setDuplicateInfo({
                    duplicate_count: res.data.duplicate_count,
                    total_rows: res.data.total_rows,
                    duplicate_titles: res.data.duplicate_titles,
                });
                setPendingCsvUpload(csvFile);
                setShowCsvConfirm(true);
                return;
            }

            setCsvUploading(false);
            const result = extractCsvResult(res.data);
            setCsvResults(result || { success_count: 0, error_count: 0, results: [] });
        } catch (err) {
            setCsvUploading(false);
            const result = extractCsvResult(err.response?.data);
            if (result) {
                setCsvResults(result);
            } else {
                setCsvResults({
                    success_count: 0,
                    error_count: 0,
                    error: err.response?.data?.error || "CSV upload failed. Check console for details.",
                    results: [],
                });
            }
        }
    };

    const doCsvUpload = async (extraField, extraValue) => {
        setShowCsvConfirm(false);
        setCsvUploading(true);
        setCsvResults(null);

        const formData = new FormData();
        formData.append('csv_file', pendingCsvUpload);
        formData.append(extraField, extraValue);

        try {
            const res = await axios.post(`${process.env.REACT_APP_API_URL}/home/upload-csv/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setCsvUploading(false);
            setCsvResults(extractCsvResult(res.data));
        } catch (err) {
            setCsvUploading(false);
            const result = extractCsvResult(err.response?.data);
            if (result) {
                setCsvResults(result);
            } else {
                setCsvResults({
                    success_count: 0,
                    error_count: 0,
                    error: err.response?.data?.error || "CSV upload failed.",
                    results: [],
                });
            }
        } finally {
            setPendingCsvUpload(null);
            setDuplicateInfo(null);
        }
    };

    const handleConfirmCsvUploadAll = () => doCsvUpload('force', 'true');
    const handleConfirmCsvUploadNewOnly = () => doCsvUpload('skip_duplicates', 'true');

    const handleCancelCsvConfirm = () => {
        setShowCsvConfirm(false);
        setPendingCsvUpload(null);
        setDuplicateInfo(null);
    };

    return (
        <main>
            <Header setUser={setUser} user={user} />
            <div className='upload-page'>

                {/* --- MANUAL UPLOAD FORM --- */}
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
                        <textarea placeholder='Write the research abstract here...' rows={5} value={abstract} onChange={(e) => setAbstract(e.target.value)} required />
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

                    <div className='form-input'>
                        <label htmlFor='videoDemoUrl'>Thesis Video Demo Link <span className='optional-label'>Optional</span></label>
                        <p className='field-help'>Upload the demonstration to YouTube as Unlisted, then paste its YouTube or youtu.be link here.</p>
                        <input id='videoDemoUrl' type='url' placeholder='https://www.youtube.com/watch?v=...' value={videoDemoUrl} onChange={(event) => setVideoDemoUrl(event.target.value)} />
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

                {/* --- DIVIDER --- */}
                <div className="csv-divider">
                    <span>OR</span>
                </div>

                {/* --- CSV BULK IMPORT SECTION --- */}
                <div className="csv-upload-section">
                    <h2 className='form-header'>Bulk Import via CSV</h2>
                    <p className="csv-info">
                        Upload a CSV file with columns: <strong>title, author(s), year, abstract, course, panelist(s)</strong>.
                        Optional: <strong>keywords</strong>.
                    </p>

                    <div className='form-input'>
                        <label>CSV File</label>
                        <div className='file-upload'>
                            <input type='file' id='csvUpload' accept='.csv' onChange={handleCsvFileChange} hidden />
                            <label htmlFor='csvUpload' className='file-btn'>Choose CSV</label>
                            <span className='file-name' style={{ color: csvLabel === 'No CSV chosen' ? 'gray' : 'black' }}>
                                {csvLabel}
                            </span>
                        </div>
                    </div>

                    <button 
                        type='button' 
                        className='submit-btn csv-upload-btn' 
                        onClick={handleCsvUpload}
                        disabled={csvUploading}
                    >
                        {csvUploading ? 'Uploading...' : 'Upload CSV'}
                    </button>

                    {csvResults && (
                        <div className="csv-results">
                            {csvResults.error ? (
                                <div className="csv-error-message">
                                    <strong>Error:</strong> {csvResults.error}
                                </div>
                            ) : (
                                <>
                                    <div className="csv-summary">
                                        <span className="csv-success-count">✅ {csvResults.success_count} imported</span>
                                        {csvResults.skipped_count > 0 && (
                                            <span className="csv-skipped-count">⏭️ {csvResults.skipped_count} skipped (duplicates)</span>
                                        )}
                                        {csvResults.error_count > 0 && (
                                            <span className="csv-error-count">❌ {csvResults.error_count} errors</span>
                                        )}
                                    </div>
                                    {csvResults.results && csvResults.results.length > 0 && (
                                        <div className="csv-result-list">
                                            {csvResults.results.map((r, i) => (
                                                <div key={i} className={`csv-result-row ${r.status}`}>
                                                    <span className="csv-result-status">
                                                        {r.status === 'success' ? '✅' : '❌'}
                                                    </span>
                                                    <span className="csv-result-text">
                                                        <strong>Row {r.row}:</strong> {r.title || '(no title)'}
                                                        {r.status === 'error' && <span className="csv-result-error"> — {r.message}</span>}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

            </div>

            {/* Loading overlays */}
            {uploading && <LoadingOverlay message="Uploading research..." />}
            {csvUploading && <LoadingOverlay message="Importing CSV data..." />}

            {/* Duplicate Confirmation Modal */}
            {showCsvConfirm && duplicateInfo && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="warning-icon">⚠️</div>
                        <h3>Duplicates Found</h3>
                        <p>
                            <strong>{duplicateInfo.duplicate_count}</strong> of <strong>{duplicateInfo.total_rows}</strong> titles already exist in the database.
                        </p>
                        <div className="duplicate-list">
                            {duplicateInfo.duplicate_titles.map((title, i) => (
                                <div key={i} className="duplicate-item">📄 {title}</div>
                            ))}
                        </div>
                        <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
                            How would you like to proceed?
                        </p>
                        <div className="modal-actions modal-actions-three">
                            <button className="modal-cancel-btn" onClick={handleCancelCsvConfirm}>Cancel</button>
                            <button className="modal-confirm-btn-new" onClick={handleConfirmCsvUploadNewOnly}>Upload New Only</button>
                            <button className="modal-confirm-btn" onClick={handleConfirmCsvUploadAll}>Upload All</button>
                        </div>
                    </div>
                </div>
            )}

            {showSuccess && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="success-icon">✔</div>
                        <h3>Upload Successful!</h3>
                        <p>Your research information has been added.</p>
                        <button className="modal-close-btn" onClick={() => setShowSuccess(false)}>Great!</button>
                    </div>
                </div>
            )}

        </main>
    );
}

export default Upload;
