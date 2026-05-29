import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from '../api';  // ya path adjust karo
import './Dashboard.css';

const AREA_OPTIONS = [
  'RPT Review','Expense Review','ICFR','P2P Review','Provision Review',
  'Risk and Control Self-Assessment','Risk Management','Customer Review',
  'GST Audit','Trial Balance Review','STC Trial Balance Review and Customer Review',
  'Analytical tools','FSO Review','TKH Audit','Success factor audit',
  'Symphony audit','SAP Module audit','Billing review',
];

const TagBox = ({ rows, realIdx, field, inputKey, placeholder, isEmail, tagClass, personInput, setPersonInput, showMsg, handleTagRemove, handleTagAdd, handleTagBackspace }) => {
  const currentRow = rows[realIdx];
  const tags = (currentRow?.[field] || '').split(',').map(s => s.trim()).filter(Boolean);
  return (
    <div className="tag-box">
      {tags.map((tag, ni) => (
        <span key={ni} className={tagClass || 'person-tag'} title={tag}>
          {tag}
          <span className="tag-remove" onClick={() => handleTagRemove(realIdx, field, ni)}>x</span>
        </span>
      ))}
      <input
        className="tag-input"
        placeholder={placeholder}
        value={personInput[inputKey] || ''}
        onChange={e => setPersonInput(p => ({ ...p, [inputKey]: e.target.value }))}
        onKeyDown={async e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const val = (personInput[inputKey] || '').trim();
            if (!val) return;
            if (isEmail && !val.includes('@')) { showMsg('Valid email daalo!', 'error'); return; }
            await handleTagAdd(realIdx, field, inputKey, val);
          }
          if (e.key === 'Backspace' && !personInput[inputKey]) {
            await handleTagBackspace(realIdx, field, inputKey);
          }
        }}
      />
    </div>
  );
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const context = location.state;

  const [tab, setTab] = useState('create');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [personInput, setPersonInput] = useState({});

  useEffect(() => { if (!context) navigate('/select'); }, [context, navigate]);

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 3000);
  };

  const fetchRows = useCallback(async () => {
    if (!context) return;
    setLoading(true);
    try {
      const res = await axios.get('/api/observations', {
        params: { company: context.company, financialYear: context.financialYear, business: context.business }
      });
      setRows(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [context]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const buildPayload = (row) => ({
    company: context.company, financialYear: context.financialYear, business: context.business,
    area: row.area, observation: row.observation, managerComment: row.managerComment,
    personResponsibilityAsPerAC: row.personResponsibilityAsPerAC || '',
    personResponsibilityEmails: row.personResponsibilityEmails || '',
    personResponsible: row.personResponsible || '',
    personResponsibleEmails: row.personResponsibleEmails || '',
    remarks: row.remarks, attachment: row.attachment, attachmentName: row.attachmentName,
    status: row.status, closingPeriod: row.closingPeriod,
  });

  const addRow = () => {
    const tempRow = {
      _id: null,
      company: context.company, financialYear: context.financialYear, business: context.business,
      area: '', observation: '', managerComment: '',
      personResponsibilityAsPerAC: '', personResponsibilityEmails: '',
      personResponsible: '', personResponsibleEmails: '',
      remarks: '', attachment: '', attachmentName: '',
      status: 'Open', closingPeriod: '',
      locked: false, mailingActive: false,
      createdAt: new Date().toISOString(),
    };
    setRows(r => [...r, tempRow]);
  };

  const updateCell = (index, field, value) => {
    setRows(r => r.map((row, i) => i === index ? { ...row, [field]: value } : row));
  };

  const saveRow = async (index) => {
    const row = rows[index];
    setSaving(index);
    try {
      let res;
      if (!row._id) {
        res = await axios.post('/api/observations', buildPayload(row));
      } else {
        res = await axios.put(`/api/observations/${row._id}`, buildPayload(row));
      }
      setRows(r => r.map((ro, i) => i === index ? res.data : ro));
      showMsg('Saved!');
    } catch (e) { showMsg('Save failed', 'error'); }
    finally { setSaving(null); }
  };

  const startMailing = async (index) => {
    const row = rows[index];
    if (!row._id) return;
    if (!row.closingPeriod) { showMsg('Pehle closing period set karo!', 'error'); return; }
    const acEmails = (row.personResponsibilityEmails || '').split(',').map(s => s.trim()).filter(Boolean);
    const prEmails = (row.personResponsibleEmails || '').split(',').map(s => s.trim()).filter(Boolean);
    if (acEmails.length === 0 && prEmails.length === 0) { showMsg('Koi email nahi hai!', 'error'); return; }
    if (!window.confirm('Once mailing starts, this row will be locked for editing. Confirm?')) return;
    try {
      const res = await axios.post(`/api/observations/${row._id}/start-mailing`);
      setRows(r => r.map((ro, i) => i === index ? res.data.obs : ro));
      showMsg('Mailing started! Row locked.');
    } catch (e) { showMsg(e.response?.data?.message || 'Error', 'error'); }
  };

  const requestApproval = async (index) => {
    const row = rows[index];
    if (!window.confirm('Admin se approval request karein?')) return;
    try {
      const res = await axios.post(`/api/observations/${row._id}/request-approval`);
      setRows(r => r.map((ro, i) => i === index ? res.data.obs : ro));
      showMsg('Approval request sent!');
    } catch (e) { showMsg('Error', 'error'); }
  };

  const handleAreaChange = async (index, value) => {
    const updated = { ...rows[index], area: value };
    setRows(r => r.map((row, i) => i === index ? updated : row));
    if (!updated._id) return;
    try {
      const res = await axios.put(`/api/observations/${updated._id}`, buildPayload(updated));
      setRows(r => r.map((ro, i) => i === index ? res.data : ro));
    } catch (e) { console.error(e); }
  };

  const handleStatusChange = async (index) => {
    const row = rows[index];
    if (row.locked) return;
    const newStatus = row.status === 'Open' ? 'Closed' : 'Open';
    if (newStatus === 'Closed' && row.mailingActive) {
      if (!window.confirm('Closing karega toh mailing band ho jayegi. Confirm?')) return;
    }
    const updated = { ...row, status: newStatus };
    setRows(r => r.map((ro, i) => i === index ? updated : ro));
    try {
      const res = await axios.put(`/api/observations/${row._id}`, buildPayload(updated));
      setRows(r => r.map((ro, i) => i === index ? res.data : ro));
      if (newStatus === 'Closed') showMsg('Closed! Mailing band ho gayi.');
    } catch (e) { console.error(e); }
  };

 const handleSubmitClose = async (index) => {
  const row = rows[index];
  if (!row.remarks && !row.attachment) { 
    showMsg('Add remarks or attachments first!', 'error'); 
    return; 
  }
  if (!window.confirm('Close the observation by submitting? Mailing will stop.')) return;
  try {
    const res = await axios.put(`/api/observations/${row._id}`, {
      remarks: row.remarks || '',
      attachment: row.attachment || '',
      attachmentName: row.attachmentName || '',
      status: 'Closed',
      mailingActive: false,
    });
    setRows(r => r.map((ro, i) => i === index ? res.data : ro));
    showMsg('Submitted & Closed! Mailing has stopped.');
  } catch (e) { 
    showMsg(e.response?.data?.message || 'Error closing', 'error'); 
  }
};

  const handleAttachment = async (index, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const updated = { ...rows[index], attachment: e.target.result, attachmentName: file.name };
      setRows(r => r.map((ro, i) => i === index ? updated : ro));
      if (!updated._id) return;
      try {
        await axios.put(`/api/observations/${updated._id}`, buildPayload(updated));
        showMsg('Attachment saved!');
      } catch (err) { console.error(err); }
    };
    reader.readAsDataURL(file);
  };

  const deleteRow = async (index) => {
    const row = rows[index];
    if (!window.confirm('Delete this row?')) return;
    try {
      if (row._id) await axios.delete(`/api/observations/${row._id}`);
      setRows(r => r.filter((_, i) => i !== index));
      showMsg('Deleted');
    } catch (e) { showMsg('Error deleting', 'error'); }
  };

  const handleTagAdd = async (realIdx, field, inputKey, val) => {
    const currentRow = rows[realIdx];
    const existing = (currentRow[field] || '').split(',').map(s => s.trim()).filter(Boolean);
    if (existing.includes(val)) { setPersonInput(p => ({ ...p, [inputKey]: '' })); return; }
    const newVal = [...existing, val].join(', ');
    const updatedRow = { ...currentRow, [field]: newVal };
    setRows(r => r.map((ro, i) => i === realIdx ? updatedRow : ro));
    setPersonInput(p => ({ ...p, [inputKey]: '' }));
    if (updatedRow._id) {
      try { await axios.put(`/api/observations/${updatedRow._id}`, buildPayload(updatedRow)); }
      catch(e) { showMsg('Save failed', 'error'); }
    }
  };

  const handleTagRemove = async (realIdx, field, removeIdx) => {
    const currentRow = rows[realIdx];
    const existing = (currentRow[field] || '').split(',').map(s => s.trim()).filter(Boolean);
    existing.splice(removeIdx, 1);
    const updatedRow = { ...currentRow, [field]: existing.join(', ') };
    setRows(r => r.map((ro, i) => i === realIdx ? updatedRow : ro));
    if (updatedRow._id) {
      try { await axios.put(`/api/observations/${updatedRow._id}`, buildPayload(updatedRow)); }
      catch(e) { console.error(e); }
    }
  };

  const handleTagBackspace = async (realIdx, field, inputKey) => {
    const currentRow = rows[realIdx];
    const existing = (currentRow[field] || '').split(',').map(s => s.trim()).filter(Boolean);
    if (existing.length > 0) {
      existing.pop();
      const updatedRow = { ...currentRow, [field]: existing.join(', ') };
      setRows(r => r.map((ro, i) => i === realIdx ? updatedRow : ro));
      if (updatedRow._id) {
        try { await axios.put(`/api/observations/${updatedRow._id}`, buildPayload(updatedRow)); }
        catch(e) { console.error(e); }
      }
    }
  };


  const calcTAT = (row) => {
    if (!row.closingPeriod || !row.createdAt) return null;
    const created = new Date(row.createdAt);
    const closing = new Date(row.closingPeriod);
    const today = new Date();
    today.setHours(0,0,0,0);
    closing.setHours(0,0,0,0);
    created.setHours(0,0,0,0);
    if (row.status === 'Closed') {
      const diff = Math.ceil((closing - created) / (1000 * 60 * 60 * 24));
      return { days: diff, type: 'closed' };
    } else {
      const diff = Math.ceil((closing - today) / (1000 * 60 * 60 * 24));
      if (diff < 0) return { days: Math.abs(diff), type: 'overdue' };
      if (diff <= 7) return { days: diff, type: 'urgent' };
      return { days: diff, type: 'normal' };
    }
  };

  if (!context) return null;

  const filtered = rows.filter(row => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      row.area?.toLowerCase().includes(s) ||
      row.personResponsible?.toLowerCase().includes(s) ||
      row.personResponsibilityAsPerAC?.toLowerCase().includes(s) ||
      row.observation?.toLowerCase().includes(s) ||
      row.uniqueKey?.toLowerCase().includes(s) ||
      row.status?.toLowerCase().includes(s) ||
      row.closingPeriod?.includes(s)
    );
  });

  // CREATE tab: unsaved + saved but not locked and not closed
  const createTabRows = rows.filter(row => !row._id || (!row.locked && row.status !== 'Closed'));

  // ACTIVE tab: locked rows (mailing active) - still open
  const activeRows = rows.filter(row => row._id && row.locked && row.status !== 'Closed');
  const filteredActiveRows = activeRows.filter(row => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      row.area?.toLowerCase().includes(s) ||
      row.personResponsible?.toLowerCase().includes(s) ||
      row.personResponsibilityAsPerAC?.toLowerCase().includes(s) ||
      row.observation?.toLowerCase().includes(s) ||
      row.uniqueKey?.toLowerCase().includes(s) ||
      row.closingPeriod?.includes(s)
    );
  });

  // REPORT tab: closed rows only
  const reportRows = rows.filter(row => row._id && row.status === 'Closed');
  // Report tab filter: all=saved rows, open=mailing active, closed=closed
  const allSavedRows = rows.filter(row => row._id);
  const reportFiltered = allSavedRows.filter(row => {
    const s = search.toLowerCase();
    const matchSearch = !search || (
      row.area?.toLowerCase().includes(s) ||
      row.personResponsible?.toLowerCase().includes(s) ||
      row.personResponsibilityAsPerAC?.toLowerCase().includes(s) ||
      row.observation?.toLowerCase().includes(s) ||
      row.uniqueKey?.toLowerCase().includes(s) ||
      row.closingPeriod?.includes(s)
    );
    const matchStatus = statusFilter === 'all' ||
      (statusFilter === 'open' && row.locked && row.status !== 'Closed') ||
      (statusFilter === 'closed' && row.status === 'Closed');
    return matchSearch && matchStatus;
  });

  const tagBoxProps = { rows, personInput, setPersonInput, showMsg, handleTagRemove, handleTagAdd, handleTagBackspace };

  return (
    <div className="db-bg">
      <div className="db-header">
        <div className="db-header-left">
          <div className="db-logo">AuditPro</div>
          <div className="db-context">
            <span className="ctx-chip">{context.company}</span>
            <span className="ctx-chip">{context.financialYear}</span>
            <span className="ctx-chip">{context.business}</span>
          </div>
        </div>
        <div className="db-header-right">
          <span className="db-welcome">Hello, {user?.name}</span>
          <span className="db-role-tag">{user?.role}</span>
          <button onClick={() => navigate('/select')} className="db-back-btn">Change</button>
          <button onClick={logout} className="db-logout">Logout</button>
        </div>
      </div>

      <div className="db-tabs">
        <button className={`db-tab ${tab === 'create' ? 'active' : ''}`} onClick={() => setTab('create')}>Create</button>
        <button className={`db-tab ${tab === 'active' ? 'active' : ''}`} onClick={() => setTab('active')}>
          Mailing Active {activeRows.length > 0 && <span className="tab-badge">{activeRows.length}</span>}
        </button>
        <button className={`db-tab ${tab === 'report' ? 'active' : ''}`} onClick={() => { setTab('report'); setStatusFilter('all'); }}>Report</button>
      </div>

      {msg.text && <div className={`db-msg ${msg.type}`}>{msg.type === 'error' ? 'Error: ' : 'Done: '} {msg.text}</div>}

      {/* CREATE TAB */}
      {tab === 'create' && (
        <div className="db-content">
          <div className="db-toolbar">
            <h2>Audit Observations <span className="db-count">{createTabRows.length} rows</span></h2>
            <div className="toolbar-right">
              <input className="search-bar" placeholder="Search by area, person, status, key..."
                value={search} onChange={e => setSearch(e.target.value)} />
              <button className="db-add-btn" onClick={addRow} disabled={saving === 'new'}>
                {saving === 'new' ? 'Adding...' : '+ Add Row'}
              </button>
            </div>
          </div>

          {loading ? <div className="db-loading">Loading...</div> : (
            <div className="db-table-wrap">
              <table className="db-table">
                <thead>
                  <tr>
                    <th className="col-sno">S.No.</th>
                    <th className="col-key">Unique Key</th>
                    <th className="col-fy">FY</th>
                    <th className="col-biz">Business</th>
                    <th className="col-area">Area</th>
                    <th className="col-obs">Observation</th>
                    <th className="col-mc">Management Comment</th>
                    <th className="col-prac">Person Responsible</th>
                    <th className="col-pr">Person Resp. (AC)</th>
                    <th className="col-rem">Remarks & Attachment</th>
                    <th className="col-cp">Closing Period</th>
                    <th className="col-status">Status</th>
                    <th className="col-date">Created On</th>
                    <th className="col-act">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {createTabRows.length === 0 ? (
                    <tr><td colSpan={14} className="db-empty">Click + Add Row to create a new observation.</td></tr>
                  ) : createTabRows.map((row, i) => {
                    const realIdx = rows.indexOf(row);
                    const acNames = (row.personResponsibilityAsPerAC || '').split(',').map(s => s.trim()).filter(Boolean);
                    const acEmails = (row.personResponsibilityEmails || '').split(',').map(s => s.trim()).filter(Boolean);
                    const prNames = (row.personResponsible || '').split(',').map(s => s.trim()).filter(Boolean);
                    const prEmails = (row.personResponsibleEmails || '').split(',').map(s => s.trim()).filter(Boolean);
                    const isLocked = row.locked;

                    return (
                      <tr key={row._id} className={isLocked ? 'row-locked' : ''}>
                        <td className="col-sno td-center">{i + 1}</td>
                        <td className="col-key"><span className="key-badge">{row.uniqueKey || '-'}</span></td>
                        <td className="col-fy td-chip">{context.financialYear}</td>
                        <td className="col-biz td-chip">{context.business}</td>

                        <td className="col-area">
                          {isLocked
                            ? <span className="locked-text">{row.area}</span>
                            : <select className="cell-select" value={row.area} onChange={e => handleAreaChange(realIdx, e.target.value)}>
                                <option value="">Select</option>
                                {AREA_OPTIONS.map(a => <option key={a}>{a}</option>)}
                              </select>
                          }
                        </td>

                        <td className="col-obs">
                          {isLocked
                            ? <span className="locked-text">{row.observation}</span>
                            : <textarea className="cell-textarea" value={row.observation}
                                onChange={e => updateCell(realIdx, 'observation', e.target.value)} placeholder="Enter observation..." />
                          }
                        </td>

                        <td className="col-mc">
                          {isLocked
                            ? <span className="locked-text">{row.managerComment}</span>
                            : <textarea className="cell-textarea" value={row.managerComment}
                                onChange={e => updateCell(realIdx, 'managerComment', e.target.value)} placeholder="Manager comment..." />
                          }
                        </td>

                        <td className="col-prac" style={{verticalAlign:'top', paddingTop:'8px'}}>
                          {isLocked ? (
                            <div>
                              <div className="locked-tags">{prNames.map((n,idx) => <span key={idx} className="person-tag">{n}</span>)}</div>
                              <div className="email-section-label" style={{marginTop:4}}>Emails</div>
                              <div className="locked-tags">{prEmails.map((e,idx) => <span key={idx} className="email-tag">{e}</span>)}</div>
                            </div>
                          ) : (
                            <>
                              <TagBox {...tagBoxProps} realIdx={realIdx} field="personResponsible"
                                inputKey={`pr_name_${realIdx}`} placeholder="Name + Enter" />
                              <div className="email-section">
                                <div className="email-section-label">Reminder Emails</div>
                                <TagBox {...tagBoxProps} realIdx={realIdx} field="personResponsibleEmails"
                                  inputKey={`pr_email_${realIdx}`} placeholder="email + Enter"
                                  isEmail={true} tagClass="email-tag" />
                                {prNames.length > 0 && prEmails.length < prNames.length &&
                                  <div className="pending-warn">{prNames.length - prEmails.length} email pending</div>}
                                {prNames.length > 0 && prEmails.length >= prNames.length &&
                                  <div className="all-done">All emails added</div>}
                              </div>
                            </>
                          )}
                        </td>

                        <td className="col-pr" style={{verticalAlign:'top', paddingTop:'8px'}}>
                          {isLocked ? (
                            <div>
                              <div className="locked-tags">{acNames.map((n,idx) => <span key={idx} className="person-tag">{n}</span>)}</div>
                              <div className="email-section-label" style={{marginTop:4}}>Emails</div>
                              <div className="locked-tags">{acEmails.map((e,idx) => <span key={idx} className="email-tag">{e}</span>)}</div>
                            </div>
                          ) : (
                            <>
                              <TagBox {...tagBoxProps} realIdx={realIdx} field="personResponsibilityAsPerAC"
                                inputKey={`ac_name_${realIdx}`} placeholder="Name + Enter" />
                              <div className="email-section">
                                <div className="email-section-label">Reminder Emails</div>
                                <TagBox {...tagBoxProps} realIdx={realIdx} field="personResponsibilityEmails"
                                  inputKey={`ac_email_${realIdx}`} placeholder="email + Enter"
                                  isEmail={true} tagClass="email-tag" />
                                {acNames.length > 0 && acEmails.length < acNames.length &&
                                  <div className="pending-warn">{acNames.length - acEmails.length} email pending</div>}
                                {acNames.length > 0 && acEmails.length >= acNames.length &&
                                  <div className="all-done">All emails added</div>}
                              </div>
                            </>
                          )}
                        </td>

                        <td className="col-rem" style={{verticalAlign:'top', paddingTop:'9px'}}>
                          {row.mailingActive && row.status === 'Open' ? (
                            <div>
                              <div className="remarks-box">
                                <textarea className="remarks-textarea" value={row.remarks}
                                  onChange={e => updateCell(realIdx, 'remarks', e.target.value)}
                                  placeholder="Remarks daalo..." />
                                <label className="remarks-attach" title={row.attachmentName || 'Attach file'}>
                                  <input type="file" style={{ display: 'none' }}
                                    onChange={e => handleAttachment(realIdx, e.target.files[0])} />
                                  {row.attachment ? 'Done' : 'Attach'}
                                </label>
                              </div>
                              {row.attachment && (
                                <a className="attach-link" href={row.attachment} download={row.attachmentName}>
                                  Download: {row.attachmentName?.substring(0, 18)}
                                </a>
                              )}
                              {(row.remarks || row.attachment) && (
                                <button className="submit-close-btn" onClick={() => handleSubmitClose(realIdx)}>
                                  Submit and Close
                                </button>
                              )}
                            </div>
                          ) : row.status === 'Closed' ? (
                            <div>
                              <span className="locked-text">{row.remarks || '-'}</span>
                              {row.attachment && (
                                <a className="attach-link" href={row.attachment} download={row.attachmentName}>
                                  Download: {row.attachmentName?.substring(0, 18)}
                                </a>
                              )}
                            </div>
                          ) : (
                            <span style={{color:'#374151', fontSize:'11px'}}>
                              Available after Start Mail
                            </span>
                          )}
                        </td>

                        <td className="col-cp">
                          {isLocked
                            ? <span className="locked-text">{row.closingPeriod ? new Date(row.closingPeriod).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</span>
                            : <input className="cell-input" type="date" value={row.closingPeriod}
                                onChange={e => updateCell(realIdx, 'closingPeriod', e.target.value)} />
                          }
                        </td>

                        <td className="col-status">
                          <span
                            className={`status-pill ${row.status === 'Closed' ? 'closed' : 'open'}`}
                            onClick={() => !isLocked && handleStatusChange(realIdx)}
                            style={{cursor: isLocked ? 'default' : 'pointer'}}
                          >
                            <span className="status-dot"></span>
                            {row.status}
                          </span>
                        </td>

                        <td className="col-date td-date">
                          {new Date(row.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>

                        <td className="col-act">
                          <div className="action-btns">
                            {!isLocked ? (
                              <>
                                <button className="save-btn" onClick={() => saveRow(realIdx)} disabled={saving === realIdx}>
                                  {saving === realIdx ? '...' : '💾 Save'}
                                </button>
                                {row._id && row.area && row.closingPeriod &&
                                  ((row.personResponsibilityEmails || '').trim() || (row.personResponsibleEmails || '').trim()) && (
                                  <button className="mail-start-btn" onClick={() => startMailing(realIdx)}>
                                    📧 Start Mail
                                  </button>
                                )}
                                <button className="del-btn" onClick={() => deleteRow(realIdx)}>✕ Del</button>
                              </>
                            ) : row.status === 'Closed' ? (
                              <span className="closed-badge">Closed</span>
                            ) : (
                              <>
                                <span className="locked-badge">Mailing Active</span>
                                {(() => {
                                  const tat = calcTAT(row);
                                  if (row.approvalRequested) return <span className="pending-badge">⏳ Pending</span>;
                                  if (tat && tat.type === 'overdue') return (
                                    <button className="approval-btn" onClick={() => requestApproval(realIdx)}>
                                      🔓 Request Edit
                                    </button>
                                  );
                                  return null;
                                })()}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}


      {/* ACTIVE TAB - Mailing Active Rows */}
      {tab === 'active' && (
        <div className="db-content">
          <div className="db-toolbar">
            <h2>Mailing Active <span className="db-count">{activeRows.length} rows</span></h2>
            <input className="search-bar" placeholder="🔍 Search by area, person, key..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="db-table-wrap">
            <table className="db-table">
              <thead>
                <tr>
                  <th className="col-sno">S.No.</th>
                  <th className="col-key">Unique Key</th>
                  <th className="col-fy">FY</th>
                  <th className="col-biz">Business</th>
                  <th className="col-area">Area</th>
                  <th className="col-obs">Observation</th>
                  <th className="col-mc">Management Comment</th>
                  <th className="col-prac">Person Responsible</th>
                  <th className="col-pr">Person Resp. (AC)</th>
                  <th className="col-rem">Remarks & Attachment</th>
                  <th className="col-cp">Closing Period</th>
                  <th className="col-status">Status</th>
                  <th className="col-tat">TAT</th>
                  <th className="col-date">Created On</th>
                  <th className="col-act">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeRows.length === 0 ? (
                  <tr><td colSpan={14} className="db-empty">No active mailing rows.</td></tr>
                ) : filteredActiveRows.map((row, i) => {
                  const realIdx = rows.indexOf(row);
                  const acNames = (row.personResponsibilityAsPerAC || '').split(',').map(s => s.trim()).filter(Boolean);
                  const acEmails = (row.personResponsibilityEmails || '').split(',').map(s => s.trim()).filter(Boolean);
                  const prNames = (row.personResponsible || '').split(',').map(s => s.trim()).filter(Boolean);
                  const prEmails = (row.personResponsibleEmails || '').split(',').map(s => s.trim()).filter(Boolean);
                  return (
                    <tr key={row._id} className="row-locked">
                      <td className="col-sno td-center">{i + 1}</td>
                      <td className="col-key"><span className="key-badge">{row.uniqueKey || '-'}</span></td>
                      <td className="col-fy td-chip">{context.financialYear}</td>
                      <td className="col-biz td-chip">{context.business}</td>
                      <td className="col-area"><span className="locked-text">{row.area}</span></td>
                      <td className="col-obs"><span className="locked-text">{row.observation}</span></td>
                      <td className="col-mc"><span className="locked-text">{row.managerComment}</span></td>
                      <td className="col-prac" style={{verticalAlign:'top', paddingTop:'8px'}}>
                        <div className="locked-tags">{prNames.map((n,idx) => <span key={idx} className="person-tag">{n}</span>)}</div>
                        <div className="email-section-label" style={{marginTop:4}}>Emails</div>
                        <div className="locked-tags">{prEmails.map((e,idx) => <span key={idx} className="email-tag">{e}</span>)}</div>
                      </td>
                      <td className="col-pr" style={{verticalAlign:'top', paddingTop:'8px'}}>
                        <div className="locked-tags">{acNames.map((n,idx) => <span key={idx} className="person-tag">{n}</span>)}</div>
                        <div className="email-section-label" style={{marginTop:4}}>Emails</div>
                        <div className="locked-tags">{acEmails.map((e,idx) => <span key={idx} className="email-tag">{e}</span>)}</div>
                      </td>
                      <td className="col-rem" style={{verticalAlign:'top', paddingTop:'9px'}}>
                        <div>
                          {row.status === 'Closed' && !row.remarks && (
                            <div style={{fontSize:'11px',color:'#dc2626',fontWeight:700,marginBottom:'6px'}}>⏰ Time Expired — Add Remarks to Close</div>
                          )}
                          <div className="remarks-box">
                            <textarea className="remarks-textarea" value={row.remarks||''}
                              onChange={e => updateCell(realIdx, 'remarks', e.target.value)}
                              placeholder="Remarks required to close..." />
                            <label className="remarks-attach">
                              <input type="file" style={{display:'none'}}
                                onChange={e => handleAttachment(realIdx, e.target.files[0])} />
                              {row.attachment ? '✓' : '📎'}
                            </label>
                          </div>
                          {row.attachment && (
                            <a className="attach-link" href={row.attachment} download={row.attachmentName}>
                              ⬇ {row.attachmentName?.substring(0, 18)}
                            </a>
                          )}
                          {row.remarks?.trim() && (
                            <button className="submit-close-btn" onClick={() => handleSubmitClose(realIdx)}>
                              ✅ Submit & Close
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="col-cp"><span className="locked-text">{row.closingPeriod ? new Date(row.closingPeriod).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</span></td>
                      <td className="col-status">
                        {row.status === 'Closed' && !row.remarks
                          ? <span style={{background:'#fee2e2',color:'#b91c1c',border:'1px solid #fca5a5',padding:'3px 8px',borderRadius:'20px',fontSize:'10px',fontWeight:700}}>⏰ Expired</span>
                          : <span className="status-pill open"><span className="status-dot"></span>Open</span>}
                      </td>
                      <td className="col-tat" style={{textAlign:'center'}}>
                        {(() => {
                          const tat = calcTAT(row);
                          if (!tat) return <span style={{color:'#94a3b8',fontSize:'11px'}}>—</span>;
                          if (tat.type === 'overdue') return <span className="tat-badge tat-overdue">+{tat.days}d overdue</span>;
                          if (tat.type === 'urgent') return <span className="tat-badge tat-urgent">{tat.days}d ⚠</span>;
                          return <span className="tat-badge tat-normal">{tat.days}d left</span>;
                        })()}
                      </td>
                      <td className="col-date td-date">
                        {new Date(row.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                      </td>
                      <td className="col-act">
                        <div className="action-btns">
                          <span className="locked-badge">Mailing Active</span>
                          {(() => {
                            const tat = calcTAT(row);
                            if (row.approvalRequested) return <span className="pending-badge">⏳ Pending</span>;
                            if (tat && tat.type === 'overdue') return (
                              <button className="approval-btn" onClick={() => requestApproval(realIdx)}>
                                🔓 Request Edit
                              </button>
                            );
                            return null;
                          })()}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT TAB */}
      {tab === 'report' && (
        <div className="db-content">
          <div className="db-toolbar">
            <h2>Audit Report</h2>
            <input className="search-bar" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="report-cards">
            <div
              className={`r-card total ${statusFilter === 'all' ? 'active-filter' : ''}`}
              onClick={() => setStatusFilter('all')}
              title="Click to show all"
            >
              
              <div className="r-num">{rows.filter(r=>r._id).length}</div>
              <div className="r-label">Total Saved</div>
              {statusFilter === 'all' && <div className="r-active-dot"></div>}
            </div>
            <div
              className={`r-card open ${statusFilter === 'open' ? 'active-filter' : ''}`}
              onClick={() => setStatusFilter('open')}
              title="Click to show Mailing Active only"
            >
              
              <div className="r-num">{activeRows.length}</div>
              <div className="r-label">Mailing Active</div>
              {statusFilter === 'open' && <div className="r-active-dot"></div>}
            </div>
            <div
              className={`r-card closed ${statusFilter === 'closed' ? 'active-filter' : ''}`}
              onClick={() => setStatusFilter('closed')}
              title="Click to show Closed only"
            >
             
              <div className="r-num">{reportRows.length}</div>
              <div className="r-label">Closed</div>
              {statusFilter === 'closed' && <div className="r-active-dot"></div>}
            </div>
          </div>

          <div className="db-table-wrap">
            <table className="db-table">
              <thead>
                <tr>
                  <th>S.No.</th><th>Key</th><th>FY</th><th>Business</th><th>Area</th>
                  <th>Observation</th><th>Management Comment</th><th>Person Responsible</th>
                  <th>Person Resp. (AC)</th><th>Remarks</th><th>Closing Period</th>
                  <th>Status</th><th>TAT</th><th>Created On</th>
                </tr>
              </thead>
              <tbody>
                {reportFiltered.length === 0 ? (
                  <tr><td colSpan={14} className="db-empty">No data.</td></tr>
                ) : reportFiltered.map((row, i) => (
                  <tr key={row._id}>
                    <td className="td-center">{i + 1}</td>
                    <td><span className="key-badge">{row.uniqueKey}</span></td>
                    <td className="td-chip">{context.financialYear}</td>
                    <td className="td-chip">{context.business}</td>
                    <td>{row.area}</td>
                    <td>{row.observation}</td>
                    <td>{row.managerComment}</td>
                    <td>{row.personResponsible}</td>
                    <td>{row.personResponsibilityAsPerAC}</td>
                    <td>
  <div>{row.remarks || '—'}</div>
  {row.attachment && (
    <a href={row.attachment} download={row.attachmentName}
      style={{fontSize:'10px', color:'#2563eb', textDecoration:'none', fontWeight:500}}>
      ⬇ {row.attachmentName?.substring(0, 20)}
    </a>
  )}
</td>
                    <td style={{fontWeight:600,color:'#dc2626'}}>{row.closingPeriod ? new Date(row.closingPeriod).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</td>
                    <td>
                      <span className={`status-pill ${row.status === 'Closed' ? 'closed' : 'open'}`}>
                        <span className="status-dot"></span>
                        {row.status}
                      </span>
                    </td>
                    <td>
                      {(() => {
                        const tat = calcTAT(row);
                        if (!tat) return <span style={{color:'#94a3b8',fontSize:'11px'}}>—</span>;
                        if (tat.type === 'closed') return <span className="tat-badge tat-closed">{tat.days}d</span>;
                        if (tat.type === 'overdue') return <span className="tat-badge tat-overdue">+{tat.days}d overdue</span>;
                        if (tat.type === 'urgent') return <span className="tat-badge tat-urgent">{tat.days}d ⚠</span>;
                        return <span className="tat-badge tat-normal">{tat.days}d left</span>;
                      })()}
                    </td>
                    <td className="td-date">{new Date(row.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}