import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FiCheckSquare } from 'react-icons/fi';
import Header from '../Header/header';
import './reservation.css';

const MAX_ATTEMPTS = 3;
const MAX_MEMBERS = 4;

const Reservation = ({ setUser, user }) => {
  const [reservations, setReservations] = useState([]);
  const [form, setForm] = useState({ title: '', overview: '', members: '', course: '', section: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const hasApprovedTitle = reservations.some(({ status }) => status === 'APPROVED');
  const hasPendingTitle = reservations.some(({ status }) => status === 'PENDING');
  const canStartNewCycle = reservations.length >= MAX_ATTEMPTS && !hasApprovedTitle && !hasPendingTitle;
  const canSubmit = !hasApprovedTitle && (reservations.length < MAX_ATTEMPTS || canStartNewCycle);

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/accounts/reservations/`, { withCredentials: true })
      .then(({ data }) => setReservations(Array.isArray(data?.reservations) ? data.reservations : []))
      .catch(() => setMessage('Unable to load your reservations. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = ({ target: { name, value } }) => {
    setForm((current) => ({ ...current, [name]: value }));
    setMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const members = form.members.split(',').map((member) => member.trim()).filter(Boolean);
    if (members.length > MAX_MEMBERS) {
      setMessage('A group can have a maximum of four members, separated by commas.');
      return;
    }

    if (!canSubmit) {
      setMessage(hasApprovedTitle
        ? 'Your group already has an approved title.'
        : 'Please wait for the review of your submitted titles.');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/accounts/reservations/`,
        {
          title: form.title.trim(),
          overview: form.overview.trim(),
          group_members: members.join(', '),
          course: form.course,
          section: form.section.trim()
        },
        { withCredentials: true }
      );
      setReservations((current) => [data.reservation, ...current]);
      setForm({ title: '', overview: '', members: '', course: '', section: '' });
      setMessage('Your title reservation was submitted for review.');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Unable to submit your reservation.');
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
              {canStartNewCycle ? 'NEW RESERVATION' : `ATTEMPT ${Math.min(reservations.length + 1, MAX_ATTEMPTS)} / ${MAX_ATTEMPTS}`}
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
          {loading ? <div className="review-empty"><p>Loading reservations...</p></div> : reservations.length ? reservations.map((reservation, index) => (
            <article className="review-item" key={reservation.id}>
              <div>
                <strong>TITLE {index + 1}</strong>
                <p title={reservation.title}>{reservation.title}</p>
              </div>
              <span className={`status status-${reservation.status.toLowerCase()}`}>{reservation.status_label}</span>
            </article>
          )) : (
            <div className="review-empty">
              <p>No title reservations yet.</p>
              <span>Your submitted titles will appear here.</span>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
};

export default Reservation;
