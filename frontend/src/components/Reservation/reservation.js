import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FiCheckSquare } from 'react-icons/fi';
import Header from '../Header/header';
import LoadingOverlay from '../LoadingOverlay/loadingOverlay';
import './reservation.css';
import '../Upload/upload.css';

const MAX_ATTEMPTS = 3;
const MAX_MEMBERS = 4;

// Where a server-detected duplicate title lives (from the 409 response).
const DUPLICATE_SOURCE_LABELS = {
  repository: 'Repository (uploaded research)',
  pending: 'Pending Approval (Title Approval queue)',
  approved: 'Approved Title Reservation',
};

const Reservation = ({ setUser, user }) => {
  const [reservations, setReservations] = useState([]);
  const [form, setForm] = useState({ title: '', overview: '', keywords: '', members: '', course: '', section: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateSort, setDateSort] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewDetail, setViewDetail] = useState(null);
  const [duplicateInfo, setDuplicateInfo] = useState(null);

  // Only PENDING and APPROVED reservations consume an attempt.
  // REJECTED reservations are excluded, effectively refunding that attempt.
  const usedAttempts = reservations.filter(({ status }) => status !== 'REJECTED').length;
  const attemptsLeft = Math.max(0, MAX_ATTEMPTS - usedAttempts);
  const canSubmit = attemptsLeft > 0;

  // Review Progress list: status filter + title/overview/keywords search + newest/oldest sorting.
  const visibleReservations = reservations
    .filter((reservation) => statusFilter === 'ALL' || reservation.status === statusFilter)
    .filter((reservation) => {
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;
      const title = (reservation.title || '').toLowerCase();
      const overview = (reservation.overview || '').toLowerCase();
      const keywords = (reservation.keywords || '').toLowerCase();
      return title.includes(query) || overview.includes(query) || keywords.includes(query);
    })
    .slice()
    .sort((a, b) => {
      const diff = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      return dateSort === 'oldest' ? diff : -diff;
    });

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/accounts/reservations/`, { withCredentials: true })
      .then(({ data }) => setReservations(Array.isArray(data?.reservations) ? data.reservations : []))
      .catch(() => setMessage('Unable to load your reservations. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingOverlay message="Loading your reservations..." />;

  const handleChange = ({ target: { name, value } }) => {
    setForm((current) => ({ ...current, [name]: value }));
    setMessage('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setMessage('');

    const members = form.members.split(',').map((member) => member.trim()).filter(Boolean);
    if (members.length > MAX_MEMBERS) {
      setMessage('A group can have a maximum of four members, separated by commas.');
      return;
    }

    if (!canSubmit) {
      setMessage('You have used all your title reservation attempts.');
      return;
    }

    setShowConfirm(true);
  };

  const submitReservation = async () => {
    setShowConfirm(false);
    setSubmitting(true);
    const members = form.members.split(',').map((member) => member.trim()).filter(Boolean);
    try {
      const { data } = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/accounts/reservations/`,
        {
          title: form.title.trim(),
          overview: form.overview.trim(),
          keywords: form.keywords.trim(),
          group_members: members.join(', '),
          course: form.course,
          section: form.section.trim()
        },
        { withCredentials: true }
      );
      setReservations((current) => [data.reservation, ...current]);
      setForm({ title: '', overview: '', keywords: '', members: '', course: '', section: '' });
      setMessage('Your title reservation was submitted for review.');
    } catch (error) {
      const duplicate = error.response?.status === 409 ? error.response.data : null;
      if (duplicate && duplicate.similar_title) {
        // Show the similar-title popup instead of the inline message.
        setDuplicateInfo({ title: duplicate.similar_title, source: duplicate.similar_source || '' });
      } else {
        setMessage(error.response?.data?.error || 'Unable to submit your reservation.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="reservation-page">
      <Header setUser={setUser} user={user} />

      <div className="reservation-layout">
        <section className="reservation-card">
          <div className="reservation-card-header">
            <div>
              <h1>New Title Reservation</h1>
              <p>Requesting title approval for upcoming title defense.</p>
            </div>
            <span className="attempt-badge">
              {attemptsLeft > 0 ? `${attemptsLeft} ATTEMPT${attemptsLeft > 1 ? 'S' : ''} LEFT` : 'ALL ATTEMPTS USED'}
            </span>
          </div>

          <form className="reservation-form" onSubmit={handleSubmit}>
            <label htmlFor="reservation-title">Title Name</label>
            <input
              id="reservation-title"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Enter your first priority title..."
              required
              disabled={!canSubmit}
            />

            <label htmlFor="reservation-overview">Overview / Objectives</label>
            <textarea
              id="reservation-overview"
              name="overview"
              value={form.overview}
              onChange={handleChange}
              placeholder="Explain your title scope..."
              required
              disabled={!canSubmit}
            />

            <label htmlFor="reservation-keywords">Keywords</label>
            <textarea
              id="reservation-keywords"
              name="keywords"
              value={form.keywords}
              onChange={handleChange}
              placeholder="e.g. AI, Machine Learning, Database"
              required
              disabled={!canSubmit}
            />

            <label htmlFor="reservation-members">Group Members (Full Name)</label>
            <p className="reservation-field-help">Maximum of 4 members. Separate each full name with a comma.</p>
            <input
              id="reservation-members"
              name="members"
              value={form.members}
              onChange={handleChange}
              placeholder="Member 1, Member 2, Member 3, Member 4"
              required
              disabled={!canSubmit}
            />

            <div className="reservation-field-row">
              <div>
                <label htmlFor="reservation-course">Course</label>
                <select
                  id="reservation-course"
                  name="course"
                  value={form.course}
                  onChange={handleChange}
                  required
                  disabled={!canSubmit}
                >
                  <option value="" disabled>Select your course...</option>
                  <option value="BSCS">BS Computer Science</option>
                  <option value="BSIT">BS Information Technology</option>
                  <option value="BSEMC">BS Entertainment and Multimedia Computing</option>
                </select>
              </div>
              <div>
                <label htmlFor="reservation-section">Section</label>
                <input
                  id="reservation-section"
                  name="section"
                  value={form.section}
                  onChange={handleChange}
                  placeholder="e.g. 4Y1-1"
                  maxLength="50"
                  required
                  disabled={!canSubmit}
                />
              </div>
            </div>

            <button type="submit" disabled={!canSubmit || submitting}>
              {submitting ? 'Submitting...' : 'Submit Title Reservation'}
            </button>
            {message && <p className="reservation-message" role="status">{message}</p>}
          </form>
        </section>

        <aside className="review-card">
          <h2><FiCheckSquare aria-hidden="true" /> Review Progress</h2>
          <div className="review-filters">
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter reservations by status">
              <option value="ALL">All statuses</option>
              <option value="PENDING">Pending Approval</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <select value={dateSort} onChange={(event) => setDateSort(event.target.value)} aria-label="Sort reservations by date">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
          <div className="review-search-wrap">
            <label className="review-search-label" htmlFor="review-search">Search titles</label>
            <input
              id="review-search"
              name="searchQuery"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by title, keywords, or overview..."
              aria-label="Search review progress titles"
            />
          </div>
          {loading ? <div className="review-empty"><p>Loading reservations...</p></div> : visibleReservations.length ? visibleReservations.map((reservation, index) => (
            <article
              className="review-item review-item-clickable"
              key={reservation.id}
              role="button"
              tabIndex={0}
              onClick={() => setViewDetail(reservation)}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setViewDetail(reservation); } }}
            >
              <div>
                <strong>TITLE {index + 1}</strong>
                <p title={reservation.title}>{reservation.title}</p>
              </div>
              <span className={`status status-${reservation.status.toLowerCase()}`}>{reservation.status_label}</span>
            </article>
          )) : (
            <div className="review-empty">
              <p>{reservations.length ? 'No reservations match the selected filter.' : 'No title reservations yet.'}</p>
              <span>Your submitted titles will appear here.</span>
            </div>
          )}
        </aside>
      </div>

      {/* Confirmation modal - asks to verify details before final submit */}
      {showConfirm && !submitting && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="warning-icon" role="img" aria-label="Review your submission">⚠️</div>
            <h3>Confirm your submission</h3>
            <p>Have you made sure of the details? Review everything before you submit.</p>
            <div className="reservation-confirm-summary">
              <p><strong>Title:</strong> {form.title}</p>
              <p><strong>Overview / Objectives:</strong> {form.overview}</p>
              <p><strong>Keywords:</strong> {form.keywords}</p>
              <p><strong>Group Members:</strong> {form.members}</p>
              <p><strong>Course:</strong> {form.course} · <strong>Section:</strong> {form.section}</p>
            </div>
            <div className="modal-actions">
              <button type="button" className="modal-confirm-btn-new" onClick={submitReservation} disabled={submitting}>Submit</button>
              <button type="button" className="modal-cancel-btn" onClick={() => setShowConfirm(false)} disabled={submitting}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate-title popup (server-detected similar submission) */}
      {duplicateInfo && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="warning-icon" role="img" aria-label="Similar title detected">⚠️</div>
            <h3>Similar title detected</h3>
            <p>
              Your title is too similar to an existing submission:{' '}
              <strong className="duplicate-title-text">&quot;{duplicateInfo.title}&quot;</strong>
            </p>
            <p className="duplicate-source-row">
              Found in:{' '}
              <span className={`duplicate-source-badge source-${duplicateInfo.source || 'unknown'}`}>
                {DUPLICATE_SOURCE_LABELS[duplicateInfo.source] || 'Existing submission'}
              </span>
            </p>
            <p>Titles must be original. Please revise your title and submit again.</p>
            <div className="modal-actions">
              <button type="button" className="modal-cancel-btn" onClick={() => setDuplicateInfo(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Review Progress detail - shows what the student submitted for approval */}
      {viewDetail && (
        <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setViewDetail(null); }}>
          <div className="modal-content reservation-detail-modal">
            <span className={`status status-${viewDetail.status.toLowerCase()}`}>{viewDetail.status_label}</span>
            <h3>{viewDetail.title}</h3>
            <div className="reservation-confirm-summary">
              <p><strong>Overview / Objectives:</strong> {viewDetail.overview}</p>
              <p><strong>Keywords:</strong> {viewDetail.keywords}</p>
              <p><strong>Group Members:</strong> {viewDetail.group_members}</p>
              <p><strong>Course:</strong> {viewDetail.course} - <strong>Section:</strong> {viewDetail.section}</p>
              <p><strong>Submitted:</strong> {viewDetail.created_at ? new Date(viewDetail.created_at).toLocaleString() : '-'}</p>
              {viewDetail.reviewed_at && (
                <>
                  <p><strong>Reviewed:</strong> {new Date(viewDetail.reviewed_at).toLocaleString()}{viewDetail.reviewed_by_name ? ` by ${viewDetail.reviewed_by_name}` : ''}</p>
                  {viewDetail.review_comment && (
                    <p><strong>Comment:</strong> {viewDetail.review_comment}</p>
                  )}
                </>
              )}
            </div>
            <div className="modal-actions">
              <button type="button" className="modal-cancel-btn" onClick={() => setViewDetail(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {submitting && <LoadingOverlay message="Submitting your reservation..." />}
    </main>
  );
};

export default Reservation;
