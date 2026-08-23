const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getMessaging: getMessagingInstance } = require('firebase-admin/messaging');

const TOPIC = 'enclosure-alerts';

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 tidak di-set di environment variable');
  }

  const decoded = Buffer.from(raw, 'base64').toString('utf-8');

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(decoded);
  } catch (err) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 tidak menghasilkan JSON valid setelah di-decode: ' + err.message);
  }

  const requiredFields = ['project_id', 'private_key', 'client_email'];
  const missing = requiredFields.filter((field) => !serviceAccount[field]);
  if (missing.length > 0) {
    throw new Error('Service account JSON tidak lengkap, field hilang: ' + missing.join(', '));
  }

  return serviceAccount;
}

function getMessaging() {
  // Pakai modular API (firebase-admin v12+), bukan require('firebase-admin') namespace lama.
  // Namespace lama pernah gagal di sini karena admin.apps undefined saat di-bundle Vercel.
  if (getApps().length === 0) {
    const serviceAccount = loadServiceAccount();
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getMessagingInstance();
}

async function sendFcmNotification(title, body, severity) {
  try {
    await getMessaging().send({
      topic: TOPIC,
      notification: { title, body },
      data: { severity: severity || 'info' },
    });
    return true;
  } catch (err) {
    console.error('FCM send error:', err && err.stack ? err.stack : err);
    return false;
  }
}

module.exports = { sendFcmNotification, getMessaging, TOPIC };