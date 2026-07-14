import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FiList } from 'react-icons/fi';
import Header from '../Header/header';
import './adminApproval.css';

const AdminApproval = ({ setUser, user }) => {
  const [proposals, setProposals] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState('');
  const [courseFilter, setCourseFilter] = useState('');

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

  const selected = proposals.find((proposal) => proposal.id === selectedId) || null;
  const filteredProposals = courseFilter ? proposals.filter((proposal) => proposal.course === courseFilter) : proposals;
  const courseCounts = ['BSCS', 'BSIT', 'BSEMC'].reduce((counts, course) => ({ ...counts, [course]: proposals.filter((proposal) => proposal.course === course).length }), {});

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
      <div className="approval-layout">
        <section className="proposal-card">
          {selected ? (
            <>
              <div className="proposal-header">
                <div>
                  <h1>Student Proposal</h1>
                  <p>Student # {String(selected.student_id).padStart(7, '0')}</p>
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
            </button>
          ))}
          {!loading && !filteredProposals.length && <p className="queue-empty">No pending reviews for this course</p>}
        </aside>
      </div>
    </main>
  );
};

export default AdminApproval;
