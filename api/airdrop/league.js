import { store } from './_lib/store.js';

export default async function handler(req, res) {
  const rows = await store.getLeagueTop(20);
  res.status(200).json({ ok: true, top: rows });
}
