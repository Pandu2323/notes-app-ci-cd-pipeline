const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database');

const router = express.Router();

// GET /api/notes — list all notes (newest first, pinned first)
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { search } = req.query;

    let query = 'SELECT * FROM notes';
    const params = [];

    if (search && search.trim()) {
      query += ' WHERE (title LIKE ? OR content LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    query += ' ORDER BY pinned DESC, updated_at DESC';

    const notes = db.prepare(query).all(...params);
    res.json({ success: true, data: notes, count: notes.length });
  } catch (err) {
    console.error('GET /notes error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch notes' });
  }
});

// GET /api/notes/:id — single note
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
    if (!note) return res.status(404).json({ success: false, error: 'Note not found' });
    res.json({ success: true, data: note });
  } catch (err) {
    console.error('GET /notes/:id error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch note' });
  }
});

// POST /api/notes — create note
router.post('/', (req, res) => {
  try {
    const db = getDb();
    const { title = 'Untitled', content = '', color = '#ffffff', pinned = 0 } = req.body;

    if (typeof title !== 'string' || typeof content !== 'string') {
      return res.status(400).json({ success: false, error: 'title and content must be strings' });
    }

    const id = uuidv4();
    db.prepare(
      'INSERT INTO notes (id, title, content, color, pinned) VALUES (?, ?, ?, ?, ?)'
    ).run(id, title.trim(), content.trim(), color, pinned ? 1 : 0);

    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: note });
  } catch (err) {
    console.error('POST /notes error:', err);
    res.status(500).json({ success: false, error: 'Failed to create note' });
  }
});

// PUT /api/notes/:id — update note
router.put('/:id', (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Note not found' });

    const {
      title = existing.title,
      content = existing.content,
      color = existing.color,
      pinned = existing.pinned
    } = req.body;

    db.prepare(
      'UPDATE notes SET title = ?, content = ?, color = ?, pinned = ? WHERE id = ?'
    ).run(title.trim(), content.trim(), color, pinned ? 1 : 0, req.params.id);

    const updated = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('PUT /notes/:id error:', err);
    res.status(500).json({ success: false, error: 'Failed to update note' });
  }
});

// DELETE /api/notes/:id — delete note
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ success: false, error: 'Note not found' });
    res.json({ success: true, message: 'Note deleted' });
  } catch (err) {
    console.error('DELETE /notes/:id error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete note' });
  }
});

module.exports = router;
