/*
 * Jungle 404 – Demo server with static site
 *
 * This server combines the Jungle 404 backend (intent, confirm and proof
 * endpoints) with a very simple static file server. It serves files
 * from the `public/` directory and falls back to a custom 404 page
 * (`public/404.html`) for unknown routes. The 404 page includes
 * the Jungle 404 widget so that when users hit a missing page on
 * the website they are presented with the reforesting call to action.
 *
 * To run the server:
 *   node jungle404_demo_server.js
 *
 * It will start two HTTP servers:
 *   - Port 8000: backend API for planting intents, confirmations and proofs
 *   - Port 8080: demo website with 404 integration
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// In‑memory stores for intents and orders
const intents = new Map();
const orders = new Map();
// Helper to generate random identifiers without external dependencies
function generateId(length) {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

// Generate a dummy certificate for a planting order
function generateCertificate(order) {
  return {
    planting_id: order.plantingId,
    intent_id: order.intentId,
    project: 'Amazonía Peruana',
    planted_at: new Date(order.confirmedAt).toISOString(),
    coordinates: order.coordinates,
    message: 'Gracias por plantar un árbol en la Amazonía peruana!'
  };
}

// Backend API server on port 8000
const apiServer = http.createServer((req, res) => {
  // Allow CORS for the API endpoints
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const pathname = urlObj.pathname;
  // POST /planting-intents
  if (pathname === '/planting-intents' && req.method === 'POST') {
      const intentId = generateId(12);
    intents.set(intentId, {
      createdAt: Date.now(),
      confirmed: false,
      ip: req.socket.remoteAddress
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ intent_id: intentId }));
    return;
  }
  // POST /confirm
  if (pathname === '/confirm' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      let intentId;
      try {
        const parsed = JSON.parse(body || '{}');
        intentId = parsed.intent_id;
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }
      if (!intentId || !intents.has(intentId)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Intent not found' }));
        return;
      }
      const intent = intents.get(intentId);
      if (intent.confirmed) {
        const order = orders.get(intent.plantingId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ planting_id: order.plantingId }));
        return;
      }
      intent.confirmed = true;
      const plantingId = generateId(10);
      intent.plantingId = plantingId;
      const order = {
        plantingId,
        intentId,
        createdAt: intent.createdAt,
        confirmedAt: Date.now(),
        ip: req.socket.remoteAddress,
        coordinates: [
          -3.465305 + (Math.random() - 0.5) * 0.1,
          -73.241997 + (Math.random() - 0.5) * 0.1
        ]
      };
      orders.set(plantingId, order);
      // Simulate asynchronous processing; normally you would
      // communicate with a partner API here. We use a simple
      // timeout to emulate delay.
      setTimeout(() => {
        /* no-op */
      }, 500);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ planting_id: plantingId }));
    });
    return;
  }
  // GET /proofs
  if (pathname === '/proofs' && req.method === 'GET') {
    const plantingId = urlObj.searchParams.get('planting_id');
    if (!plantingId || !orders.has(plantingId)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Planting order not found' }));
      return;
    }
    const cert = generateCertificate(orders.get(plantingId));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(cert));
    return;
  }
  // Fallback
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

const PUBLIC_DIR = path.join(__dirname, 'public');

// Helper to serve static files
function serveFile(res, filePath, statusCode) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
      return;
    }
    const ext = path.extname(filePath);
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml'
    };
    const mime = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(statusCode, { 'Content-Type': mime });
    res.end(data);
  });
}

// Demo website server on port 8080
const webServer = http.createServer((req, res) => {
  const requestedPath = decodeURIComponent(req.url.split('?')[0]);
  let filePath;
  if (requestedPath === '/' || requestedPath === '') {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  } else {
    filePath = path.join(PUBLIC_DIR, requestedPath);
  }
  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      // Serve requested file
      serveFile(res, filePath, 200);
    } else {
      // Serve custom 404 page
      const fourOhFour = path.join(PUBLIC_DIR, '404.html');
      serveFile(res, fourOhFour, 404);
    }
  });
});

const API_PORT = 8000;
const WEB_PORT = 8080;

apiServer.listen(API_PORT, () => {
  console.log(`API server listening on http://localhost:${API_PORT}`);
});

webServer.listen(WEB_PORT, () => {
  console.log(`Web server listening on http://localhost:${WEB_PORT}`);
});