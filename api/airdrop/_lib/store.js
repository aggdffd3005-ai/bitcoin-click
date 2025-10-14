const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';

const memory = {
  users: new Map(), // userId -> { invited: Set, invitedCount, leaguePoints, lastDailyAt, tasksClaimed }
  league: new Map(), // userId -> points
};

async function upstash(cmd, ...args) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return null;
  const body = { command: [cmd, ...args] };
  const res = await fetch(UPSTASH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }).catch(() => null);
  if (!res) return null;
  try {
    const data = await res.json();
    return data?.result ?? null;
  } catch (_) {
    return null;
  }
}

function createDefaultUser(userId) {
  return {
    userId,
    invited: [],
    invitedCount: 0,
    leaguePoints: 0,
    lastDailyAt: 0,
    tasksClaimed: {},
    purchases: 0,
    hasPurchase: false,
  };
}

async function getUser(userId) {
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    const key = `airdrop:user:${userId}`;
    const raw = await upstash('GET', key);
    if (raw) {
      try { return JSON.parse(raw); } catch {}
    }
    return null;
  }
  const u = memory.users.get(userId);
  return u ? { ...u, invited: Array.from(u.invited) } : null;
}

async function saveUser(user) {
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    const key = `airdrop:user:${user.userId}`;
    await upstash('SET', key, JSON.stringify(user));
    return true;
  }
  const clone = { ...user };
  clone.invited = Array.from(new Set(clone.invited));
  clone.tasksClaimed = { ...clone.tasksClaimed };
  memory.users.set(user.userId, { ...clone, invited: new Set(clone.invited) });
  return true;
}

async function ensureUser(userId) {
  let u = await getUser(userId);
  if (!u) {
    u = createDefaultUser(userId);
    await saveUser(u);
  }
  return u;
}

async function incrementReferral(inviterId, referredUserId) {
  if (!inviterId || !referredUserId || inviterId === referredUserId) return { applied: false };
  const inviter = await ensureUser(inviterId);
  if (inviter.invited.includes(referredUserId)) return { applied: false };
  inviter.invited.push(referredUserId);
  inviter.invitedCount += 1;
  await saveUser(inviter);
  return { applied: true, inviter };
}

async function addLeaguePoints(userId, delta) {
  if (!delta) return 0;
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    const z = await upstash('ZINCRBY', 'airdrop:league', String(delta), userId);
    const newScore = Number(z || 0);
    const u = await ensureUser(userId);
    u.leaguePoints = newScore;
    await saveUser(u);
    return newScore;
  }
  const current = memory.league.get(userId) || 0;
  const next = current + delta;
  memory.league.set(userId, next);
  const u = await ensureUser(userId);
  u.leaguePoints = next;
  await saveUser(u);
  return next;
}

async function getLeagueTop(limit = 20) {
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    const res = await upstash('ZREVRANGE', 'airdrop:league', '0', String(limit - 1), 'WITHSCORES');
    const arr = Array.isArray(res) ? res : [];
    const out = [];
    for (let i = 0; i < arr.length; i += 2) {
      out.push({ userId: String(arr[i]), points: Number(arr[i + 1]) });
    }
    return out;
  }
  const rows = Array.from(memory.league.entries())
    .map(([userId, points]) => ({ userId, points }))
    .sort((a, b) => b.points - a.points)
    .slice(0, limit);
  return rows;
}

function isSameDay(tsA, tsB) {
  const a = new Date(tsA), b = new Date(tsB);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

async function claimDailyServer(userId) {
  const u = await ensureUser(userId);
  const now = Date.now();
  if (u.lastDailyAt && isSameDay(u.lastDailyAt, now)) return { ok: false, reason: 'claimed_today' };
  u.lastDailyAt = now;
  u.tasksClaimed['daily'] = now;
  await saveUser(u);
  return { ok: true };
}

async function markTaskClaimed(userId, taskId) {
  const u = await ensureUser(userId);
  if (u.tasksClaimed[taskId]) return false;
  u.tasksClaimed[taskId] = Date.now();
  await saveUser(u);
  return true;
}

async function isTaskClaimed(userId, taskId) {
  const u = await ensureUser(userId);
  return Boolean(u.tasksClaimed[taskId]);
}

export const store = {
  getUser,
  saveUser,
  ensureUser,
  incrementReferral,
  addLeaguePoints,
  getLeagueTop,
  claimDailyServer,
  markTaskClaimed,
  isTaskClaimed,
  async markPurchase(userId, amountTon){
    const u = await ensureUser(userId);
    u.purchases += 1;
    u.hasPurchase = true;
    await saveUser(u);
    return u.purchases;
  },
  async getInvitedCount(userId){
    const u = await ensureUser(userId);
    return u.invitedCount || 0;
  }
};
