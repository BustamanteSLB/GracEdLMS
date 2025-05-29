import React from 'react';
import './CourseCard.css';

const CourseCard = ({
  title,
  code,
  section,
  schoolYear,
  adviser,
  details,
  onEdit,
  onAddStudent,
  onDelete,
}) => (
  <div className="modern-premium">
    <div className="premium-avatar">
      <svg width="56" height="56" viewBox="0 0 48 48" fill="none">
        <rect width="48" height="48" rx="24" fill="#6c47ff"/>
        <path d="M16 34V32C16 29.7909 17.7909 28 20 28H28C30.2091 28 32 29.7909 32 32V34" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="24" cy="20" r="6" fill="#fff"/>
      </svg>
    </div>
    <div className="premium-header">
      <h2>{title}</h2>
      <span className="premium-code">{code}</span>
    </div>
    <div className="premium-divider" />
    <div className="premium-body">
      <div><span className="label">Section:</span> {section || <span className="placeholder">—</span>}</div>
      <div><span className="label">School Year:</span> {schoolYear || <span className="placeholder">—</span>}</div>
      <div><span className="label">Adviser:</span> {adviser || <span className="placeholder">—</span>}</div>
      {details ? <div className="premium-details">{details}</div> : null}
    </div>
    <div className="premium-actions">
      <button className="premium-btn edit" onClick={onEdit}>Edit</button>
      <button className="premium-btn add" onClick={onAddStudent}>Add Student</button>
      <button className="premium-btn delete" onClick={onDelete}>Delete</button>
    </div>
  </div>
);

export default CourseCard;