import React, { useState, useEffect, useRef } from 'react';
import styles from './NoteForm.module.css';

const NOTE_COLORS = [
  { label: 'Default', value: '#ffffff' },
  { label: 'Sunlight', value: '#fef9c3' },
  { label: 'Mint',    value: '#dcfce7' },
  { label: 'Sky',     value: '#dbeafe' },
  { label: 'Blush',   value: '#fce7f3' },
  { label: 'Lavender',value: '#ede9fe' },
  { label: 'Peach',   value: '#ffedd5' },
];

export default function NoteForm({ note, onSave, onClose, isLoading }) {
  const isEdit = Boolean(note?.id);
  const [form, setForm] = useState({
    title:   note?.title   || '',
    content: note?.content || '',
    color:   note?.color   || '#ffffff',
    pinned:  note?.pinned  || 0,
  });
  const titleRef = useRef(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  function handleKeyDown(e) {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(e);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() && !form.content.trim()) return;
    onSave({ ...form, title: form.title.trim() || 'Untitled' });
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit note' : 'New note'}>

        {/* Header */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {isEdit ? '✏️ Edit Note' : '✨ New Note'}
          </h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className={styles.form}>
          <input
            ref={titleRef}
            className={styles.titleInput}
            type="text"
            placeholder="Note title..."
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            maxLength={120}
          />

          <textarea
            className={styles.contentInput}
            placeholder="Start writing... (Ctrl+Enter to save)"
            value={form.content}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            rows={8}
          />

          {/* Color Picker */}
          <div className={styles.colorSection}>
            <span className={styles.colorLabel}>Color</span>
            <div className={styles.colorPicker}>
              {NOTE_COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  className={`${styles.colorSwatch} ${form.color === c.value ? styles.colorSelected : ''}`}
                  style={{ '--swatch-color': c.value }}
                  onClick={() => setForm(f => ({ ...f, color: c.value }))}
                  title={c.label}
                  aria-label={`${c.label} color${form.color === c.value ? ' (selected)' : ''}`}
                />
              ))}
            </div>
          </div>

          {/* Pin toggle */}
          <label className={styles.pinToggle}>
            <input
              type="checkbox"
              checked={!!form.pinned}
              onChange={e => setForm(f => ({ ...f, pinned: e.target.checked ? 1 : 0 }))}
            />
            <span>📌 Pin this note</span>
          </label>

          {/* Actions */}
          <div className={styles.formActions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className={styles.saveBtn}
              disabled={isLoading || (!form.title.trim() && !form.content.trim())}
            >
              {isLoading ? (
                <span className={styles.spinner} aria-hidden="true" />
              ) : (
                isEdit ? 'Save Changes' : 'Create Note'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
