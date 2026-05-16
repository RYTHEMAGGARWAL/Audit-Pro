import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './Select.css';

const generateFinancialYears = () => {
  const today = new Date();
  const month = today.getMonth(); // 0 = Jan, 3 = April
  const year = today.getFullYear();
  // April se naya FY shuru hota hai India mein
  const currentFYStart = month >= 3 ? year : year - 1;
  const years = [];
  // 3 saal purane se 1 saal aage tak
  for (let i = currentFYStart - 3; i <= currentFYStart + 1; i++) {
    years.push(`${i}-${String(i + 1).slice(-2)}`);
  }
  return years;
};

const FINANCIAL_YEARS = generateFinancialYears();

export default function Select() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ company: '', financialYear: '', business: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.company || !form.financialYear || !form.business)
      return setError('Please select all fields');
    setError('');
    setLoading(true);
    try {
      await axios.post('/api/session/select', form);
      navigate('/dashboard', { state: form });
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="select-bg">
      <div className="select-header">
        <div className="s-logo">AuditPro</div>
        <div className="s-user">
          <span>{user?.name}</span>
          <span className={`role-tag ${user?.role}`}>{user?.role}</span>
          <button onClick={logout} className="logout-btn">Logout</button>
        </div>
      </div>

      <div className="select-container">
        <div className="select-card">
          <h2>Select Audit Context</h2>
          <p>Choose the company, financial year, and business to proceed</p>

          <form onSubmit={handleSubmit} className="select-form">
            {/* Company */}
            <div className="select-section">
              <label>Select Company</label>
              <div className="option-grid">
                {['NIIT','NLSL'].map(c => (
                  <div
                    key={c}
                    className={`option-card ${form.company === c ? 'active' : ''}`}
                    onClick={() => set('company', c)}
                  >
                    <div className="opt-icon">{c[0]}</div>
                    <span>{c}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Year */}
            <div className="select-section">
              <label>Financial Year</label>
              <div className="year-grid">
                {FINANCIAL_YEARS.map(y => (
                  <div
                    key={y}
                    className={`year-chip ${form.financialYear === y ? 'active' : ''}`}
                    onClick={() => set('financialYear', y)}
                  >
                    {y}
                  </div>
                ))}
              </div>
            </div>

            {/* Business */}
            <div className="select-section">
              <label>Business Type</label>
              <div className="option-grid">
                {['Financial','Privacy'].map(b => (
                  <div
                    key={b}
                    className={`option-card ${form.business === b ? 'active' : ''}`}
                    onClick={() => set('business', b)}
                  >
                    <div className="opt-icon">{b === 'Financial' ? '₹' : '🔒'}</div>
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            </div>

            {error && <div className="error-msg">⚠ {error}</div>}

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? <span className="spinner"></span> : 'Proceed →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
