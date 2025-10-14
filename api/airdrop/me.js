import { verifyTelegramInitData } from './_lib/telegram.js';
import { store } from './_lib/store.js';

export default async function handler(req, res) {
  const initData = req.headers['x-telegram-init-data'] || '';
  const botToken = process.env.BOT_TOKEN || '';
  const verified = verifyTelegramInitData(initData, botToken);
  if (!verified.ok) { res.status(401).json({ ok: false, error: 'unauthorized' }); return; }
  const userId = String(verified.userId || '');
  if (!userId) { res.status(400).json({ ok: false, error: 'no_user' }); return; }
  const u = await store.ensureUser(userId);
  res.status(200).json({ ok: true, user: {
    userId: u.userId,
    invitedCount: u.invitedCount || 0,
    leaguePoints: u.leaguePoints || 0,
    purchases: u.purchases || 0,
    hasPurchase: !!u.hasPurchase
  }});
}
