const API_URL = "https://script.google.com/macros/s/AKfycbxYYZV2xSFFb3YDz-CFenYIR8X6gQTbUmxv_LGiIZ2pqJHyrPTYlaj7N5J71ifQxps/exec";

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

  await loadSpots();

  updateDateTime();
  setInterval(updateTimers, 1000);
  loadDua();
  loadPlan();
  loadHadith();

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

  document.getElementById('gps-btn').onclick = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        pendingLat = pos.coords.latitude;
        pendingLng = pos.coords.longitude;
        showStatus('লোকেশন নির্বাচিত হয়েছে!', 'success');
      }, () => showStatus('GPS পাওয়া যায়নি', 'error'));
    }
  };

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
      showStatus('লোকেশন নির্বাচিত হয়েছে!', 'success');
    }
  });

  document.getElementById('add-form').onsubmit = async e => {
    e.preventDefault();
    if (!pendingLat || !pendingLng) return showStatus('লোকেশন দিন', 'error');

    let food = document.getElementById('food').value;
    if (food === 'Others') food = document.getElementById('other-food').value.trim() || 'অন্যান্য';

    const spot = {
      id: Date.now().toString(),
      name: document.getElementById('name').value.trim(),
      food,
      lat: pendingLat,
      lng: pendingLng,
      sotto: 0,
      mittha: 0
    };

    try {
      await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: "add",
          ...spot
        })
      });
      await loadSpots();
      closeModal();
      alert('স্পট যোগ হয়েছে!');
    } catch (err) {
      alert('স্পট যোগ হয়নি: ' + err.message);
    }
  };

  // মিউজিক অটো-প্লে
  const music = document.getElementById('bg-music');
  if (music) {
    music.volume = 0.3;
    music.muted = true;

    document.body.addEventListener('click', function enableAudio() {
      if (music.muted) {
        music.muted = false;
        if (music.paused) {
          music.play().catch(() => console.log('সাউন্ড চালু করতে ক্লিক করুন'));
        }
      }
      document.body.removeEventListener('click', enableAudio);
    }, { once: true });
  }
});

// স্পট লোড
async function loadSpots() {
  try {
    document.getElementById('spots-list').innerHTML = '<p style="text-align:center; color:#555;">লোড হচ্ছে... অপেক্ষা করুন</p>';
    const response = await fetch(API_URL + "?action=getAll");
    if (!response.ok) throw new Error("API রেসপন্স ঠিক নেই: " + response.status);
    spots = await response.json();
    renderSpots();
  } catch (error) {
    console.error("লোড এরর:", error);
    document.getElementById('spots-list').innerHTML = '<p style="text-align:center; color:red;">স্পট লোড হচ্ছে না। পরে চেষ্টা করুন।</p>';
  }

}

function renderSpots() {
  map.eachLayer(layer => {
    if (layer instanceof L.Marker) map.removeLayer(layer);
  });

  spots.forEach(spot => {
    const icon = L.divIcon({
      className: 'custom-icon',
      html: `<span style="font-size: 32px;">${foodIcons[spot.food] || '🍲'}</span>`,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40]
    });

    const marker = L.marker([spot.lat, spot.lng], {icon}).addTo(map);
    marker.bindPopup(`
      <b>${spot.name}</b><br>
      খাবার: ${spot.food}<br><br>
      <b>সত্য: ${spot.sotto}</b> 
      <button class="vote-btn green" onclick="vote('${spot.id}', 'sotto')">✔</button><br>
      <b>মিথ্যা: ${spot.mittha}</b> 
      <button class="vote-btn red" onclick="vote('${spot.id}', 'mittha')">✖</button>
    `);
  });

  renderSpotList();
}

function renderSpotList() {
  const list = document.getElementById('spots-list');
  list.innerHTML = '';
  spots.forEach(spot => {
    const card = document.createElement('div');
    card.className = 'spot-card';
    card.innerHTML = `
      <h3>${spot.name}</h3>
      <p>${spot.food}</p>
      <p>সত্য: ${spot.sotto} • মিথ্যা: ${spot.mittha}</p>
    `;
    card.onclick = () => map.setView([spot.lat, spot.lng], 16);
    list.appendChild(card);
  });
}

async function vote(id, type) {
  try {
    await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: "vote",
        id,
        type
      })
    });
    await loadSpots();
    alert('ভোট দেওয়া হয়েছে!');
  } catch (err) {
    alert('ভোট দেওয়া যায়নি: ' + err.message);
  }
}

function closeModal() {
  document.getElementById('add-modal').style.display = 'none';
  document.getElementById('add-form').reset();
  document.getElementById('other-food').style.display = 'none';
  pendingLat = pendingLng = null;
  addingFromMap = false;
}

function showStatus(msg, type) {
  const el = document.getElementById('loc-status');
  el.textContent = msg;
  el.className = 'status ' + type;
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

function loadDua() {
  const savedDua = localStorage.getItem('dua') || "আল্লাহুম্মা ইন্নাকা আফুয়্যুন তুহিব্বুল আফওয়া ফা'ফু আন্না।";
  document.getElementById('dua-text').textContent = savedDua;
}

function loadPlan() {
  const savedPlan = localStorage.getItem('todaysPlan') || "আজকের প্ল্যান: রোজা রাখুন, নামাজ পড়ুন, দান করুন।";
  document.getElementById('plan-text').textContent = savedPlan;
}

function loadHadith() {
  const savedHadith = localStorage.getItem('hadith') || "রাসূলুল্লাহ (সা.) বলেছেন: যে ব্যক্তি রমজানের রোজা রাখে ঈমান ও ইহতিসাবের সাথে, তার অতীত গুনাহ মাফ করে দেওয়া হয়। - বুখারী";
  document.getElementById('hadith-text').textContent = savedHadith;
}