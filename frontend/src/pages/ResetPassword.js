import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

// ✅ Same policy as backend
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+=])[A-Za-z\d@$!%*?&#^()_\-+=]{8,}$/;

const policyChecks = [
  { label: 'Minimum 8 characters',              test: (p) => p.length >= 8 },
  { label: 'One uppercase letter (A-Z)',         test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter (a-z)',         test: (p) => /[a-z]/.test(p) },
  { label: 'One number (0-9)',                   test: (p) => /\d/.test(p) },
  { label: 'One special character (@$!%*?&…)',   test: (p) => /[@$!%*?&#^()_\-+=]/.test(p) },
];

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [msg, setMsg]             = useState('');
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);

  const allPassed = PASSWORD_REGEX.test(password);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!allPassed) {
      setMsg('Password policy requirements poori nahi hui hain.');
      return;
    }
    if (password !== confirm) {
      setMsg('Passwords match nahi kar rahe!');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`/api/auth/reset-password/${token}`, { password });
      setDone(true);
    } catch (err) {
      setMsg(err.response?.data?.message || 'Error resetting password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-icon">A</div>
          <h1>AuditPro</h1>
          <p>Reset your password</p>
        </div>

        {done ? (
          <div className="fp-success">
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
            <h3>Password Reset!</h3>
            <p>Your password has been updated successfully.</p>
            <button className="login-btn" style={{ marginTop: '20px' }} onClick={() => navigate('/login')}>
              Go to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label>New Password</label>
              <div className="pass-wrap">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setMsg(''); }}
                  required
                />
                <button type="button" className="pass-toggle" onClick={() => setShowPass(!showPass)}>
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {/* ✅ Live password policy checklist */}
            {password.length > 0 && (
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}>
                {policyChecks.map(({ label, test }) => {
                  const ok = test(password);
                  return (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                      <span style={{ color: ok ? '#10b981' : '#ef4444', fontSize: '14px' }}>
                        {ok ? '✓' : '✗'}
                      </span>
                      <span style={{ color: ok ? '#10b981' : '#64748b' }}>{label}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                placeholder="Re-enter password"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setMsg(''); }}
                required
              />
              {/* ✅ Live match indicator */}
              {confirm.length > 0 && (
                <span style={{ fontSize: '12px', color: password === confirm ? '#10b981' : '#ef4444' }}>
                  {password === confirm ? '✓ Passwords match' : '✗ Passwords do not match'}
                </span>
              )}
            </div>

            {msg && <div className="error-msg">⚠ {msg}</div>}

            <button type="submit" className="login-btn" disabled={loading || !allPassed || password !== confirm}>
              {loading ? <span className="spinner"></span> : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}