import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Basic security/headers similar to vercel.json
app.use((req, res, next) => {
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// Serve static files (index.html, manifest, assets)
app.use(express.static(__dirname, { index: 'index.html' }));

// Helper to wire serverless-style handlers
function mountApi(routePath, modulePath) {
  app.all(routePath, async (req, res) => {
    try {
      const mod = await import(modulePath);
      return mod.default(req, res);
    } catch (e) {
      console.error('API route error', routePath, e);
      res.status(500).json({ ok: false, error: 'internal_error' });
    }
  });
}

// API routes
mountApi('/api/airdrop/purchase', './api/airdrop/purchase.js');
mountApi('/api/airdrop/pack', './api/airdrop/pack.js');
mountApi('/api/airdrop/withdraw', './api/airdrop/withdraw.js');
mountApi('/api/airdrop/referral', './api/airdrop/referral.js');
mountApi('/api/airdrop/league', './api/airdrop/league.js');
mountApi('/api/airdrop/tasks', './api/airdrop/tasks.js');
mountApi('/api/airdrop/me', './api/airdrop/me.js');

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
