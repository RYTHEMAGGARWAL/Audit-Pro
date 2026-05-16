import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('login'); // 'login' | 'forgot'
  const [fpEmail, setFpEmail] = useState('');
  const [fpMsg, setFpMsg] = useState('');
  const [fpLoading, setFpLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === 'admin') navigate('/admin');
      else navigate('/select');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setFpLoading(true);
    setFpMsg('');
    try {
      await axios.post('/api/auth/forgot-password', { email: fpEmail });
      setFpMsg('success');
    } catch (err) {
      setFpMsg(err.response?.data?.message || 'Error sending mail');
    } finally {
      setFpLoading(false);
    }
  };

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-icon">A</div>
          <h1>AuditPro</h1>
          <p>Internal Audit Management System</p>
        </div>

        {view === 'login' ? (
          <>
            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label>Email / Username</label>
<input
  type="text"  // ← email se text kar do
  placeholder="email ya username"
  value={email}
  onChange={e => setEmail(e.target.value)}
  required
/>
              </div>
              <div className="form-group">
                <label>Password</label>
                <div className="pass-wrap">
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button type="button" className="pass-toggle" onClick={() => setShowPass(!showPass)}>
                    {showPass ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              {error && <div className="error-msg">⚠ {error}</div>}

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? <span className="spinner"></span> : 'Sign In'}
              </button>
            </form>

            <button className="forgot-link" onClick={() => setView('forgot')}>
              Forgot Password?
            </button>

            <div className="login-footer">
              <div>
                <span className="badge admin">Admin</span>
                <span className="badge auditor">Auditor</span>
              </div>
              <p>Secure role-based access</p>
            </div>
          </>
        ) : (
          <>
            {fpMsg === 'success' ? (
              <div className="fp-success">
                <div style={{fontSize:'40px', marginBottom:'12px'}}>📧</div>
                <h3>Check your email!</h3>
                <p>Reset link sent to <strong>{fpEmail}</strong>. Valid for 30 minutes.</p>
                <button className="login-btn" style={{marginTop:'20px'}} onClick={() => { setView('login'); setFpMsg(''); }}>
                  Back to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgot} className="login-form">
                <h3 className="fp-title">Reset Password</h3>
                <p className="fp-sub">Enter your email — we'll send a reset link.</p>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" placeholder="you@company.com"
                    value={fpEmail} onChange={e => setFpEmail(e.target.value)} required />
                </div>
                {fpMsg && fpMsg !== 'success' && <div className="error-msg">⚠ {fpMsg}</div>}
                <button type="submit" className="login-btn" disabled={fpLoading}>
                  {fpLoading ? <span className="spinner"></span> : 'Send Reset Link'}
                </button>
                <button type="button" className="forgot-link" onClick={() => setView('login')}>
                  ← Back to Login
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}