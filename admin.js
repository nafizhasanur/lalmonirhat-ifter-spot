// loadConfig-এ
async function loadConfig() {
  try {
    const res = await fetch(API_URL + "?action=getConfig", {
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    if (!res.ok) throw new Error(`Config failed: ${res.status}`);
    const text = await res.text();
    console.log('Admin config raw:', text);
    const config = JSON.parse(text);

    document.getElementById('dua-text').value = config.dua || '';
    document.getElementById('plan-text').value = config.plan || '';
    document.getElementById('hadith-text').value = config.hadith || '';
    document.getElementById('sehri-input').value = config.sehriTime || '05:30';
    document.getElementById('iftar-input').value = config.iftarTime || '18:05';
  } catch (err) {
    console.error("Admin config error:", err);
  }
}

// save functions-এও text response দেখো
async function saveTimes() {
  const sehri = document.getElementById('sehri-input').value.trim();
  const iftar = document.getElementById('iftar-input').value.trim();
  if (!sehri || !iftar) return alert('সময় দিন');
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: "saveTimes", sehri, iftar })
  });
  const text = await res.text();
  console.log('Save times response:', text);
  alert('সময় সেভ হয়েছে!');
  // optional: loadConfig() আবার কল করো যাতে UI আপডেট হয়
}