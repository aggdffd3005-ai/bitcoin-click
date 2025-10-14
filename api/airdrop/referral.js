import { verifyTelegramInitData } from './_lib/telegram.js';
import { store } from './_lib/store.js';

function readJson(req) {
  return new Promise(resolve => {
    let raw = '';
    req.on('data', chunk => (raw += chunk.toString()));
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); } });
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ ok: false }); return; }
  const initData = req.headers['x-telegram-init-data'] || '';
  const botToken = process.env.BOT_TOKEN || '';
  const verified = verifyTelegramInitData(initData, botToken);
  if (!verified.ok) { res.status(401).json({ ok: false, error: 'unauthorized' }); return; }
  const body = await readJson(req);
  const inviterId = String(body.inviterId || '');
  const userId = String(verified.userId || body.userId || '');
  if (!userId || !inviterId) { res.status(400).json({ ok: false, error: 'bad_request' }); return; }
  const r = await store.incrementReferral(inviterId, userId);
  if (r.applied) await store.addLeaguePoints(inviterId, 100); // league points for invite
  res.status(200).json({ ok: true, applied: r.applied });
}
