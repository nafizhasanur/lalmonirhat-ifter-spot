const API_URL = "https://script.google.com/macros/s/AKfycbwoOnQUNgSAupzZVc_i0tjq3mCWiAUvfvV09oXiUB4OAKtX00n6WE8D_IrEiG8Piugv/exec";

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

// Global functions for popup onclick (vote + addFoodToMosque)
window.vote = async function(id, type) {
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
    loadSpots(); // vote এর পর auto update
  } catch (err) {
    alert('ভোট দেওয়া যায়নি: ' + err.message);
  }
};

window.addFoodToMosque = function(id, name, lat, lng) {
  currentEditId = id;
  pendingLat = lat;
  pendingLng = lng;
  document.getElementById('name').value = name;
  document.getElementById('name').disabled = true;
  document.getElementById('add-modal').style.display = 'flex';
  document.querySelector('.modal-content h2').textContent = 'মসজিদে খাবার যোগ করুন';
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

  // অটো রিফ্রেশ - প্রতি ১০ সেকেন্ডে নতুন ডাটা চেক করবে (সব device-এ update দেখাবে)
  setInterval(() => {
    console.log('Auto refreshing spots...');
    loadSpots();
  }, 10000);

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
        body: JSON.stringify({ action: currentEditId ? "edit" : "add", id: currentEditId, ...spot })
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
    console.log('Parsed spots count:', spots.length);
    renderSpots();
  } catch (err) {
    console.error("Spots load error:", err.message);
    document.getElementById('spots-list').innerHTML = '<p style="color:red;">স্পট লোড হয়নি। Console দেখুন।</p>';
  }
}

function renderSpots() {
  console.log('Rendering spots - count:', spots.length);

  // পুরোনো মার্কার সব মুছে ফেলা
  map.eachLayer(layer => {
    if (layer instanceof L.Marker) map.removeLayer(layer);
  });

  spots.forEach(spot => {
    const emoji = foodIcons[spot.food] || '🕌';
    const lat = parseFloat(spot.lat);
    const lng = parseFloat(spot.lng);

    if (isNaN(lat) || isNaN(lng)) {
      console.warn('Invalid lat/lng for spot:', spot.name);
      return;
    }

    // বড় গোলাকার আইকন (তোমার স্ক্রিনশটের মতো)
    const icon = L.divIcon({
      html: `
        <div style="
          width: 48px;
          height: 48px;
          background: white;
          border: 3px solid #333;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          box-shadow: 0 4px 8px rgba(0,0,0,0.4);
          animation: pulse 2s infinite;
        ">
          ${emoji}
        </div>
      `,
      className: '', // খালি রাখা যাতে Leaflet extra style না দেয়
      iconSize: [48, 48],
      iconAnchor: [24, 24], // কেন্দ্র থেকে anchor
      popupAnchor: [0, -24]
    });

    const marker = L.marker([lat, lng], { icon }).addTo(map);

    let popupContent = `<b>${spot.name}</b><br>খাবার: ${spot.food || 'মসজিদ'}<br><br>`;

    if (spot.food && spot.food !== 'মসজিদ') {
      popupContent += `
        <div class="vote-box">
          <button class="vote-btn green" onclick="vote('${spot.id}', 'sotto')">সত্য (${spot.sotto})</button>
          <button class="vote-btn red" onclick="vote('${spot.id}', 'mittha')">মিথ্যা (${spot.mittha})</button>
        </div>`;
    } else {
      popupContent += '<button onclick="addFoodToMosque(\'' + spot.id + '\',\'' + spot.name + '\',' + lat + ',' + lng + ')">খাবার যোগ করুন</button>';
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
  document.getElementById('name').disabled = true;
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
  if (el) {
    el.textContent = msg;
    el.className = 'status ' + type;
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

// Admin editSpot function (নতুন যোগ করা)
async function editSpot(id) {
  const name = prompt('নতুন নাম:', '');
  const food = prompt('নতুন খাবার:', '');
  const latStr = prompt('নতুন Lat:', '');
  const lngStr = prompt('নতুন Lng:', '');
  const sotto = prompt('নতুন সত্য:', '');
  const mittha = prompt('নতুন মিথ্যা:', '');

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  if (name && food && !isNaN(lat) && !isNaN(lng)) {
    const spot = {
      id,
      name,
      food,
      lat,
      lng,
      sotto: parseInt(sotto) || 0,
      mittha: parseInt(mittha) || 0
    };

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: "edit", ...spot })
      });
      const text = await res.text();
      console.log('Edit response:', text);
      if (!res.ok) throw new Error('Edit failed');
      alert('এডিট হয়েছে!');
      loadSpots(); // admin list refresh
    } catch (err) {
      alert('এডিট হয়নি: ' + err.message);
    }
  } else {
    alert('সব তথ্য ঠিকমতো দিন (Lat/Lng number হতে হবে)');
  }
}