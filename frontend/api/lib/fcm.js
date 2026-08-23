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

  const pk = serviceAccount.private_key;
  const newlineCount = typeof pk === 'string' ? (pk.match(/\n/g) || []).length : 0;

  // Logging ini SENGAJA jalan di setiap invocation (bukan cuma sekali saat cold start)
  // supaya kita tidak kehilangan info gara-gara warm container.
  console.log('[fcm] raw base64 length:', raw.length);
  console.log('[fcm] project_id:', serviceAccount.project_id || '(kosong)');
  console.log('[fcm] client_email:', serviceAccount.client_email || '(kosong)');
  console.log('[fcm] private_key type:', typeof pk);
  console.log('[fcm] private_key length:', pk ? pk.length : 'undefined');
  console.log('[fcm] private_key starts correct:', typeof pk === 'string' && pk.startsWith('-----BEGIN PRIVATE KEY-----'));
  console.log('[fcm] private_key ends correct:', typeof pk === 'string' && pk.trim().endsWith('-----END PRIVATE KEY-----'));
  console.log('[fcm] private_key newline count (harus ~25-28, kalau 0 itu penyebabnya):', newlineCount);

  const requiredFields = ['project_id', 'private_key', 'client_email'];
  const missing = requiredFields.filter((field) => !serviceAccount[field]);
  if (missing.length > 0) {
    throw new Error('Service account JSON tidak lengkap, field hilang: ' + missing.join(', '));
  }

  return serviceAccount;
}

function getMessaging() {
  // loadAndLogServiceAccount() dipanggil setiap kali (murah, cuma decode+parse, tidak ada network call)
  // supaya diagnostic log selalu muncul. admin.initializeApp tetap cuma dipanggil sekali.
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
    console.error('FCM send error:', err.message || err);
    return false;
  }
}

module.exports = { sendFcmNotification, getMessaging, TOPIC };