import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from '../api';  // ya path adjust karo
import './AdminPanel.css';

export default function AdminPanel() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [allObs, setAllObs] = useState([]);
  const [obsSearch, setObsSearch] = useState('');
  const [form, setForm] = useState({ firstName: '', lastName: '', username: '', email: '', password: '', role: 'auditor' });
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [newDate, setNewDate] = useState({});
  const [passInputs, setPassInputs] = useState({});
  const [showPass, setShowPass] = useState({});
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({});

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 3000);
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/admin/users');
      setUsers(res.data);
    } catch (e) { console.error(e); }
    finally { setFetching(false); }
  };

  const fetchApprovals = async () => {
    try {
      const res = await axios.get('/api/observations/pending-approvals');
      setApprovals(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchAllObs = async () => {
    try {
      const res = await axios.get('/api/observations/all');
      setAllObs(res.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchUsers(); fetchApprovals(); fetchAllObs(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/api/admin/create-user', form);
      showMsg(`User "${form.username}" created!`);
      setForm({ firstName: '', lastName: '', username: '', email: '', password: '', role: 'auditor' });
      fetchUsers();
      setTab('users');
    } catch (err) {
      showMsg(err.response?.data?.message || 'Error', 'error');
    } finally { setLoading(false); }
  };

  const handleDeactivate = async (id, name) => {
    if (!window.confirm(`Deactivate "${name}"?`)) return;
    try {
      await axios.delete(`/api/admin/users/${id}`);
      showMsg(`"${name}" deactivated`);
      fetchUsers();
    } catch (e) { showMsg('Error', 'error'); }
  };

  const handleResetPassword = async (id, name) => {
    const newPass = passInputs[id]?.trim();
    if (!newPass || newPass.length < 6) { showMsg('Min 6 characters daalo!', 'error'); return; }
    if (!window.confirm(`Reset password for "${name}"?`)) return;
    try {
      await axios.put(`/api/admin/users/${id}/reset-password`, { newPassword: newPass });
      showMsg(`Password reset for ${name}!`);
      setPassInputs(p => ({ ...p, [id]: '' }));
    } catch (e) { showMsg(e.response?.data?.message || 'Error', 'error'); }
  };

  const openEdit = (u) => {
    setEditUser(u._id);
    setEditForm({ firstName: u.firstName, lastName: u.lastName, username: u.username, email: u.email, role: u.role });
  };

  const handleUpdate = async (id) => {
    try {
      await axios.put(`/api/admin/users/${id}`, editForm);
      showMsg('User updated!');
      setEditUser(null);
      fetchUsers();
    } catch (e) { showMsg(e.response?.data?.message || 'Error', 'error'); }
  };

  const handleApprove = async (obsId) => {
    const date = newDate[obsId];
    try {
      await axios.post(`/api/observations/${obsId}/approve`, { newClosingPeriod: date || null });
      showMsg('Approved! Row unlocked.');
      fetchApprovals();
      fetchAllObs();
    } catch (e) { showMsg('Error approving', 'error'); }
  };

  const handleReject = async (obsId) => {
    if (!window.confirm('Reject this request?')) return;
    try {
      await axios.post(`/api/observations/${obsId}/approve`, { newClosingPeriod: null, reject: true });
      showMsg('Request rejected.');
      fetchApprovals();
    } catch (e) { showMsg('Error', 'error'); }
  };

  const filteredObs = allObs.filter(row => {
    if (!obsSearch) return true;
    const s = obsSearch.toLowerCase();
    return (
      row.uniqueKey?.toLowerCase().includes(s) ||
      row.area?.toLowerCase().includes(s) ||
      row.company?.toLowerCase().includes(s) ||
      row.financialYear?.toLowerCase().includes(s) ||
      row.business?.toLowerCase().includes(s) ||
      row.observation?.toLowerCase().includes(s) ||
      row.personResponsible?.toLowerCase().includes(s) ||
      row.status?.toLowerCase().includes(s) ||
      row.user?.username?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="ap-bg">
      <div className="ap-header">
        <div className="ap-logo">AuditPro</div>
        <div className="ap-header-right">
          <span className="ap-welcome">👋 {user?.name}</span>
          <span className="ap-role-tag">Admin</span>
          <button onClick={logout} className="ap-logout">Logout</button>
        </div>
      </div>

      <div className="ap-main">
        <div className="ap-sidebar">
          <div className="ap-sidebar-title">Admin Panel</div>
          <nav>
            <button className={`ap-nav-btn ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>
              <span>👥</span> All Users <span className="ap-count">{users.length}</span>
            </button>
            <button className={`ap-nav-btn ${tab === 'create' ? 'active' : ''}`} onClick={() => setTab('create')}>
              <span>➕</span> Create User
            </button>
            <button className={`ap-nav-btn ${tab === 'observations' ? 'active' : ''}`} onClick={() => { setTab('observations'); fetchAllObs(); }}>
              <span>📋</span> All Reports <span className="ap-count">{allObs.length}</span>
            </button>
            <button className={`ap-nav-btn ${tab === 'approvals' ? 'active' : ''}`} onClick={() => { setTab('approvals'); fetchApprovals(); }}>
              <span>🔓</span> Approvals
              {approvals.length > 0 && <span className="ap-count" style={{background:'rgba(239,68,68,0.2)',color:'#f87171'}}>{approvals.length}</span>}
            </button>
          </nav>
        </div>

        <div className="ap-content">
          {msg.text && <div className={`ap-msg ${msg.type}`}>{msg.type === 'error' ? '⚠' : '✓'} {msg.text}</div>}

          {/* USERS TAB */}
          {tab === 'users' && (
            <div className="ap-section">
              <h2>All Users</h2>
              {fetching ? <div className="ap-loading">Loading...</div> :
                users.length === 0 ? <div className="ap-empty">No users yet.</div> : (
                <div className="ap-table-wrap">
                  <table className="ap-table">
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>First Name</th>
                        <th>Last Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Reset Password</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        editUser === u._id ? (
                          <tr key={u._id} className="edit-row">
                            <td><input className="ap-edit-input" autoComplete="off" value={editForm.username} onChange={e => setEditForm(f => ({...f, username: e.target.value}))} /></td>
                            <td><input className="ap-edit-input" autoComplete="off" value={editForm.firstName} onChange={e => setEditForm(f => ({...f, firstName: e.target.value}))} /></td>
                            <td><input className="ap-edit-input" autoComplete="off" value={editForm.lastName} onChange={e => setEditForm(f => ({...f, lastName: e.target.value}))} /></td>
                            <td><input className="ap-edit-input" autoComplete="off" value={editForm.email} onChange={e => setEditForm(f => ({...f, email: e.target.value}))} /></td>
                            <td>
                              <select className="ap-edit-input" value={editForm.role} onChange={e => setEditForm(f => ({...f, role: e.target.value}))}>
                                <option value="auditor">Auditor</option>
                                <option value="admin">Admin</option>
                              </select>
                            </td>
                            <td>—</td>
                            <td>—</td>
                            <td>
                              <div style={{display:'flex', gap:'6px'}}>
                                <button className="approve-btn" style={{padding:'4px 10px', fontSize:'11px'}} onClick={() => handleUpdate(u._id)}>Save</button>
                                <button className="reject-btn" style={{padding:'4px 10px', fontSize:'11px'}} onClick={() => setEditUser(null)}>Cancel</button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          <tr key={u._id}>
                            <td><div className="ap-name-cell"><div className="ap-avatar">{(u.username||'?')[0].toUpperCase()}</div>{u.username}</div></td>
                            <td>{u.firstName}</td>
                            <td>{u.lastName}</td>
                            <td className="ap-email">{u.email}</td>
                            <td><span className={`ap-badge ${u.role}`}>{u.role}</span></td>
                            <td><span className={`ap-status ${u.isActive ? 'active' : 'inactive'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                            <td>
                              <div className="ap-pass-wrap">
                                <div className="ap-pass-input-wrap">
                                  <input
                                    type={showPass[u._id] ? 'text' : 'password'}
                                    className="ap-pass-input"
                                    placeholder="New password"
                                    autoComplete="new-password"
                                    value={passInputs[u._id] || ''}
                                    onChange={e => setPassInputs(p => ({ ...p, [u._id]: e.target.value }))}
                                  />
                                  <button className="ap-pass-eye" type="button" onClick={() => setShowPass(s => ({ ...s, [u._id]: !s[u._id] }))}>
                                    {showPass[u._id] ? '🙈' : '👁'}
                                  </button>
                                </div>
                                <button className="ap-reset-btn" type="button" onClick={() => handleResetPassword(u._id, u.username)}>Reset</button>
                              </div>
                            </td>
                            <td>
                              <div style={{display:'flex', gap:'6px', flexDirection:'column'}}>
                                <button className="ap-modify-btn" onClick={() => openEdit(u)}>✏️ Modify</button>
                                {u.isActive && u._id !== user?.id && (
                                  <button className="ap-deactivate-btn" onClick={() => handleDeactivate(u._id, u.username)}>Deactivate</button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* CREATE TAB */}
          {tab === 'create' && (
            <div className="ap-section">
              <h2>Create New User</h2>
              <form onSubmit={handleCreate} className="ap-form" autoComplete="off">
                <div className="ap-form-grid">
                  <div className="ap-field">
                    <label>Username</label>
                    <input type="text" placeholder="john_doe" value={form.username} autoComplete="off"
                      onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
                  </div>
                  <div className="ap-field">
                    <label>Password</label>
                    <input type="password" placeholder="Min 6 characters" value={form.password} autoComplete="new-password"
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
                  </div>
                  <div className="ap-field">
                    <label>First Name</label>
                    <input type="text" placeholder="John" value={form.firstName} autoComplete="off"
                      onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} required />
                  </div>
                  <div className="ap-field">
                    <label>Last Name</label>
                    <input type="text" placeholder="Doe" value={form.lastName} autoComplete="off"
                      onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} required />
                  </div>
                  <div className="ap-field">
                    <label>Email Address</label>
                    <input type="email" placeholder="john@company.com" value={form.email} autoComplete="off"
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
                  </div>
                  <div className="ap-field">
                    <label>Role</label>
                    <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                      <option value="auditor">Auditor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="ap-create-btn" disabled={loading}>
                  {loading ? <span className="spinner"></span> : '+ Create User'}
                </button>
              </form>
            </div>
          )}

          {/* ALL OBSERVATIONS TAB */}
          {tab === 'observations' && (
            <div className="ap-section">
              <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px', flexWrap:'wrap', gap:'12px'}}>
                <h2>All Reports <span className="ap-count" style={{fontSize:'13px'}}>{filteredObs.length}</span></h2>
                <input
                  className="ap-obs-search"
                  placeholder="🔍 Search by area, company, auditor, status..."
                  value={obsSearch}
                  onChange={e => setObsSearch(e.target.value)}
                />
              </div>
              <div className="ap-table-wrap">
                <table className="ap-table">
                  <thead>
                    <tr>
                      <th>S.No.</th>
                      <th>Key</th>
                      <th>Auditor</th>
                      <th>Company</th>
                      <th>FY</th>
                      <th>Business</th>
                      <th>Area</th>
                      <th>Observation</th>
                      <th>Person AC</th>
                      <th>Person Responsible</th>
                      <th>Closing Date</th>
                      <th>Status</th>
                      <th>Mailing</th>
                      <th>Created On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredObs.length === 0 ? (
                      <tr><td colSpan={14} className="db-empty">No observations found.</td></tr>
                    ) : filteredObs.map((row, i) => (
                      <tr key={row._id}>
                        <td className="td-center" style={{color:'#6b7280', fontSize:'12px'}}>{i + 1}</td>
                        <td><span className="key-badge-admin">{row.uniqueKey || '—'}</span></td>
                        <td style={{fontSize:'12px'}}>
                          <div style={{fontWeight:600, color:'#e2e8f0'}}>{row.user?.username || '—'}</div>
                          <div style={{color:'#6b7280', fontSize:'11px'}}>{row.user?.email}</div>
                        </td>
                        <td><span className="obs-chip">{row.company}</span></td>
                        <td style={{fontSize:'12px', color:'#60a5fa', fontWeight:600}}>{row.financialYear}</td>
                        <td style={{fontSize:'12px', color:'#60a5fa'}}>{row.business}</td>
                        <td style={{fontSize:'12px', maxWidth:'120px'}}>{row.area}</td>
                        <td style={{fontSize:'12px', maxWidth:'150px', color:'#94a3b8'}}>{row.observation || '—'}</td>
                        <td style={{fontSize:'11px', color:'#94a3b8'}}>{row.personResponsibilityAsPerAC || '—'}</td>
                        <td style={{fontSize:'11px', color:'#94a3b8'}}>{row.personResponsible || '—'}</td>
                        <td style={{fontSize:'12px', color: row.closingPeriod ? '#f87171' : '#6b7280', fontWeight:600}}>{row.closingPeriod || '—'}</td>
                        <td>
                          <span className={`ap-status ${row.status === 'Closed' ? 'inactive' : 'active'}`} style={{fontSize:'10px'}}>
                            {row.status}
                          </span>
                        </td>
                        <td>
                          {row.mailingActive
                            ? <span style={{fontSize:'10px', color:'#34d399', fontWeight:600}}>🟢 Active</span>
                            : <span style={{fontSize:'10px', color:'#6b7280'}}>—</span>
                          }
                        </td>
                        <td style={{fontSize:'11px', color:'#6b7280', whiteSpace:'nowrap'}}>
                          {new Date(row.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* APPROVALS TAB */}
          {tab === 'approvals' && (
            <div className="ap-section">
              <h2>Pending Approval Requests</h2>
              {approvals.length === 0 ? (
                <div className="ap-empty">✅ No pending requests!</div>
              ) : (
                <div className="approvals-list">
                  {approvals.map(obs => (
                    <div key={obs._id} className="approval-card">
                      <div className="approval-card-header">
                        <span className="key-badge-admin">{obs.uniqueKey}</span>
                        <span className="approval-area">{obs.area}</span>
                        <span className="approval-user">by {obs.user?.firstName} {obs.user?.lastName} ({obs.user?.email})</span>
                        <span className="approval-time">
                          Requested: {new Date(obs.approvalRequestedAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                        </span>
                      </div>
                      <div className="approval-details">
                        <div className="approval-row">
                          <span className="approval-label">Observation</span>
                          <span className="approval-val">{obs.observation || '—'}</span>
                        </div>
                        <div className="approval-row">
                          <span className="approval-label">Person AC</span>
                          <span className="approval-val">{obs.personResponsibilityAsPerAC || '—'}</span>
                        </div>
                        <div className="approval-row">
                          <span className="approval-label">Person Responsible</span>
                          <span className="approval-val">{obs.personResponsible || '—'}</span>
                        </div>
                        <div className="approval-row">
                          <span className="approval-label">Current Closing Date</span>
                          <span className="approval-val" style={{color:'#f87171',fontWeight:600}}>{obs.closingPeriod || '—'}</span>
                        </div>
                      </div>
                      <div className="approval-actions">
                        <div className="approval-date-wrap">
                          <label>New Closing Date (optional)</label>
                          <input type="date" className="approval-date-input"
                            value={newDate[obs._id] || ''}
                            onChange={e => setNewDate(d => ({ ...d, [obs._id]: e.target.value }))} />
                        </div>
                        <div className="approval-btns">
                          <button className="approve-btn" onClick={() => handleApprove(obs._id)}>✅ Approve & Unlock</button>
                          <button className="reject-btn" onClick={() => handleReject(obs._id)}>❌ Reject</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}