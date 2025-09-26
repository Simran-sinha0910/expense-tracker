// frontend/js/profile.js
(function initProfile() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }
  loadProfile();
})();

async function loadProfile() {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch('http://localhost:5000/api/user/me', {
      headers: { Authorization: 'Bearer ' + token },
    });
    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem('token');
        return (window.location.href = 'login.html');
      }
      let msg = 'Failed to load profile';
      try { const body = await res.json(); if (body && body.message) msg = body.message; } catch {}
      throw new Error(msg);
    }
    const user = await res.json();

    document.getElementById('profName').value = user.name || '';
    document.getElementById('profEmail').value = user.email || '';

    const meta = document.getElementById('profileMeta');
    if (meta) {
      const created = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '';
      const updated = user.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : '';
      meta.textContent = `Member since ${created}${updated ? ' • Updated ' + updated : ''}`;
    }
  } catch (err) {
    showProfileAlert('danger', err.message || 'Error loading profile');
  }
}

async function updateProfile() {
  const token = localStorage.getItem('token');
  const name = document.getElementById('profName').value.trim();
  const email = document.getElementById('profEmail').value.trim();
  const password = document.getElementById('profPassword').value;

  if (!name || !email) {
    return showProfileAlert('warning', 'Name and Email are required');
  }

  try {
    const res = await fetch('http://localhost:5000/api/user/me', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify({ name, email, password }),
    });

    let data = null;
    try { data = await res.json(); } catch {}
    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem('token');
        return (window.location.href = 'login.html');
      }
      const msg = (data && data.message) ? data.message : 'Failed to update profile';
      throw new Error(msg);
    }

    document.getElementById('profPassword').value = '';
    showProfileAlert('success', 'Profile updated successfully');
    loadProfile();
  } catch (err) {
    showProfileAlert('danger', err.message || 'Error updating profile');
  }
}

function showProfileAlert(type, message) {
  const el = document.getElementById('profileAlert');
  if (!el) return;
  el.className = `alert alert-${type}`;
  el.textContent = message;
  el.classList.remove('d-none');
  setTimeout(() => {
    el.classList.add('d-none');
  }, 3000);
}
