import React, { useEffect, useState } from 'react';
import { FaChevronDown, FaTrash } from 'react-icons/fa6';
import axios from 'axios';
import { Link, useSearchParams } from 'react-router-dom';
import Header from '../Header/header';
import Searchbar from '../SearchBar/searchbar';
import LoadingOverlay from '../LoadingOverlay/loadingOverlay';
import './repository.css';
import '../Upload/upload.css';

const Repository = ({ setUser, user }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const initialCourse = searchParams.get('course') || '';
  const initialYear = searchParams.get('year') || '';

  const [researches, setResearches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filterError, setFilterError] = useState('');
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [selectedCourse, setSelectedCourse] = useState(initialCourse);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [appliedFilters, setAppliedFilters] = useState({ year: initialYear, course: initialCourse, search: initialSearch });
  const [requestVersion, setRequestVersion] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const fetchResearches = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/home/all/`, { params: appliedFilters, signal: controller.signal });
        setResearches(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        if (error.code !== 'ERR_CANCELED') setLoadError('The repository could not be loaded. Please check your connection and try again.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchResearches();
    return () => controller.abort();
  }, [appliedFilters, requestVersion]);

  const applyFilters = (event) => {
    event?.preventDefault();
    const currentYear = new Date().getFullYear();
    if (selectedYear && (!/^\d{4}$/.test(selectedYear) || Number(selectedYear) < 2019 || Number(selectedYear) > currentYear)) {
      setFilterError(`Enter a year from 2019 to ${currentYear}.`);
      return;
    }
    setFilterError('');
    const next = { year: selectedYear, course: selectedCourse, search: searchQuery.trim() };
    setAppliedFilters(next);
    const urlParams = {};
    Object.entries(next).forEach(([key, value]) => value && (urlParams[key] = value));
    setSearchParams(urlParams, { replace: true });
  };

  const clearFilters = () => {
    setSelectedYear('');
    setSelectedCourse('');
    setSearchQuery('');
    setFilterError('');
    setAppliedFilters({ year: '', course: '', search: '' });
    setSearchParams({}, { replace: true });
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/home/detail/${itemToDelete.id}/delete/`);
      setResearches((current) => current.filter((item) => item.id !== itemToDelete.id));
      setShowDeleteConfirm(false);
      setShowDeleteSuccess(true);
    } catch {
      setLoadError('The record could not be deleted. Please try again.');
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main>
      <Header setUser={setUser} user={user} />
      <div className='repo-page'>
        <header className='repository-header'>
          <p className='repository-eyebrow'>OLFU CCS Research Repository</p>
          <h1>CCSTECHVAULT</h1>
          <p>Explore theses and capstone projects from the College of Computer Studies.</p>
        </header>

        <Searchbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} onSearch={applyFilters} loading={loading} />

        <form className='filter-container' onSubmit={applyFilters}>
          <div className='filter-select'>
            <label htmlFor='year-filter'>Publication year</label>
            <input id='year-filter' type='text' inputMode='numeric' pattern='[0-9]*' placeholder='e.g. 2024' value={selectedYear} onChange={(event) => setSelectedYear(event.target.value.replace(/\D/g, '').slice(0, 4))} maxLength={4} />
          </div>
          <div className='filter-select'>
            <label htmlFor='course-filter'>Program</label>
            <select id='course-filter' value={selectedCourse} onChange={(event) => setSelectedCourse(event.target.value)}>
              <option value=''>All Programs</option><option value='BSCS'>BSCS</option><option value='BSIT'>BSIT</option><option value='BSEMC'>BSEMC</option>
            </select>
            <FaChevronDown className='dropdown-arrow' aria-hidden='true' />
          </div>
          <div className='filter-actions'>
            <button className='apply-filter-btn' type='submit' disabled={loading}>Apply filters</button>
            <button className='clear-filter-btn' type='button' onClick={clearFilters} disabled={loading}>Clear</button>
          </div>
          {filterError && <p className='filter-error' role='alert'>{filterError}</p>}
        </form>

        <section className='filter-results' aria-live='polite'>
          {loading ? (
            <div className='repository-state' role='status'><span className='repository-spinner' /><strong>Loading repository</strong><p>This should only take a moment.</p></div>
          ) : loadError ? (
            <div className='repository-state repository-error' role='alert'><strong>Unable to load research papers</strong><p>{loadError}</p><button type='button' onClick={() => setRequestVersion((value) => value + 1)}>Try again</button></div>
          ) : researches.length ? (
            <>
              <p className='results-count'>{researches.length} research {researches.length === 1 ? 'record' : 'records'} found</p>
              {researches.map((research) => (
                <article key={research.id} className='research-card'>
                  {(user?.role === 'ADMIN' || user?.role === 'SUPERADMIN') && <button className='card-delete-btn' onClick={() => { setItemToDelete({ id: research.id, title: research.title }); setShowDeleteConfirm(true); }} title='Delete research' aria-label={`Delete ${research.title}`}><FaTrash /></button>}
                  <h2>{research.title}</h2>
                  <p><span className='labels'>Author(s):</span> {research.authors}</p>
                  <p><span className='labels'>Year:</span> {research.year}</p>
                  {research.keywords && <p><span className='labels'>Keywords:</span> {research.keywords}</p>}
                  <p className='abstract'>{(research.abstract || 'No abstract available.').substring(0, 250)}{research.abstract?.length > 250 ? '…' : ''}</p>
                  <div className='research-card-footer'><div className='detail-below'><span className='card-program'>{research.course}</span><span>{research.files?.length || 0} Document(s)</span></div><Link to={`/details/${research.id}`} className='details-btn'>View details</Link></div>
                </article>
              ))}
            </>
          ) : (
            <div className='repository-state'><strong>No matching research found</strong><p>Try a broader keyword or clear one of your filters.</p><button type='button' onClick={clearFilters}>Clear all filters</button></div>
          )}
        </section>
      </div>

      {deleting && <LoadingOverlay message='Deleting record...' />}
      {showDeleteConfirm && !deleting && <div className='modal-overlay'><div className='modal-content'><div className='success-icon' style={{ color: '#d9534f' }}><FaTrash /></div><h3>Confirm deletion</h3><p>Delete <strong>“{itemToDelete?.title}”</strong>? This action cannot be undone.</p><div className='modal-actions'><button className='modal-confirm-btn' onClick={handleConfirmDelete}>Delete</button><button className='modal-cancel-btn' onClick={() => setShowDeleteConfirm(false)}>Cancel</button></div></div></div>}
      {showDeleteSuccess && <div className='modal-overlay'><div className='modal-content'><div className='success-icon'>✓</div><h3>Record deleted</h3><p>The research record has been permanently removed.</p><button className='modal-close-btn' onClick={() => setShowDeleteSuccess(false)}>Dismiss</button></div></div>}
    </main>
  );
};

export default Repository;
