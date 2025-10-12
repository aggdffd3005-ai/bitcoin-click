const EXPECTED_ID = process.env.SERVICE_ID || '8kodc101HZYYeddf59887524792417xrgd';

function readJson(req) {
  return new Promise(resolve => {
    let raw = '';
    req.on('data', chunk => (raw += chunk.toString()));
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); }
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' });
    return;
  }
  const serviceId = req.headers['x-service-id'];
  if (serviceId !== EXPECTED_ID) {
    res.status(401).json({ ok: false, error: 'unauthorized' });
    return;
  }
  const initData = req.headers['x-telegram-init-data'] || '';
  const body = await readJson(req);
  console.log('purchase', { userId: body.userId, address: body.address, kind: body.kind, amountTon: body.amountTon, tg: !!initData });
  res.status(200).json({ ok: true, received: true });
}
