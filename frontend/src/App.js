import React, { useState, useEffect, useCallback, useRef } from 'react';
import NoteCard from './components/NoteCard';
import NoteForm from './components/NoteForm';
import { notesApi } from './services/api';
import './App.css';

const VERSION = process.env.REACT_APP_VERSION || '1.0.0';

export default function App() {
  const [notes, setNotes]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState(null);
  const [search, setSearch]       = useState('');
  const [showForm, setShowForm]   = useState(false);
  const [editNote, setEditNote]   = useState(null);
  const [toast, setToast]         = useState(null);
  const searchTimer               = useRef(null);

  // ── Data Fetching ─────────────────────────────────────────────────────────
  const fetchNotes = useCallback(async (q = search) => {
    try {
      const res = await notesApi.getAll(q);
      setNotes(res.data || []);
      setError(null);
    } catch (err) {
      setError('Could not load notes. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchNotes(''); }, []);  // initial load, ignore search dep

  // ── Debounced Search ──────────────────────────────────────────────────────
  function handleSearch(value) {
    setSearch(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchNotes(value), 350);
  }

  // ── Toast Helper ──────────────────────────────────────────────────────────
  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  }

  // ── CRUD Operations ───────────────────────────────────────────────────────
  async function handleSave(formData) {
    setSaving(true);
    try {
      if (editNote?.id) {
        await notesApi.update(editNote.id, formData);
        showToast('Note updated ✓');
      } else {
        await notesApi.create(formData);
        showToast('Note created ✓');
      }
      setShowForm(false);
      setEditNote(null);
      await fetchNotes();
    } catch (err) {
      showToast(err.message || 'Failed to save note', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await notesApi.delete(id);
      setNotes(n => n.filter(note => note.id !== id));
      showToast('Note deleted');
    } catch (err) {
      showToast('Failed to delete note', 'error');
    }
  }

  async function handleTogglePin(note) {
    try {
      await notesApi.update(note.id, { ...note, pinned: note.pinned ? 0 : 1 });
      await fetchNotes();
    } catch {
      showToast('Failed to update note', 'error');
    }
  }

  function openEdit(note) {
    setEditNote(note);
    setShowForm(true);
  }

  function openNew() {
    setEditNote(null);
    setShowForm(true);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const pinned   = notes.filter(n => n.pinned === 1);
  const unpinned = notes.filter(n => n.pinned === 0);

  return (
    <div className="app">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <span className="brand-logo">◈</span>
            <div>
              <h1 className="brand-title">Notes</h1>
              <span className="brand-sub">Think Clearly</span>
            </div>
          </div>

          <div className="search-wrap">
            <span className="search-icon">⌕</span>
            <input
              className="search-input"
              type="search"
              placeholder="Search notes…"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              aria-label="Search notes"
            />
            {search && (
              <button className="search-clear" onClick={() => handleSearch('')} aria-label="Clear search">
                ×
              </button>
            )}
          </div>

          <button className="new-btn" onClick={openNew} aria-label="Create new note">
            <span className="new-btn-icon">+</span>
            <span>New Note</span>
          </button>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <main className="main">

        {/* Error Banner */}
        {error && (
          <div className="error-banner" role="alert">
            <span>⚠</span> {error}
            <button onClick={() => fetchNotes()} className="retry-btn">Retry</button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="notes-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton-card" style={{ animationDelay: `${i * 0.08}s` }} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && notes.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">◈</div>
            <h2>{search ? `No notes match "${search}"` : 'Your canvas is empty'}</h2>
            <p>{search ? 'Try a different search term.' : 'Click New Note to capture your first idea.'}</p>
            {!search && (
              <button className="new-btn" onClick={openNew} style={{ marginTop: 24 }}>
                <span>+</span> Create your first note
              </button>
            )}
          </div>
        )}

        {/* Pinned notes */}
        {!loading && pinned.length > 0 && (
          <section className="notes-section">
            <h2 className="section-label">📌 Pinned</h2>
            <div className="notes-grid">
              {pinned.map(note => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onTogglePin={handleTogglePin}
                />
              ))}
            </div>
          </section>
        )}

        {/* Other notes */}
        {!loading && unpinned.length > 0 && (
          <section className="notes-section">
            {pinned.length > 0 && <h2 className="section-label">📝 Notes</h2>}
            <div className="notes-grid">
              {unpinned.map(note => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onTogglePin={handleTogglePin}
                />
              ))}
            </div>
          </section>
        )}

      </main>

      {/* ── Note Count Footer ───────────────────────────────────────────── */}
      {!loading && notes.length > 0 && (
        <footer className="count-footer">
          <span>{notes.length} note{notes.length !== 1 ? 's' : ''}</span>
          <span className="version-badge">v{VERSION}</span>
        </footer>
      )}

      {/* ── Note Form Modal ─────────────────────────────────────────────── */}
      {showForm && (
        <NoteForm
          note={editNote}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditNote(null); }}
          isLoading={saving}
        />
      )}

      {/* ── Toast Notification ──────────────────────────────────────────── */}
      {toast && (
        <div className={`toast toast-${toast.type}`} role="status" aria-live="polite">
          {toast.type === 'success' ? '✓' : '⚠'} {toast.msg}
        </div>
      )}
    </div>
  );
}
