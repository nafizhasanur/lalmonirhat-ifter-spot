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
    const res = await fetch(API_URL + "?action=getConfig", {
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      }
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Config fetch failed with status ${res.status}: ${errorText}`);
    }

    let rawText = await res.text();
    rawText = rawText.trim();                  // leading/trailing spaces সরাও
    rawText = rawText.replace(/^\uFEFF/, '');  // BOM character সরাও যদি থাকে
    console.log('Admin loadConfig raw response:', rawText);

    let config;
    try {
      config = JSON.parse(rawText);
    } catch (parseErr) {
      console.error('JSON parse failed on raw:', rawText);
      throw new Error('Invalid JSON from server: ' + parseErr.message);
    }

    document.getElementById('dua-text').value = config.dua || '';
    document.getElementById('plan-text').value = config.plan || '';
    document.getElementById('hadith-text').value = config.hadith || '';
    document.getElementById('sehri-input').value = config.sehriTime || '05:30';
    document.getElementById('iftar-input').value = config.iftarTime || '18:05';

    console.log('Config loaded successfully:', config);
  } catch (err) {
    console.error("Admin loadConfig error:", err.message);
    alert('কনফিগ লোড হয়নি: ' + err.message + '\nConsole দেখুন।');
  }
}

async function saveDua() {
  const text = document.getElementById('dua-text').value.trim();
  if (!text) return alert('দোয়া লিখুন');
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: "saveDua", text })
    });
    const responseText = await res.text();
    console.log('saveDua response:', responseText);
    if (!res.ok) throw new Error(responseText);
    alert('দোয়া সেভ হয়েছে!');
    await loadConfig();  // আপডেট দেখানোর জন্য
  } catch (err) {
    alert('সেভ হয়নি: ' + err.message);
  }
}

async function savePlan() {
  const text = document.getElementById('plan-text').value.trim();
  if (!text) return alert('প্ল্যান লিখুন');
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: "savePlan", text })
    });
    const responseText = await res.text();
    console.log('savePlan response:', responseText);
    if (!res.ok) throw new Error(responseText);
    alert('প্ল্যান সেভ হয়েছে!');
    await loadConfig();
  } catch (err) {
    alert('সেভ হয়নি: ' + err.message);
  }
}

async function saveHadith() {
  const text = document.getElementById('hadith-text').value.trim();
  if (!text) return alert('হাদিস লিখুন');
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: "saveHadith", text })
    });
    const responseText = await res.text();
    console.log('saveHadith response:', responseText);
    if (!res.ok) throw new Error(responseText);
    alert('হাদিস সেভ হয়েছে!');
    await loadConfig();
  } catch (err) {
    alert('সেভ হয়নি: ' + err.message);
  }
}

async function saveTimes() {
  const sehri = document.getElementById('sehri-input').value.trim();
  const iftar = document.getElementById('iftar-input').value.trim();
  if (!sehri || !iftar) return alert('সময় দিন');

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: "saveTimes", sehri, iftar })
    });
    const responseText = await res.text();
    console.log('saveTimes response:', responseText);
    if (!res.ok) throw new Error(responseText || 'Unknown error');
    alert('সময় সেভ হয়েছে!');
    await loadConfig();  // এটা দিলে admin-এ নতুন সময় দেখা যাবে
  } catch (err) {
    console.error('saveTimes error:', err);
    alert('সেভ হয়নি: ' + err.message);
  }
}

// addSpotAdmin, loadSpots, editSpot ইত্যাদি আগের মতো রাখো (যদি loadSpots-এও text handling না থাকে তাহলে বলো)