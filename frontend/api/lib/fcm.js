const admin = require('firebase-admin');

const TOPIC = 'enclosure-alerts';

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 tidak di-set di environment variable');
  }

  let decoded;
  try {
    decoded = Buffer.from(raw, 'base64').toString('utf-8');
  } catch (err) {
    throw new Error('Gagal decode base64 dari FIREBASE_SERVICE_ACCOUNT_BASE64: ' + err.message);
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(decoded);
  } catch (err) {
    // Kalau ini yang error, berarti base64-nya rusak/terpotong saat disimpan di Vercel.
    console.error('Hasil decode base64 bukan JSON valid. Panjang string hasil decode:', decoded.length);
    throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 tidak menghasilkan JSON valid setelah di-decode: ' + err.message);
  }

  // Validasi field wajib SEBELUM dipakai, supaya errornya jelas kalau ada yang hilang/salah.
  const requiredFields = ['project_id', 'private_key', 'client_email'];
  const missing = requiredFields.filter((field) => !serviceAccount[field]);

  console.log('[fcm] service account check -> project_id:', serviceAccount.project_id || '(kosong)');
  console.log('[fcm] service account check -> client_email:', serviceAccount.client_email || '(kosong)');
  console.log(
    '[fcm] service account check -> private_key format ok:',
    typeof serviceAccount.private_key === 'string' &&
      serviceAccount.private_key.startsWith('-----BEGIN PRIVATE KEY-----')
  );

  if (missing.length > 0) {
    throw new Error('Service account JSON tidak lengkap, field hilang: ' + missing.join(', '));
  }

  return serviceAccount;
}

function getMessaging() {
  if (!admin.apps.length) {
    const serviceAccount = loadServiceAccount();
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