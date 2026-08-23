const { getMessaging, TOPIC } = require('./lib/fcm');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ status: 'error', message: 'Method not allowed' });
    return;
  }

  // Catatan: Vercel Node.js function otomatis parse JSON body kalau Content-Type
  // application/json, jadi req.body sudah berupa object (beda dengan detect.js
  // yang baca raw buffer karena Content-Type-nya image/jpeg).
  const { token } = req.body || {};
  if (!token) {
    res.status(400).json({ status: 'error', message: 'token wajib diisi' });
    return;
  }

  try {
    await getMessaging().subscribeToTopic([token], TOPIC);
    res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('Subscribe error:', err.message || err);
    res.status(500).json({ status: 'error', message: 'Gagal subscribe topic' });
  }
};
