import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FiList, FiClock, FiCheckCircle, FiXCircle, FiEye } from 'react-icons/fi';
import Header from '../Header/header';
import './adminApproval.css';

const AdminApproval = ({ setUser, user }) => {
  const [view, setView] = useState('queue'); // 'queue' | 'history'
  const [proposals, setProposals] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [historyFilter, setHistoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [historyDetail, setHistoryDetail] = useState(null);

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/accounts/reservations/approval-queue/`, { withCredentials: true })
      .then(({ data }) => {
        const queue = Array.isArray(data?.reservations) ? data.reservations : [];
        setProposals(queue);
        setSelectedId(queue[0]?.id || null);
      })
      .catch((requestError) => setError(requestError.response?.data?.error || 'Unable to load the approval queue.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (view !== 'history') return;
    axios.get(`${process.env.REACT_APP_API_URL}/api/accounts/reservations/history/`, { withCredentials: true })
      .then(({ data }) => setHistory(Array.isArray(data?.reservations) ? data.reservations : []))
      .catch((requestError) => setError(requestError.response?.data?.error || 'Unable to load the submission history.'));
  }, [view]);

  const selected = proposals.find((proposal) => proposal.id === selectedId) || null;
  const filteredProposals = courseFilter ? proposals.filter((proposal) => proposal.course === courseFilter) : proposals;
  const courseCounts = ['BSCS', 'BSIT', 'BSEMC'].reduce((counts, course) => ({ ...counts, [course]: proposals.filter((proposal) => proposal.course === course).length }), {});

  const statusCounts = {
    PENDING: history.filter((r) => r.status === 'PENDING').length,
    APPROVED: history.filter((r) => r.status === 'APPROVED').length,
    REJECTED: history.filter((r) => r.status === 'REJECTED').length,
  };

  const filteredHistory = historyFilter ? history.filter((reservation) => reservation.status === historyFilter) : history;

  const changeCourseFilter = (course) => {
    setCourseFilter(course);
    const filtered = course ? proposals.filter((proposal) => proposal.course === course) : proposals;
    setSelectedId(filtered[0]?.id || null);
  };

  const review = async (status) => {
    if (!selected || reviewing) return;
    setReviewing(true);
    setError('');
    try {
      await axios.patch(
        `${process.env.REACT_APP_API_URL}/api/accounts/reservations/${selected.id}/review/`,
        { status },
        { withCredentials: true }
      );
      const remaining = proposals.filter((proposal) => proposal.id !== selected.id);
      setProposals(remaining);
      const remainingFiltered = courseFilter ? remaining.filter((proposal) => proposal.course === courseFilter) : remaining;
      setSelectedId(remainingFiltered[0]?.id || null);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to update this proposal.');
    } finally {
      setReviewing(false);
    }
  };

  return (
    <main className="approval-page">
      <Header setUser={setUser} user={user} />
      <section className="dashboard-summary">
        <div><p>Proposal Management</p><h1>Title Reservation Dashboard</h1><span>Review and manage student title submissions.</span></div>
        <div className="dashboard-metrics">
          <article><strong>{proposals.length}</strong><span>Pending</span></article>
          {['BSCS', 'BSIT', 'BSEMC'].map((course) => <article key={course}><strong>{courseCounts[course]}</strong><span>{course}</span></article>)}
        </div>
      </section>

      <div className="approval-tabs">
        <button className={`approval-tab ${view === 'queue' ? 'active' : ''}`} onClick={() => setView('queue')}>
          <FiList aria-hidden="true" /> Approval Queue
        </button>
        <button className={`approval-tab ${view === 'history' ? 'active' : ''}`} onClick={() => setView('history')}>
          <FiClock aria-hidden="true" /> Submission History
        </button>
      </div>

      {view === 'queue' ? (
      <div className="approval-layout">
        <section className="proposal-card">
          {selected ? (
            <>
              <div className="proposal-header">
                <div>
                  <h1>Student Proposal</h1>
                  <p>Student # {String(selected.student_id).padStart(7, '0')}</p>
                  <p className="proposal-email">{selected.student_email}</p>
                </div>
                <span className="student-chip"><i />{selected.student_name}</span>
              </div>
              <div className="proposal-body">
                <h2>Title Name</h2>
                <h3>{selected.title}</h3>
                <div className="proposal-academic-info">
                  <div><span>Course</span><strong>{selected.course_label || selected.course}</strong></div>
                  <div><span>Section</span><strong>{selected.section}</strong></div>
                </div>
                <h2>Overview / Objectives</h2>
                <p className="proposal-overview">{selected.overview}</p>
                <h2>Group Members (Full Name)</h2>
                <div className="member-list">
                  {selected.group_members.split(/[,\n]/).filter(Boolean).map((member) => (
                    <span className="member-chip" key={member.trim()}><i />{member.trim()}</span>
                  ))}
                </div>
                {error && <p className="approval-error" role="alert">{error}</p>}
                <div className="approval-actions">
                  <button className="approve-button" disabled={reviewing} onClick={() => review('APPROVED')}>Approve</button>
                  <button className="reject-button" disabled={reviewing} onClick={() => review('REJECTED')}>Reject</button>
                </div>
              </div>
            </>
          ) : (
            <div className="proposal-empty">
              <h1>{loading ? 'Loading proposals...' : 'Approval queue is clear'}</h1>
              <p>{error || (!loading && 'There are no student proposals waiting for review.')}</p>
            </div>
          )}
        </section>

        <aside className="approval-queue">
          <h2><FiList aria-hidden="true" /> My Approval Queue</h2>
          <label className="queue-filter">Filter by course
            <select value={courseFilter} onChange={(event) => changeCourseFilter(event.target.value)}>
              <option value="">All courses</option><option value="BSCS">BSCS</option><option value="BSIT">BSIT</option><option value="BSEMC">BSEMC</option>
            </select>
          </label>
          {filteredProposals.map((proposal) => (
            <button
              key={proposal.id}
              className={`queue-item ${proposal.id === selectedId ? 'selected' : ''}`}
              onClick={() => setSelectedId(proposal.id)}
            >
              <strong>Pending Review</strong>
              <span>{proposal.course} · Student # {String(proposal.student_id).padStart(7, '0')}</span>
              <small>{proposal.title}</small>
              <em className="queue-email">{proposal.student_email}</em>
            </button>
          ))}
          {!loading && !filteredProposals.length && <p className="queue-empty">No pending reviews for this course</p>}
        </aside>
      </div>
      ) : (
        <section className="history-section">
          <div className="history-header">
            <h2><FiClock aria-hidden="true" /> Submission History</h2>
            <div className="history-metrics">
              <article className="history-metric pending"><FiClock /><strong>{statusCounts.PENDING}</strong><span>Pending</span></article>
              <article className="history-metric approved"><FiCheckCircle /><strong>{statusCounts.APPROVED}</strong><span>Approved</span></article>
              <article className="history-metric rejected"><FiXCircle /><strong>{statusCounts.REJECTED}</strong><span>Rejected</span></article>
            </div>
          </div>

          <label className="queue-filter history-filter">Filter by status
            <select value={historyFilter} onChange={(event) => setHistoryFilter(event.target.value)}>
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </label>

          {filteredHistory.length ? (
            <div className="history-table-wrap">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Title</th>
                    <th>Student</th>
                    <th>Course</th>
                    <th>Section</th>
                    <th>Submitted</th>
                    <th>Reviewed By</th>
                    <th>Reviewed At</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((reservation) => (
                    <tr key={reservation.id}>
                      <td><span className={`history-status status-${reservation.status.toLowerCase()}`}>{reservation.status_label}</span></td>
                      <td title={reservation.title}>{reservation.title}</td>
                      <td>
                        <strong>{reservation.student_name}</strong>
                        <small className="history-email">{reservation.student_email}</small>
                      </td>
                      <td>{reservation.course}</td>
                      <td>{reservation.section}</td>
                      <td>{reservation.created_at ? new Date(reservation.created_at).toLocaleString() : '—'}</td>
                      <td>{reservation.reviewed_by_name || '—'}</td>
                      <td>{reservation.reviewed_at ? new Date(reservation.reviewed_at).toLocaleString() : '—'}</td>
                      <td>
                        <button type="button" className="history-view-btn" onClick={() => setHistoryDetail(reservation)}>
                          <FiEye aria-hidden="true" /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="proposal-empty history-empty">
              <h1>{loading ? 'Loading history...' : 'No submissions found'}</h1>
              <p>{error || (!loading && 'There are no student title submissions matching this filter.')}</p>
            </div>
          )}
        </section>
      )}

      {/* --- HISTORY DETAIL MODAL --- */}
      {historyDetail && (
        <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setHistoryDetail(null); }}>
          <div className="modal-container history-detail-modal">
            <button type="button" className="close-modal" onClick={() => setHistoryDetail(null)} aria-label="Close submission details">&times;</button>
            <h2 className="history-detail-heading">Submission Details</h2>

            <div className="history-detail-status-wrap">
              <span className={`history-status status-${historyDetail.status.toLowerCase()}`}>{historyDetail.status_label}</span>
            </div>

            <div className="history-detail-body">
              <h3>Title Name</h3>
              <p className="history-detail-title">{historyDetail.title}</p>

              <div className="proposal-academic-info">
                <div><span>Student</span><strong>{historyDetail.student_name}</strong></div>
                <div><span>Student Email</span><strong>{historyDetail.student_email}</strong></div>
                <div><span>Course</span><strong>{historyDetail.course_label || historyDetail.course}</strong></div>
                <div><span>Section</span><strong>{historyDetail.section}</strong></div>
              </div>

              <h3>Overview / Objectives</h3>
              <p className="proposal-overview">{historyDetail.overview}</p>

              <h3>Group Members (Full Name)</h3>
              <div className="member-list">
                {historyDetail.group_members.split(/[,\n]/).filter(Boolean).map((member) => (
                  <span className="member-chip" key={member.trim()}><i />{member.trim()}</span>
                ))}
              </div>

              <div className="history-detail-meta">
                <div><span>Submitted</span><strong>{historyDetail.created_at ? new Date(historyDetail.created_at).toLocaleString() : '—'}</strong></div>
                <div><span>Reviewed By</span><strong>{historyDetail.reviewed_by_name || '—'}</strong></div>
                <div><span>Reviewed At</span><strong>{historyDetail.reviewed_at ? new Date(historyDetail.reviewed_at).toLocaleString() : '—'}</strong></div>
              </div>
            </div>

            <div className="history-detail-actions">
              <button type="button" className="history-detail-close-btn" onClick={() => setHistoryDetail(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default AdminApproval;
