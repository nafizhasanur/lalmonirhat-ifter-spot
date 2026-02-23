let map;
let spots = JSON.parse(localStorage.getItem('spots')) || [];
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

document.addEventListener('DOMContentLoaded', () => {
  map = L.map('map').setView([25.9167, 89.4500], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);

  renderSpots();
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

  document.getElementById('add-form').onsubmit = e => {
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

    spots.push(spot);
    localStorage.setItem('spots', JSON.stringify(spots));
    renderSpots();
    closeModal();
    alert('স্পট যোগ হয়েছে!');
  };

  // ব্যাকগ্রাউন্ড মিউজিক কন্ট্রোল (এখানে যোগ করা হয়েছে)
  const music = document.getElementById('bg-music');
  const playPauseBtn = document.getElementById('play-pause-btn');
  const muteBtn = document.getElementById('mute-btn');

  let isPlaying = false;
  let isMuted = false;

  // প্রথমে muted রাখা (ব্রাউজার পলিসি)
  music.muted = true;
  music.volume = 0.3; // হালকা ভলিউম

  playPauseBtn.onclick = () => {
    if (isPlaying) {
      music.pause();
      playPauseBtn.textContent = '▶';
      playPauseBtn.classList.remove('playing');
    } else {
      music.play().catch(() => {
        alert('ব্রাউজারে সাউন্ড চালু করতে ক্লিক করুন');
      });
      playPauseBtn.textContent = '⏸';
      playPauseBtn.classList.add('playing');
    }
    isPlaying = !isPlaying;
  };

  muteBtn.onclick = () => {
    music.muted = !music.muted;
    muteBtn.textContent = music.muted ? '🔇' : '🔊';
    isMuted = music.muted;
  };

  // প্রথম ইউজার ইন্টারেকশনের পর সাউন্ড চালু করার চেষ্টা
  document.body.addEventListener('click', () => {
    if (!music.muted && music.paused) {
      music.play();
      isPlaying = true;
      playPauseBtn.textContent = '⏸';
      playPauseBtn.classList.add('playing');
    }
  }, { once: true });
});

function renderSpots() {
  spots.forEach(spot => {
    const icon = L.divIcon({
      className: 'custom-icon',
      html: `<span style="font-size: 32px; line-height: 1;">${foodIcons[spot.food] || '🍲'}</span>`,
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
  renderSpotList(); // লিস্ট রেন্ডার করো
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

window.vote = (id, type) => {
  if (localStorage.getItem(`voted_${id}`)) return alert('আপনি ইতিমধ্যে ভোট দিয়েছেন!');
  const spot = spots.find(s => s.id === id);
  if (spot) {
    spot[type]++;
    localStorage.setItem('spots', JSON.stringify(spots));
    localStorage.setItem(`voted_${id}`, 'true');
    alert('ভোট দেওয়া হয়েছে!');
    location.reload();
  }
};

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
// ব্যাকগ্রাউন্ড মিউজিক অটো-প্লে (কোনো বাটন ছাড়া)
const music = document.getElementById('bg-music');
music.volume = 0.3; // হালকা ভলিউম

// প্রথমে muted রাখা (ব্রাউজার পলিসি)
music.muted = true;

// প্রথম ইউজার ক্লিকে সাউন্ড চালু করা
document.body.addEventListener('click', function enableAudio() {
  if (music.muted) {
    music.muted = false;
    if (music.paused) {
      music.play().catch(() => {
        console.log('সাউন্ড চালু করতে আরেকবার ক্লিক করুন');
      });
    }
  }
  document.body.removeEventListener('click', enableAudio);
}, { once: true });