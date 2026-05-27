const API_BASE = process.env.REACT_APP_API_URL || '/api';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

export const notesApi = {
  getAll: (search = '') =>
    request(`/notes${search ? `?search=${encodeURIComponent(search)}` : ''}`),

  getById: (id) => request(`/notes/${id}`),

  create: (note) =>
    request('/notes', { method: 'POST', body: JSON.stringify(note) }),

  update: (id, note) =>
    request(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(note) }),

  delete: (id) =>
    request(`/notes/${id}`, { method: 'DELETE' }),
};

export const healthApi = {
  check: () => fetch('/health').then(r => r.json()).catch(() => ({ status: 'offline' }))
};
