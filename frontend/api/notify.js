const { sendFcmNotification } = require('./lib/fcm');

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

  const { title, body, severity } = req.body || {};
  if (!title || !body) {
    res.status(400).json({ status: 'error', message: 'title dan body wajib diisi' });
    return;
  }

  const sent = await sendFcmNotification(title, body, severity);
  res.status(sent ? 200 : 500).json({ status: sent ? 'ok' : 'error' });
};
