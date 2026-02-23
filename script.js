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

  // add button etc.
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
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({ action: "add", ...spot })
      });
      if (!res.ok) throw new Error('Add failed');
      await loadSpots();
      closeModal();
      alert('স্পট যোগ হয়েছে!');
    } catch (err) {
      alert('যোগ হয়নি: ' + err.message);
    }
  };

  // Music auto-play fix
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
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      }
    });
    const config = await res.json();

    document.getElementById('dua-text').textContent = config.dua;
    document.getElementById('plan-text').textContent = config.plan;
    document.getElementById('hadith-text').textContent = config.hadith;

    localStorage.setItem('sehriTime', config.sehriTime);  // countdown-এর জন্য local-এ রাখা যায়
    localStorage.setItem('iftarTime', config.iftarTime);
  } catch (err) {
    console.error("Config load error:", err);
  }
}

async function loadSpots() {
  try {
    document.getElementById('spots-list').innerHTML = '<p>লোড হচ্ছে...</p>';
    const res = await fetch(API_URL + "?action=getAll", {
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      }
    });
    spots = await res.json();
    renderSpots();
  } catch (err) {
    document.getElementById('spots-list').innerHTML = '<p style="color:red;">স্পট লোড হয়নি।</p>';
  }
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