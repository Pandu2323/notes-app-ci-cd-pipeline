const request = require('supertest');
const app = require('../src/index');
const { closeDb } = require('../src/database');

afterAll(() => {
  closeDb();
});

describe('Health Check', () => {
  it('GET /health returns 200 with status healthy', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });
});

describe('Notes API', () => {
  let createdId;

  it('GET /api/notes returns empty array initially', async () => {
    const res = await request(app).get('/api/notes');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('POST /api/notes creates a new note', async () => {
    const res = await request(app).post('/api/notes').send({
      title: 'Test Note',
      content: 'This is a test note content',
      color: '#fef9c3'
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Test Note');
    expect(res.body.data.id).toBeDefined();
    createdId = res.body.data.id;
  });

  it('GET /api/notes/:id retrieves the created note', async () => {
    const res = await request(app).get(`/api/notes/${createdId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(createdId);
  });

  it('PUT /api/notes/:id updates the note', async () => {
    const res = await request(app).put(`/api/notes/${createdId}`).send({
      title: 'Updated Title',
      content: 'Updated content here'
    });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Updated Title');
  });

  it('GET /api/notes?search= filters notes', async () => {
    const res = await request(app).get('/api/notes?search=Updated');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('DELETE /api/notes/:id deletes the note', async () => {
    const res = await request(app).delete(`/api/notes/${createdId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/notes/:id returns 404 for deleted note', async () => {
    const res = await request(app).get(`/api/notes/${createdId}`);
    expect(res.status).toBe(404);
  });

  it('POST /api/notes returns 400 for invalid data', async () => {
    const res = await request(app).post('/api/notes').send({
      title: 123,
      content: null
    });
    expect(res.status).toBe(400);
  });
});
