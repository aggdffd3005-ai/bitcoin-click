import { verifyTelegramInitData } from './_lib/telegram.js';
import { store } from './_lib/store.js';

const TASKS = [
  { id: 'join_channel', title: 'عضویت در کانال', reward: 200, type: 'tg_channel' },
  { id: 'follow_twitter', title: 'فالو در توییتر', reward: 200, type: 'social' },
  { id: 'invite_1', title: 'دعوت یک دوست', reward: 300, type: 'referral', require: 1 },
  { id: 'first_purchase', title: 'اولین خرید', reward: 500, type: 'purchase' },
];

function readJson(req) {
  return new Promise(resolve => {
    let raw = '';
    req.on('data', chunk => (raw += chunk.toString()));
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); } });
  });
}

export default async function handler(req, res) {
  const initData = req.headers['x-telegram-init-data'] || '';
  const botToken = process.env.BOT_TOKEN || '';
  const verified = verifyTelegramInitData(initData, botToken);
  if (!verified.ok) { res.status(401).json({ ok: false, error: 'unauthorized' }); return; }

  const userId = String(verified.userId || '');
  if (!userId) { res.status(400).json({ ok: false, error: 'no_user' }); return; }

  if (req.method === 'GET') {
    // return tasks and claimed status
    const claimed = {};
    for (const t of TASKS) {
      claimed[t.id] = await store.isTaskClaimed(userId, t.id);
    }
    res.status(200).json({ ok: true, tasks: TASKS, claimed });
    return;
  }

  if (req.method === 'POST') {
    const body = await readJson(req);
    const taskId = String(body.taskId || '');
    const task = TASKS.find(t => t.id === taskId);
    if (!task) { res.status(400).json({ ok: false, error: 'bad_task' }); return; }
    const already = await store.isTaskClaimed(userId, taskId);
    if (already) { res.status(409).json({ ok: false, error: 'already_claimed' }); return; }
    // server-side checks
    if (task.type === 'referral'){
      const cnt = await store.getInvitedCount(userId);
      if (cnt < (task.require || 1)) { res.status(403).json({ ok:false, error:'not_enough_referrals' }); return; }
    }
    if (task.id === 'first_purchase'){
      const u = await store.ensureUser(userId);
      if (!u.hasPurchase) { res.status(403).json({ ok:false, error:'no_purchase' }); return; }
    }
    await store.markTaskClaimed(userId, taskId);
    await store.addLeaguePoints(userId, task.reward);
    res.status(200).json({ ok: true, reward: task.reward });
    return;
  }

  res.status(405).json({ ok: false, error: 'method_not_allowed' });
}
