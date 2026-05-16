import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setMsg('Passwords match nahi kar rahe!'); return; }
    if (password.length < 6) { setMsg('Password kam se kam 6 characters ka hona chahiye!'); return; }
    setLoading(true);
    try {
      await axios.post(`/api/auth/reset-password/${token}`, { password });
      setDone(true);
    } catch (err) {
      setMsg(err.response?.data?.message || 'Error resetting password');
    } finally { setLoading(false); }
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
            <div style={{fontSize:'40px', marginBottom:'12px'}}>✅</div>
            <h3>Password Reset!</h3>
            <p>Your password has been updated successfully.</p>
            <button className="login-btn" style={{marginTop:'20px'}} onClick={() => navigate('/login')}>
              Go to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label>New Password</label>
              <div className="pass-wrap">
                <input type={showPass ? 'text' : 'password'} placeholder="Min 6 characters"
                  value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="button" className="pass-toggle" onClick={() => setShowPass(!showPass)}>
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input type="password" placeholder="Re-enter password"
                value={confirm} onChange={e => setConfirm(e.target.value)} required />
            </div>
            {msg && <div className="error-msg">⚠ {msg}</div>}
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? <span className="spinner"></span> : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}