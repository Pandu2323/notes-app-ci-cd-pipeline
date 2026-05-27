import React, { useState } from 'react';
import styles from './NoteCard.module.css';

const PIN_ICON = '📌';
const NOTE_COLORS = [
  { label: 'White',  value: '#ffffff' },
  { label: 'Yellow', value: '#fef9c3' },
  { label: 'Green',  value: '#dcfce7' },
  { label: 'Blue',   value: '#dbeafe' },
  { label: 'Pink',   value: '#fce7f3' },
  { label: 'Purple', value: '#ede9fe' },
  { label: 'Orange', value: '#ffedd5' },
];

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)   return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NoteCard({ note, onEdit, onDelete, onTogglePin }) {
  const [showMenu, setShowMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const cardColor = NOTE_COLORS.find(c => c.value === note.color) ? note.color : '#ffffff';
  const isDark = false; // color picker colors are all light

  function handleDelete(e) {
    e.stopPropagation();
    if (confirmDelete) {
      onDelete(note.id);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  }

  return (
    <article
      className={styles.card}
      style={{ '--card-bg': cardColor }}
      onClick={() => onEdit(note)}
    >
      {/* Pin Badge */}
      {note.pinned === 1 && (
        <span className={styles.pinBadge} title="Pinned">{PIN_ICON}</span>
      )}

      {/* Content */}
      <header className={styles.header}>
        <h3 className={styles.title}>{note.title || 'Untitled'}</h3>
      </header>

      {note.content && (
        <p className={styles.content}>{note.content}</p>
      )}

      {/* Footer */}
      <footer className={styles.footer}>
        <time className={styles.time} dateTime={note.updated_at}>
          {timeAgo(note.updated_at)}
        </time>

        <div className={styles.actions} onClick={e => e.stopPropagation()}>
          <button
            className={styles.actionBtn}
            onClick={() => onTogglePin(note)}
            title={note.pinned ? 'Unpin' : 'Pin note'}
            aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
          >
            {note.pinned ? '📍' : '📌'}
          </button>

          <button
            className={styles.actionBtn}
            onClick={() => onEdit(note)}
            title="Edit note"
            aria-label="Edit note"
          >
            ✏️
          </button>

          <button
            className={`${styles.actionBtn} ${confirmDelete ? styles.confirmDelete : ''}`}
            onClick={handleDelete}
            title={confirmDelete ? 'Click again to confirm delete' : 'Delete note'}
            aria-label="Delete note"
          >
            {confirmDelete ? '⚠️' : '🗑️'}
          </button>
        </div>
      </footer>
    </article>
  );
}
