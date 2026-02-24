// admin.js - Updated with edit/delete, load on save

const API_URL = "https://script.google.com/macros/s/AKfycbwNQtj1E56nCzkphsHP7VLiUvLyTej376BujqVKLzCJpIeBu9glDsfIuCM01KXVTXrz/exec";

document.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();
  await loadSpots();

  document.getElementById('save-dua').onclick = saveDua;
  document.getElementById('save-plan').onclick = savePlan;
  document.getElementById('save-hadith').onclick = saveHadith;
  document.getElementById('save-time').onclick = saveTimes;
  document.getElementById('add-spot-btn').onclick = addSpotAdmin;
});

async function loadConfig() {
  try {
    const res = await fetch(API_URL + "?action=getConfig");
    if (!res.ok) throw new Error('Config failed');
    let text = await res.text();
    text = text.trim().replace(/^\uFEFF/, '');
    const config = JSON.parse(text);

    document.getElementById('dua-text').value = config.dua;
    document.getElementById('plan-text').value = config.plan;
    document.getElementById('hadith-text').value = config.hadith;
    document.getElementById('sehri-input').value = config.sehriTime;
    document.getElementById('iftar-input').value = config.iftarTime;
  } catch (err) {
    console.error("Config load error:", err);
  }
}

async function loadSpots() {
  try {
    const res = await fetch(API_URL + "?action=getAll");
    if (!res.ok) throw new Error('Spots failed');
    let text = await res.text();
    text = text.trim().replace(/^\uFEFF/, '');
    const spots = JSON.parse(text);
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
  } catch (err) {
    console.error("Spots load error:", err);
  }
}

async function saveDua() {
  const text = document.getElementById('dua-text').value.trim();
  if (!text) return alert('দোয়া লিখুন');
  await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: "saveDua", text }) });
  alert('দোয়া সেভ হয়েছে!');
  loadConfig();
}

async function savePlan() {
  const text = document.getElementById('plan-text').value.trim();
  if (!text) return alert('প্ল্যান লিখুন');
  await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: "savePlan", text }) });
  alert('প্ল্যান সেভ হয়েছে!');
  loadConfig();
}

async function saveHadith() {
  const text = document.getElementById('hadith-text').value.trim();
  if (!text) return alert('হাদিস লিখুন');
  await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: "saveHadith", text }) });
  alert('হাদিস সেভ হয়েছে!');
  loadConfig();
}

async function saveTimes() {
  const sehri = document.getElementById('sehri-input').value.trim();
  const iftar = document.getElementById('iftar-input').value.trim();
  if (!sehri || !iftar) return alert('সময় দিন');
  await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: "saveTimes", sehri, iftar }) });
  alert('সময় সেভ হয়েছে!');
  loadConfig();
}

async function addSpotAdmin() {
  const name = document.getElementById('add-name').value.trim();
  const food = document.getElementById('add-food').value.trim();
  const lat = parseFloat(document.getElementById('add-lat').value);
  const lng = parseFloat(document.getElementById('add-lng').value);
  if (!name || !food || isNaN(lat) || isNaN(lng)) return alert('সব তথ্য দিন');
  await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: "add", name, food, lat, lng }) });
  alert('যোগ হয়েছে!');
  loadSpots();
}

async function editSpot(id) {
  const name = prompt('নতুন নাম:');
  const food = prompt('নতুন খাবার:');
  const lat = prompt('নতুন Lat:');
  const lng = prompt('নতুন Lng:');
  const sotto = prompt('নতুন সত্য:');
  const mittha = prompt('নতুন মিথ্যা:');
  if (name && food) {
    await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: "edit", id, name, food, lat: parseFloat(lat), lng: parseFloat(lng), sotto: parseInt(sotto), mittha: parseInt(mittha) }) });
    alert('এডিট হয়েছে!');
    loadSpots();
  }
}

async function deleteSpot(id) {
  if (confirm('ডিলিট করবেন?')) {
    await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: "delete", id }) });
    alert('ডিলিট হয়েছে!');
    loadSpots();
  }
}