document.addEventListener('DOMContentLoaded', () => {
  let spots = JSON.parse(localStorage.getItem('spots')) || [];

  // লোড করা ডাটা দেখাও
  document.getElementById('dua-text').value = localStorage.getItem('dua') || '';
  document.getElementById('plan-text').value = localStorage.getItem('todaysPlan') || '';
  document.getElementById('hadith-text').value = localStorage.getItem('hadith') || '';
  document.getElementById('sehri-input').value = localStorage.getItem('sehriTime') || '05:30';
  document.getElementById('iftar-input').value = localStorage.getItem('iftarTime') || '18:05';

  // সেভ বাটন
  document.getElementById('save-dua').onclick = () => {
    const text = document.getElementById('dua-text').value.trim();
    if (text) {
      localStorage.setItem('dua', text);
      document.getElementById('dua-saved').textContent = 'সেভ হয়েছে!';
    }
  };

  document.getElementById('save-plan').onclick = () => {
    const text = document.getElementById('plan-text').value.trim();
    if (text) {
      localStorage.setItem('todaysPlan', text);
      document.getElementById('plan-saved').textContent = 'সেভ হয়েছে!';
    }
  };

  document.getElementById('save-hadith').onclick = () => {
    const text = document.getElementById('hadith-text').value.trim();
    if (text) {
      localStorage.setItem('hadith', text);
      document.getElementById('hadith-saved').textContent = 'সেভ হয়েছে!';
    }
  };

  document.getElementById('save-time').onclick = () => {
    const sehri = document.getElementById('sehri-input').value.trim();
    const iftar = document.getElementById('iftar-input').value.trim();
    if (sehri && iftar) {
      localStorage.setItem('sehriTime', sehri);
      localStorage.setItem('iftarTime', iftar);
      document.getElementById('time-saved').textContent = 'সেভ হয়েছে!';
    }
  };

  // স্পট যোগ
  document.getElementById('add-spot-btn').onclick = () => {
    const name = document.getElementById('add-name').value.trim();
    const food = document.getElementById('add-food').value.trim();
    const lat = parseFloat(document.getElementById('add-lat').value);
    const lng = parseFloat(document.getElementById('add-lng').value);
    if (name && food && !isNaN(lat) && !isNaN(lng)) {
      const spot = {
        id: Date.now().toString(),
        name,
        food,
        lat,
        lng,
        sotto: 0,
        mittha: 0
      };
      spots.push(spot);
      localStorage.setItem('spots', JSON.stringify(spots));
      document.getElementById('add-saved').textContent = 'স্পট যোগ হয়েছে!';
      location.reload();
    } else {
      alert('সব তথ্য দিন!');
    }
  };

  // স্পট টেবিল
  const tbody = document.getElementById('spot-body');
  tbody.innerHTML = '';
  spots.forEach(spot => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${spot.name}</td>
      <td>${spot.food}</td>
      <td>${spot.lat.toFixed(4)}, ${spot.lng.toFixed(4)}</td>
      <td>${spot.sotto}</td>
      <td>${spot.mittha}</td>
      <td>
        <button class="action-btn edit-btn" onclick="editSpot('${spot.id}')">এডিট</button>
        <button class="action-btn delete-btn" onclick="deleteSpot('${spot.id}')">ডিলিট</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
});

function editSpot(id) {
  const spots = JSON.parse(localStorage.getItem('spots')) || [];
  const spot = spots.find(s => s.id === id);
  if (spot) {
    const name = prompt('নতুন নাম:', spot.name);
    const food = prompt('নতুন খাবার:', spot.food);
    const sotto = prompt('নতুন সত্য:', spot.sotto);
    const mittha = prompt('নতুন মিথ্যা:', spot.mittha);
    if (name && food) {
      spot.name = name;
      spot.food = food;
      spot.sotto = parseInt(sotto) || 0;
      spot.mittha = parseInt(mittha) || 0;
      localStorage.setItem('spots', JSON.stringify(spots));
      alert('এডিট হয়েছে!');
      location.reload();
    }
  }
}

function deleteSpot(id) {
  if (confirm('ডিলিট করবেন?')) {
    let spots = JSON.parse(localStorage.getItem('spots')) || [];
    spots = spots.filter(s => s.id !== id);
    localStorage.setItem('spots', JSON.stringify(spots));
    alert('ডিলিট হয়েছে!');
    location.reload();
  }
}