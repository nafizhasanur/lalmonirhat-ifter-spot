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

  updateDateTime();           // এটা সবসময় কল হবে
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
      const text = await res.text();  // প্রথমে text নাও
      console.log('Add response text:', text);
      if (!res.ok) throw new Error('Add failed: ' + text);
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
    if (!res.ok) {
      throw new Error(`Config fetch failed: ${res.status} ${await res.text()}`);
    }
    const text = await res.text();
    console.log('Config raw text:', text);
    const config = JSON.parse(text);  // parse manually

    document.getElementById('dua-text').textContent = config.dua || "দোয়া লোড হয়নি";
    document.getElementById('plan-text').textContent = config.plan || "প্ল্যান লোড হয়নি";
    document.getElementById('hadith-text').textContent = config.hadith || "হাদিস লোড হয়নি";

    const sehri = config.sehriTime || "05:30";
    const iftar = config.iftarTime || "18:05";
    localStorage.setItem('sehriTime', sehri);
    localStorage.setItem('iftarTime', iftar);

    // timers update করো
    document.getElementById('sehri-time').textContent = sehri;
    document.getElementById('iftar-time').textContent = iftar;
  } catch (err) {
    console.error("Config load error:", err);
    // fallback default দেখাও
    document.getElementById('dua-text').textContent = "আল্লাহুম্মা ইন্নাকা আফুয়্যুন তুহিব্বুল আফওয়া ফা'ফু আন্না।";
    document.getElementById('plan-text').textContent = "আজকের প্ল্যান: রোজা রাখুন, নামাজ পড়ুন, দান করুন।";
  }
}

async function loadSpots() {
  try {
    document.getElementById('spots-list').innerHTML = '<p>লোড হচ্ছে...</p>';
    const res = await fetch(API_URL + "?action=getAll", {
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    if (!res.ok) {
      throw new Error(`Spots fetch failed: ${res.status} ${await res.text()}`);
    }
    const text = await res.text();
    console.log('Spots raw text:', text);
    spots = JSON.parse(text);
    renderSpots();
  } catch (err) {
    console.error("Spots load error:", err);
    document.getElementById('spots-list').innerHTML = '<p style="color:red;">স্পট লোড হয়নি। পরে চেষ্টা করুন।</p>';
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

// বাকি ফাংশনগুলো (renderSpots, renderSpotList, vote, closeModal, showStatus, updateDateTime, updateTimers, countdown) তোমার আগের কোড থেকে রাখো
// যদি renderSpots না থাকে তাহলে বলো, আমি দিয়ে দিবো