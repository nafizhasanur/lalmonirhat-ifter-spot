const API_URL = "https://script.google.com/macros/s/AKfycbwNQtj1E56nCzkphsHP7VLiUvLyTej376BujqVKLzCJpIeBu9glDsfIuCM01KXVTXrz/exec";

let map;
let spots = [];
let pendingLat, pendingLng, addingFromMap = false;

const foodIcons = {
  'বিরিয়ানি': '🍲',
  'খিচুড়ি': '🍛',
  'ছোলা': '🧆',
  'পিয়াজু': '🥟',
  'জুস': '🍹',
  'খেজুর': '🌴',
  'Others': '🍽️'
};

document.addEventListener('DOMContentLoaded', async () => {
  map = L.map('map').setView([25.9167, 89.4500], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);

  await Promise.all([
    loadSpots(),
    loadConfig()
  ]);

  updateDateTime();
  setInterval(updateTimers, 1000);

  document.getElementById('add-btn').onclick = () => {
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
    showStatus('ম্যাপে ক্লিক করুন লোকেশন নির্বাচন করতে', 'info');
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
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: "add", ...spot })
      });
      const text = await res.text();
      console.log('Add response:', text);
      if (!res.ok) throw new Error('Add failed');
      await loadSpots();
      closeModal();
      alert('স্পট যোগ হয়েছে!');
    } catch (err) {
      console.error('Add error:', err);
      alert('যোগ হয়নি: ' + err.message);
    }
  };

  const music = document.getElementById('bg-music');
  if (music) {
    music.volume = 0.3;
    music.muted = true;
    document.body.addEventListener('click', () => {
      music.muted = false;
      music.play().catch(() => {});
    }, { once: true });
  }
});

async function loadConfig() {
  try {
    const res = await fetch(API_URL + "?action=getConfig", {
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    if (!res.ok) throw new Error('Config fetch failed ' + res.status);
    let text = await res.text();
    text = text.trim().replace(/^\uFEFF/, '');
    console.log('Config raw:', text);
    const config = JSON.parse(text);

    document.getElementById('dua-text').textContent = config.dua || "দোয়া লোড হয়নি";
    document.getElementById('plan-text').textContent = config.plan || "প্ল্যান লোড হয়নি";
    document.getElementById('hadith-text').textContent = config.hadith || "হাদিস লোড হয়নি";

    const sehri = config.sehriTime || "05:30";
    const iftar = config.iftarTime || "18:05";
    localStorage.setItem('sehriTime', sehri);
    localStorage.setItem('iftarTime', iftar);

    document.getElementById('sehri-time').textContent = sehri;
    document.getElementById('iftar-time').textContent = iftar;

    updateTimers(); // force countdown update
  } catch (err) {
    console.error("Config error:", err);
  }
}

async function loadSpots() {
  try {
    document.getElementById('spots-list').innerHTML = '<p>লোড হচ্ছে...</p>';
    const res = await fetch(API_URL + "?action=getAll", {
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    if (!res.ok) throw new Error('Spots fetch failed ' + res.status);
    let text = await res.text();
    text = text.trim().replace(/^\uFEFF/, '');
    console.log('Spots raw:', text);
    spots = JSON.parse(text);
    console.log('Loaded spots count:', spots.length);
    renderSpots();
  } catch (err) {
    console.error("Spots error:", err);
    document.getElementById('spots-list').innerHTML = '<p style="color:red;">স্পট লোড হয়নি। (console দেখুন)</p>';
  }
}

function renderSpots() {
  console.log('Rendering spots, count:', spots.length);

  // Clear old markers
  map.eachLayer(layer => {
    if (layer instanceof L.Marker) map.removeLayer(layer);
  });

  spots.forEach(spot => {
    const emoji = foodIcons[spot.food] || '🍲';
    console.log('Marker for:', spot.name, emoji);

    const icon = L.divIcon({
      html: `<span style="font-size:32px;">${emoji}</span>`,
      className: '',
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40]
    });

    L.marker([spot.lat, spot.lng], {icon}).addTo(map)
      .bindPopup(`<b>${spot.name}</b><br>খাবার: ${spot.food}<br>সত্য: ${spot.sotto} • মিথ্যা: ${spot.mittha}`);
  });

  // List render
  const list = document.getElementById('spots-list');
  list.innerHTML = '';
  spots.forEach(spot => {
    const card = document.createElement('div');
    card.style = 'background:white; border:1px solid #ccc; padding:10px; margin:10px 0; border-radius:8px; cursor:pointer;';
    card.innerHTML = `
      <h3>${spot.name}</h3>
      <p>${foodIcons[spot.food] || '🍲'} ${spot.food}</p>
      <p>সত্য: ${spot.sotto} • মিথ্যা: ${spot.mittha}</p>
    `;
    card.onclick = () => map.setView([spot.lat, spot.lng], 16);
    list.appendChild(card);
  });
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

// তোমার অন্য ফাংশনগুলো (updateDateTime, updateTimers, countdown, vote, closeModal, showStatus) আগের মতো রাখো
// যদি vote বা অন্য কোনো না থাকে, বলো আমি যোগ করে দিবো