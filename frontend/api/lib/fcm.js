const admin = require('firebase-admin');

const TOPIC = 'enclosure-alerts';

function loadAndLogServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 tidak di-set di environment variable');
  }

  const decoded = Buffer.from(raw, 'base64').toString('utf-8');

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(decoded);
  } catch (err) {
    console.error('[fcm] hasil decode base64 BUKAN JSON valid. Panjang raw base64:', raw.length, '| Panjang hasil decode:', decoded.length);
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
  const serviceAccount = loadAndLogServiceAccount();

  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  return admin.messaging();
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
    // Log stack trace lengkap, bukan cuma message, supaya kelihatan persis
    // baris mana di dalam node_modules yang crash.
    console.error('FCM send error:', err && err.stack ? err.stack : err);
    console.error('[fcm] firebase-admin version:', require('firebase-admin/package.json').version);
    return false;
  }
}

module.exports = { sendFcmNotification, getMessaging, TOPIC };