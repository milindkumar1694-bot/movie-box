/**
 * Telegram Notification — Sends room activity alerts via Bot API.
 * 
 * Never sends message content, images, or access codes.
 * Gracefully handles missing credentials.
 */

const https = require('https');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

let isConfigured = false;

function init() {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn('[Telegram] ⚠ Bot token or chat ID not configured. Notifications disabled.');
    console.warn('[Telegram]   Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env to enable.');
    isConfigured = false;
    return;
  }
  isConfigured = true;
  console.log('[Telegram] ✓ Notifications enabled.');
}

/**
 * Send a room activity notification.
 * @param {number} participantCount Current number of participants
 */
function sendRoomNotification(participantCount) {
  if (!isConfigured) {
    console.log('[Telegram] Notification skipped (not configured).');
    return Promise.resolve();
  }

  const now = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const message = [
    '🔔 *Private Room Activity*',
    '',
    'Someone entered the room.',
    '',
    `Room: The Last Frame`,
    `Time: ${now}`,
    `Participants: ${participantCount}/2`,
  ].join('\n');

  return sendTelegramMessage(message);
}

/**
 * Send a message via Telegram Bot API.
 */
function sendTelegramMessage(text) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      chat_id: CHAT_ID,
      text,
      parse_mode: 'Markdown',
    });

    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('[Telegram] ✓ Notification sent.');
          resolve();
        } else {
          console.error(`[Telegram] ✗ Failed (HTTP ${res.statusCode}):`, data);
          resolve(); // Don't crash the app on Telegram failure
        }
      });
    });

    req.on('error', (err) => {
      console.error('[Telegram] ✗ Request error:', err.message);
      resolve(); // Don't crash
    });

    req.write(payload);
    req.end();
  });
}

module.exports = {
  init,
  sendRoomNotification,
};
