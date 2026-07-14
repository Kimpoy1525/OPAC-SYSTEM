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
      setSelectedId(remaining[0]?.id || null);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to update this proposal.');
    } finally {
      setReviewing(false);
    }
  };

  return (
    <main className="approval-page">
      <Header setUser={setUser} user={user} />
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
          {proposals.map((proposal) => (
            <button
              key={proposal.id}
              className={`queue-item ${proposal.id === selectedId ? 'selected' : ''}`}
              onClick={() => setSelectedId(proposal.id)}
            >
              <strong>Pending Review</strong>
              <span>Student # {String(proposal.student_id).padStart(7, '0')}</span>
            </button>
          ))}
          {!loading && !proposals.length && <p className="queue-empty">No pending reviews</p>}
        </aside>
      </div>
    </main>
  );
};

export default AdminApproval;
