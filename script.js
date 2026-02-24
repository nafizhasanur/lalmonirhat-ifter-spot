const API_URL = "https://script.google.com/macros/s/AKfycbzdktu9biJ_PjsuLef-6rH3G3R0yRvrPBv0NUx_TSBFK22F8hzACn0grYMMsWmvXM3f/exec";

let map;
let spots = [];
let pendingLat, pendingLng, addingFromMap = false;
let currentEditId = null; // For adding food to mosque

const foodIcons = {
  'বিরিয়ানি': '🍲',
  'খিচুড়ি': '🍛',
  'ছোলা': '🧆',
  'পিয়াজু': '🥟',
  'জুস': '🍹',
  'খেজুর': '🌴',
  'Others': '🍽️',
};

document.addEventListener('DOMContentLoaded', async () => {
  map = L.map('map').setView([25.9167, 89.4500], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);

  await loadConfig();
  await loadSpots();

  updateDateTime();
  setInterval(updateTimers, 1000);

  document.getElementById('add-btn').onclick = () => {
    currentEditId = null; // New spot
    document.getElementById('name').disabled = false;
    document.getElementById('add-modal').style.display = 'flex';
  };

  document.querySelector('.close').onclick = closeModal;
  document.getElementById('add-modal').onclick = e => {
    if (e.target === document.getElementById('add-modal')) closeModal();
  };

  document.getElementById('food').onchange = e => {
    document.getElementById('other-food').style.display = e.target.value === 'Others' ? 'block' : 'none';
  };

  document.getElementById('gps-btn').onclick = getGPSLocation;
  document.getElementById('map-btn').onclick = () => {
    document.getElementById('add-modal').style.display = 'none';
    addingFromMap = true;
    showStatus('ম্যাপে ক্লিক করুন', 'info');
  };

  map.on('click', e => {
    if (addingFromMap) {
      pendingLat = e.latlng.lat;
      pendingLng = e.latlng.lng;
      addingFromMap = false;
      document.getElementById('add-modal').style.display = 'flex';
      showStatus('লোকেশন নির্বাচিত!', 'success');
    }
  });

  document.getElementById('add-form').onsubmit = async e => {
    e.preventDefault();
    if (!pendingLat || !pendingLng) return showStatus('লোকেশন দিন', 'error');

    let food = document.getElementById('food').value;
    if (food === 'Others') food = document.getElementById('other-food').value.trim() || 'অন্যান্য';

    const spot = {
      name: document.getElementById('name').value.trim(),
      food,
      lat: pendingLat,
      lng: pendingLng
    };

    try {
      let action = currentEditId ? "edit" : "add";
      const body = JSON.stringify({ action, id: currentEditId, ...spot });
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body
      });
      if (!res.ok) throw new Error('Operation failed');
      await loadSpots();
      closeModal();
      alert('স্পট যোগ/আপডেট হয়েছে!');
    } catch (err) {
      alert('যোগ হয়নি: ' + err.message);
    }
  };

  // Music control
  const music = document.getElementById('bg-music');
  if (music) {
    music.volume = 0.3;
    music.play().catch(() => {});
    document.getElementById('music-btn').onclick = () => {
      if (music.paused) {
        music.play();
        document.getElementById('music-btn').textContent = '||';
      } else {
        music.pause();
        document.getElementById('music-btn').textContent = '►';
      }
    };
  }
});

async function loadConfig() {
  try {
    const res = await fetch(API_URL + "?action=getConfig", {
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    if (!res.ok) throw new Error('Config failed');
    let text = await res.text();
    text = text.trim().replace(/^\uFEFF/, '');
    const config = JSON.parse(text);

    document.getElementById('dua-text').textContent = config.dua;
    document.getElementById('plan-text').textContent = config.plan;
    document.getElementById('hadith-text').textContent = config.hadith;

    const sehri = config.sehriTime || "05:30";
    const iftar = config.iftarTime || "18:05";
    localStorage.setItem('sehriTime', sehri);
    localStorage.setItem('iftarTime', iftar);
    document.getElementById('sehri-time').textContent = sehri;
    document.getElementById('iftar-time').textContent = iftar;
    updateTimers();
  } catch (err) {
    console.error("Config load error:", err);
    document.getElementById('sehri-time').textContent = "05:30";
    document.getElementById('iftar-time').textContent = "18:05";
    updateTimers();
  }
}

async function loadSpots() {
  try {
    document.getElementById('spots-list').innerHTML = '<p>লোড হচ্ছে...</p>';
    const res = await fetch(API_URL + "?action=getAll", {
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    if (!res.ok) throw new Error('Spots failed');
    let text = await res.text();
    text = text.trim().replace(/^\uFEFF/, '');
    spots = JSON.parse(text);
    renderSpots();
  } catch (err) {
    console.error("Spots load error:", err);
    document.getElementById('spots-list').innerHTML = '<p style="color:red;">স্পট লোড হয়নি।</p>';
  }
}

function renderSpots() {
  map.eachLayer(layer => {
    if (layer instanceof L.Marker) map.removeLayer(layer);
  });

  spots.forEach(spot => {
    const emoji = foodIcons[spot.food] || '🕌'; // Mosque icon if 'মসজিদ' or no food
    const icon = L.divIcon({
      className: 'custom-icon animate-pulse',
      html: `<span style="font-size: 32px;">${emoji}</span>`,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40]
    });

    const marker = L.marker([spot.lat, spot.lng], {icon}).addTo(map);
    let popupContent = `<b>${spot.name}</b><br>খাবার: ${spot.food || 'মসজিদ'}<br>`;

    if (spot.food && spot.food !== 'মসজিদ') {
      popupContent += `<div class="vote-box">
        <div class="vote-item">
          <button class="vote-btn green" onclick="vote('${spot.id}', 'sotto')">সত্য</button>
          <span>${spot.sotto}</span>
        </div>
        <div class="vote-item">
          <button class="vote-btn red" onclick="vote('${spot.id}', 'mittha')">মিথ্যা</button>
          <span>${spot.mittha}</span>
        </div>
      </div>`;
    } else {
      popupContent += '<button onclick="addFoodToMosque(\'' + spot.id + '\',\'' + spot.name + '\',' + spot.lat + ',' + spot.lng + ')">খাবার যোগ করুন</button>';
    }

    marker.bindPopup(popupContent);
  });

  const list = document.getElementById('spots-list');
  list.innerHTML = '';
  spots.forEach(spot => {
    const card = document.createElement('div');
    card.className = 'spot-card animate-fade';
    card.innerHTML = `
      <h3>${spot.name}</h3>
      <p>${foodIcons[spot.food] || '🕌'} ${spot.food || 'মসজিদ'}</p>
      <p>সত্য: ${spot.sotto} • মিথ্যা: ${spot.mittha}</p>
    `;
    card.onclick = () => map.setView([spot.lat, spot.lng], 16);
    list.appendChild(card);
  });
}

async function vote(id, type) {
  if (localStorage.getItem('voted_' + id)) return alert('আপনি ইতিমধ্যে ভোট দিয়েছেন!');
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: "vote", id, type })
    });
    if (!res.ok) throw new Error('Vote failed');
    localStorage.setItem('voted_' + id, 'true');
    alert('ভোট দেওয়া হয়েছে!');
    loadSpots();
  } catch (err) {
    alert('ভোট দেওয়া যায়নি: ' + err.message);
  }
}

function addFoodToMosque(id, name, lat, lng) {
  currentEditId = id;
  pendingLat = lat;
  pendingLng = lng;
  document.getElementById('name').value = name;
  document.getElementById('name').disabled = true; // Name not editable
  document.getElementById('add-modal').style.display = 'flex';
  document.querySelector('.modal-content h2').textContent = 'মসজিদে খাবার যোগ করুন';
}

function updateDateTime() {
  const now = new Date();
  document.getElementById('current-date').textContent = now.toLocaleDateString('bn-BD');
  document.getElementById('current-day').textContent = now.toLocaleDateString('bn-BD', { weekday: 'long' });
}

function updateTimers() {
  const sehri = localStorage.getItem('sehriTime') || '05:30';
  const iftar = localStorage.getItem('iftarTime') || '18:05';

  document.getElementById('sehri-time').textContent = sehri;
  document.getElementById('iftar-time').textContent = iftar;

  const [sehriH, sehriM] = sehri.split(':').map(Number);
  const [iftarH, iftarM] = iftar.split(':').map(Number);

  const sehriTime = new Date();
  sehriTime.setHours(sehriH, sehriM, 0);
  const iftarTime = new Date();
  iftarTime.setHours(iftarH, iftarM, 0);

  const now = new Date();
  document.getElementById('sehri-countdown').textContent = countdown(sehriTime - now);
  document.getElementById('iftar-countdown').textContent = countdown(iftarTime - now);
}

function countdown(ms) {
  if (ms <= 0) return 'সময় পার';
  const h = Math.floor(ms / 3600000).toString().padStart(2, '0');
  const m = Math.floor((ms % 3600000) / 60000).toString().padStart(2, '0');
  const s = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function closeModal() {
  document.getElementById('add-modal').style.display = 'none';
  document.getElementById('add-form').reset();
  document.getElementById('other-food').style.display = 'none';
  document.getElementById('name').disabled = false;
  document.querySelector('.modal-content h2').textContent = 'নতুন স্পট যোগ করুন';
  pendingLat = pendingLng = null;
  addingFromMap = false;
  currentEditId = null;
}

function showStatus(msg, type) {
  const el = document.getElementById('loc-status');
  el.textContent = msg;
  el.className = 'status ' + type;
}

function getGPSLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      pendingLat = pos.coords.latitude;
      pendingLng = pos.coords.longitude;
      showStatus('GPS দিয়ে লোকেশন নেওয়া হয়েছে!', 'success');
    }, () => showStatus('GPS পাওয়া যায়নি', 'error'));
  }
}