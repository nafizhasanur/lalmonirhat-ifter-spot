const API_URL = "https://script.google.com/macros/s/AKfycbx8BJL5gXXbfmusKE2D5t3bxUDvj4yUxk_GQgrzTvfJZRkhbtuTfC8PhRXfU15Ypig/exec";

let spots = [];

document.addEventListener('DOMContentLoaded', async () => {
  // প্রথমে সব স্পট লোড করো
  await loadSpots();

  // দোয়া, প্ল্যান, হাদিস, টাইম লোড করো
  await loadAllSettings();

  // সেভ বাটনগুলো
  document.getElementById('save-dua').onclick = async () => {
    const text = document.getElementById('dua-text').value.trim();
    if (text) {
      await updateSetting('dua', text);
      document.getElementById('dua-saved').textContent = 'সেভ হয়েছে! সব ডিভাইসে দেখা যাবে।';
    }
  };

  document.getElementById('save-plan').onclick = async () => {
    const text = document.getElementById('plan-text').value.trim();
    if (text) {
      await updateSetting('todaysPlan', text);
      document.getElementById('plan-saved').textContent = 'সেভ হয়েছে! সব ডিভাইসে দেখা যাবে।';
    }
  };

  document.getElementById('save-hadith').onclick = async () => {
    const text = document.getElementById('hadith-text').value.trim();
    if (text) {
      await updateSetting('hadith', text);
      document.getElementById('hadith-saved').textContent = 'সেভ হয়েছে! সব ডিভাইসে দেখা যাবে।';
    }
  };

  document.getElementById('save-time').onclick = async () => {
    const sehri = document.getElementById('sehri-input').value.trim();
    const iftar = document.getElementById('iftar-input').value.trim();
    if (sehri && iftar) {
      await updateSetting('sehriTime', sehri);
      await updateSetting('iftarTime', iftar);
      document.getElementById('time-saved').textContent = 'সেভ হয়েছে! সব ডিভাইসে দেখা যাবে।';
    }
  };

  // নতুন স্পট যোগ
  document.getElementById('add-spot-btn').onclick = async () => {
    const name = document.getElementById('add-name').value.trim();
    const food = document.getElementById('add-food').value.trim();
    const lat = parseFloat(document.getElementById('add-lat').value);
    const lng = parseFloat(document.getElementById('add-lng').value);
    if (name && food && !isNaN(lat) && !isNaN(lng)) {
      const spot = {
        id: Date.now().toString(),
        name,
        food,
        lat,
        lng,
        sotto: 0,
        mittha: 0
      };
      await addSpot(spot);
      await loadSpots();
      document.getElementById('add-saved').textContent = 'স্পট যোগ হয়েছে! সব ডিভাইসে দেখা যাবে।';
    } else {
      alert('সব তথ্য দিন!');
    }
  };

  // স্পট টেবিল রেন্ডার
  renderSpotTable();
});

// সব সেটিং লোড করা
async function loadAllSettings() {
  const keys = ['dua', 'todaysPlan', 'hadith', 'sehriTime', 'iftarTime'];
  for (const key of keys) {
    try {
      const response = await fetch(API_URL + "?action=getSetting&key=" + key);
      const data = await response.json();
      if (data.value) {
        if (key === 'dua') document.getElementById('dua-text').value = data.value;
        if (key === 'todaysPlan') document.getElementById('plan-text').value = data.value;
        if (key === 'hadith') document.getElementById('hadith-text').value = data.value;
        if (key === 'sehriTime') document.getElementById('sehri-input').value = data.value;
        if (key === 'iftarTime') document.getElementById('iftar-input').value = data.value;
      }
    } catch (err) {
      console.error(key + " লোড এরর:", err);
    }
  }
}

// সেটিং আপডেট করা
async function updateSetting(key, value) {
  try {
    await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: "updateSetting",
        key,
        value
      })
    });
  } catch (err) {
    console.error(key + " আপডেট এরর:", err);
  }
}

// স্পট লোড করা
async function loadSpots() {
  try {
    const response = await fetch(API_URL + "?action=getAll");
    spots = await response.json();
    renderSpotTable();
  } catch (err) {
    console.error("স্পট লোড এরর:", err);
  }
}

// স্পট যোগ করা
async function addSpot(spot) {
  try {
    await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: "add",
        ...spot
      })
    });
  } catch (err) {
    console.error("স্পট যোগ এরর:", err);
  }
}

// স্পট টেবিল রেন্ডার (এখানে লিস্ট + এডিট/ডিলিট বাটন)
function renderSpotTable() {
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
}

// স্পট এডিট
async function editSpot(id) {
  const spot = spots.find(s => s.id === id);
  if (spot) {
    const name = prompt('নতুন নাম:', spot.name);
    const food = prompt('নতুন খাবার:', spot.food);
    const sotto = prompt('নতুন সত্য:', spot.sotto);
    const mittha = prompt('নতুন মিথ্যা:', spot.mittha);
    if (name && food) {
      const updatedSpot = { ...spot, name, food, sotto: parseInt(sotto) || 0, mittha: parseInt(mittha) || 0 };
      // এডিট API কল (যদি পরে চাও তাহলে যোগ করতে পারি)
      alert('এডিট হয়েছে! (এখনো API-তে আপডেট হয়নি, পরে যোগ করা যাবে)');
      location.reload();
    }
  }
}

// স্পট ডিলিট
async function deleteSpot(id) {
  if (confirm('ডিলিট করবেন?')) {
    // ডিলিট API কল (যদি পরে চাও তাহলে যোগ করতে পারি)
    alert('ডিলিট হয়েছে! (এখনো API-তে ডিলিট হয়নি, পরে যোগ করা যাবে)');
    location.reload();
  }
}