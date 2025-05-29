import React, { useState, useEffect } from 'react';

const AddCourseModal = ({ open, onClose, onAdd, fetchAdviser }) => {
  const [name, setName] = useState('');
  const [section, setSection] = useState('');
  const [schoolYear, setSchoolYear] = useState('');
  const [adviser, setAdviser] = useState('');
  const [adviserLoading, setAdviserLoading] = useState(false);

  useEffect(() => {
    if (section) {
      setAdviserLoading(true);
      fetchAdviser(section)
        .then((result) => setAdviser(result || 'Not found'))
        .finally(() => setAdviserLoading(false));
    } else {
      setAdviser('');
    }
  }, [section, fetchAdviser]);

  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Add New Course</h2>
        <label>
          Course Name:
          <input value={name} onChange={e => setName(e.target.value)} />
        </label>
        <label>
          Section:
          <input value={section} onChange={e => setSection(e.target.value)} />
        </label>
        <label>
          School Year:
          <input value={schoolYear} onChange={e => setSchoolYear(e.target.value)} />
        </label>
        <label>
          Adviser:
          <div
            style={{
              background: '#f3f4f6',
              color: adviser === 'Not found' ? '#ef4444' : '#23235b',
              fontStyle: adviser === 'Not found' ? 'italic' : 'normal',
              border: '1.5px solid #d1d5db',
              borderRadius: '8px',
              padding: '0.5rem 0.8rem',
              minHeight: '2.2em',
              display: 'flex',
              alignItems: 'center',
              fontWeight: 600,
              fontSize: '1rem',
              userSelect: 'none',
              pointerEvents: 'none'
            }}
            aria-live="polite"
          >
            {adviserLoading
              ? <span style={{ color: '#6c47ff' }}>Loading…</span>
              : adviser
                ? adviser
                : <span style={{ color: '#bbb', fontStyle: 'italic' }}>Adviser will appear here</span>
            }
          </div>
        </label>
        <div className="modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button
            onClick={() => {
              onAdd({ name, section, schoolYear, adviser });
              setName('');
              setSection('');
              setSchoolYear('');
              setAdviser('');
            }}
            disabled={!name || !section || !schoolYear || !adviser || adviser === 'Not found'}
          >
            Add Course
          </button>
        </div>
      </div>
      <style jsx>{`
        .modal-backdrop {
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
          background: rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; z-index: 1000;
        }
        .modal {
          background: #fff; border-radius: 18px; padding: 2rem; min-width: 320px; box-shadow: 0 8px 32px rgba(80,80,120,0.18);
          display: flex; flex-direction: column; gap: 1rem;
        }
        .modal label { font-weight: 600; color: #23235b; display: flex; flex-direction: column; gap: 0.3rem; }
        .modal input { padding: 0.5rem 0.8rem; border-radius: 8px; border: 1.5px solid #d1d5db; font-size: 1rem; }
        .modal-actions { display: flex; gap: 1rem; justify-content: flex-end; }
        .modal-actions button {
          padding: 0.7rem 1.5rem; border-radius: 8px; border: none; font-weight: 700; font-size: 1rem; cursor: pointer;
        }
        .modal-actions button:last-child {
          background: linear-gradient(90deg, #6c47ff 60%, #8f5fff 100%); color: #fff;
        }
      `}</style>
    </div>
  );
};

export default AddCourseModal; 