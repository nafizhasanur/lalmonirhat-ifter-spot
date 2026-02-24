const API_URL = "https://script.google.com/macros/s/AKfycbw0GYUoDspZNPYKFewCV-D7DYTZMhCc4pCDarSqSdTe1b22a2HYpnX2xaQmvFe98cYN/exec";

let map;
let spots = [];
let pendingLat, pendingLng, addingFromMap = false;
let currentEditId = null;

const foodIcons = {
  'বিরিয়ানি': '🍲',
  'খিচুড়ি': '🍛',
  'ছোলা': '🧆',
  'পিয়াজু': '🥟',
  'জুস': '🍹',
  'খেজুর': '🌴',
  'Others': '🍽️',
  'মসজিদ': '🕌'
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
    currentEditId = null;
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
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: currentEditId ? "edit" : "add", id: currentEditId, ...spot })
      });
      if (!res.ok) throw new Error('Add failed');
      await loadSpots();
      closeModal();
      alert('স্পট যোগ হয়েছে!');
    } catch (err) {
      alert('যোগ হয়নি: ' + err.message);
    }
  };

  const music = document.getElementById('bg-music');
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
    console.log('Spots raw response:', text);
    spots = JSON.parse(text);
    console.log('Parsed spots:', spots);
    renderSpots();
  } catch (err) {
    console.error("Spots load error:", err.message);
    document.getElementById('spots-list').innerHTML = '<p style="color:red;">স্পট লোড হয়নি।</p>';
  }
}

function renderSpots() {
  console.log('renderSpots called, spots count:', spots.length);

  // পুরোনো মার্কার সব মুছে ফেলা
  map.eachLayer(layer => {
    if (layer instanceof L.Marker) map.removeLayer(layer);
  });

  spots.forEach(spot => {
    const emoji = foodIcons[spot.food] || '🕌';
    console.log('Adding marker:', spot.name, emoji, spot.lat, spot.lng);

    const icon = L.divIcon({
      html: `<span style="font-size: 36px; display: block; text-align: center;">${emoji}</span>`,
      className: 'custom-icon', // className খালি না রেখে 'custom-icon' দিলে ভালো কাজ করে
      iconSize: [50, 50],
      iconAnchor: [25, 50],
      popupAnchor: [0, -50]
    });

    const marker = L.marker([parseFloat(spot.lat), parseFloat(spot.lng)], { icon }).addTo(map);

    let popupContent = `<b>${spot.name}</b><br>খাবার: ${spot.food || 'মসজিদ'}<br><br>`;

    if (spot.food && spot.food !== 'মসজিদ') {
      popupContent += `
        <div class="vote-box">
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

  // List-এ শুধু খাবার স্পট দেখানো (mosque বাদ)
  const list = document.getElementById('spots-list');
  list.innerHTML = '';
  const foodSpots = spots.filter(spot => spot.food && spot.food !== 'মসজিদ');
  foodSpots.forEach(spot => {
    const card = document.createElement('div');
    card.className = 'spot-card';
    card.innerHTML = `
      <h3>${spot.name}</h3>
      <p>${spot.food}</p>
      <p>সত্য: ${spot.sotto} • মিথ্যা: ${spot.mittha}</p>
    `;
    card.onclick = () => map.setView([parseFloat(spot.lat), parseFloat(spot.lng)], 16);
    list.appendChild(card);
  });
}

// বাকি ফাংশনগুলো (vote, addFoodToMosque, updateDateTime, updateTimers, countdown, closeModal, showStatus, getGPSLocation) আগের মতো রাখো