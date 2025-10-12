import crypto from 'crypto';

export function parseInitData(initData) {
  if (!initData) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  const data = {};
  for (const [k, v] of params.entries()) {
    if (k === 'hash') continue;
    data[k] = v;
  }
  const sorted = Object.keys(data).sort().map(k => `${k}=${data[k]}`).join('\n');
  return { hash, dataCheckString: sorted, data };
}

export function verifyTelegramInitData(initData, botToken) {
  try {
    const parsed = parseInitData(initData);
    if (!parsed) return { ok: false, error: 'no_init_data' };
    if (!botToken) return { ok: false, error: 'no_bot_token' };
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const hmac = crypto.createHmac('sha256', secretKey).update(parsed.dataCheckString).digest('hex');
    const ok = hmac === parsed.hash;
    if (!ok) return { ok: false, error: 'bad_signature' };
    // extract user id if present
    let userId = null;
    if (parsed.data.user) {
      try { userId = 'tg_' + JSON.parse(parsed.data.user).id; } catch {}
    }
    return { ok: true, userId, data: parsed.data };
  } catch (e) {
    return { ok: false, error: 'verify_error' };
  }
}
