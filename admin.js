const API_URL = "https://script.googleusercontent.com/macros/echo?user_content_key=AY5xjrQLcEBPq5uLPCBHNJDhYH8PTaKGwmDHpIDyhBlS0HDclB4j7E-ezjBiMhbmJzPqa_jMSHBwkV-pi43yzPpLeXbnBcJXfZg7G-MX4yR-qNNIkLtWPxcImzDlJMo_FB_mmIhgc8alYeQUxheaUrNdGBG_RNMSVY1JIbmLtkxAESbjyej-00FE69Xc7cX9pxN1Gnu-Lybq3L3okNPEYOWFa5ioV40CKMe5llvzlUMYkMhZoCE1deKP6kScHIiNhhiJ3O_TzU9OVbCHzG1tDBFb1QCnp8RSSA&lib=MF8pJXBxkT9dVJr28seXbrC-FhBVorQb1";

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
  const res = await fetch(API_URL + "?action=getConfig");
  const config = await res.json();

  document.getElementById('dua-text').value = config.dua;
  document.getElementById('plan-text').value = config.plan;
  document.getElementById('hadith-text').value = config.hadith;
  document.getElementById('sehri-input').value = config.sehriTime;
  document.getElementById('iftar-input').value = config.iftarTime;
}

async function loadSpots() {
  const res = await fetch(API_URL + "?action=getAll");
  const spots = await res.json();
  const tbody = document.getElementById('spot-body');
  tbody.innerHTML = '';
  spots.forEach(spot => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${spot.name}</td>
      <td>${spot.food}</td>
      <td>${spot.lat.toFixed(5)}, ${spot.lng.toFixed(5)}</td>
      <td>${spot.sotto}</td>
      <td>${spot.mittha}</td>
      <td>
        <button class="action-btn edit-btn" onclick="editSpot('${spot.id}')">এডিট</button>
        <button class="action-btn delete-btn" onclick="alert('ডিলিট ফিচার এখনো যোগ হয়নি।')">ডিলিট</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function saveDua() {
  const text = document.getElementById('dua-text').value.trim();
  if (!text) return alert('দোয়া লিখুন');
  await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: "saveDua", text }) });
  alert('দোয়া সেভ হয়েছে!');
}

async function savePlan() {
  const text = document.getElementById('plan-text').value.trim();
  if (!text) return alert('প্ল্যান লিখুন');
  await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: "savePlan", text }) });
  alert('প্ল্যান সেভ হয়েছে!');
}

// saveHadith, saveTimes-এর জন্য একইভাবে করো (action: "saveHadith", "saveTimes" এবং data {text} বা {sehri, iftar})

async function saveTimes() {
  const sehri = document.getElementById('sehri-input').value.trim();
  const iftar = document.getElementById('iftar-input').value.trim();
  if (!sehri || !iftar) return alert('সময় দিন');
  await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: "saveTimes", sehri, iftar }) });
  alert('সময় সেভ হয়েছে!');
}

async function addSpotAdmin() {
  // তোমার আগের লজিক, কিন্তু API-তে POST
  const name = document.getElementById('add-name').value.trim();
  const food = document.getElementById('add-food').value.trim();
  const lat = parseFloat(document.getElementById('add-lat').value);
  const lng = parseFloat(document.getElementById('add-lng').value);
  if (!name || !food || isNaN(lat) || isNaN(lng)) return alert('সব দিন');
  await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: "add", name, food, lat, lng }) });
  alert('যোগ হয়েছে!');
  loadSpots();
}

// editSpot – prompt দিয়ে নতুন করে save করতে পারো, কিন্তু এখন সিম্পল রাখলাম (ডিলিটও পরে যোগ করা যাবে)