const admin = require('firebase-admin');

const TOPIC = 'enclosure-alerts';

function getMessaging() {
  if (!admin.apps.length) {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 is not configured');
    }
    const serviceAccount = JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8')
    );
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
