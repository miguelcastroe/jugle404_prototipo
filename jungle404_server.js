/*
 * Jungle 404 – Minimal backend server
 *
 * This file implements a lightweight HTTP server that exposes three endpoints
 * to support the Jungle 404 concept. The goal of this server is to
 * demonstrate how a page-not-found experience can be turned into a
 * regenerative action by allowing visitors to plant a tree with a single
 * click. The server is intentionally simple and uses only built‑in Node.js
 * modules and a couple of small dependencies that are already present in
 * the environment (nanoid and queue). It stores intents and orders in
 * memory and simulates asynchronous order processing.
 *
 * Endpoints:
 *   POST /planting-intents
 *     Creates a new planting intent and returns an intent identifier.
 *
 *   POST /confirm
 *     Accepts an existing intent identifier and finalises the planting
 *     action. Returns a planting identifier and other metadata.
 *
 *   GET /proofs
 *     Returns a simple certificate for a planting order, including the
 *     project name, date and dummy coordinates. In a production
 *     deployment this would be replaced with a real certificate or link
 *     provided by a reforestation partner.
 *
 * Cross‑origin requests are allowed on all endpoints by setting
 * Access‑Control headers. The server also handles preflight OPTIONS
 * requests.
 */

const http = require('http');
const crypto = require('crypto');
const url = require('url');

// Helper to generate a random identifier without external dependencies.
function generateId(length) {
  // Generate enough random bytes and convert to hex; slice to desired length.
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

// In‑memory stores for intents and orders. In a real implementation
// these would be persisted to a database.
const intents = new Map();
const orders = new Map();

// Helper to send JSON responses
function sendJson(res, statusCode, data) {
  const json = JSON.stringify(data);
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(json);
}

// Generate a dummy planting certificate. In a production system this
// would involve retrieving real planting data and possibly linking to
// satellite imagery or partner APIs.
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

// Main HTTP server
const server = http.createServer((req, res) => {
  // Allow CORS so that snippet code hosted on another domain can call
  // these endpoints without running into cross‑origin restrictions.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight CORS requests
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  if (pathname === '/planting-intents' && req.method === 'POST') {
    // Create a new intent. No request body is required, but if one
    // is present we will ignore it.
    const intentId = generateId(12);
    const now = Date.now();
    intents.set(intentId, {
      createdAt: now,
      confirmed: false,
      ip: req.socket.remoteAddress
    });
    sendJson(res, 200, { intent_id: intentId });
    return;
  }

  if (pathname === '/confirm' && req.method === 'POST') {
    // Read the request body to obtain the intent_id. We expect a
    // JSON object with a single field: { intent_id: '...' }.
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      let intentId;
      try {
        const parsed = JSON.parse(body || '{}');
        intentId = parsed.intent_id;
      } catch (e) {
        sendJson(res, 400, { error: 'Invalid JSON' });
        return;
      }
      if (!intentId || !intents.has(intentId)) {
        sendJson(res, 404, { error: 'Intent not found' });
        return;
      }
      const intent = intents.get(intentId);
      if (intent.confirmed) {
        // Idempotent: if already confirmed, return existing order
        const order = orders.get(intent.plantingId);
        sendJson(res, 200, { planting_id: order.plantingId });
        return;
      }
      // Mark as confirmed and create a new planting order. In a
      // real implementation we would push this onto a persistent
      // queue and handle retries and rate limiting.
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
          // Dummy coordinates roughly in the Peruvian Amazon region
          -3.465305 + (Math.random() - 0.5) * 0.1,
          -73.241997 + (Math.random() - 0.5) * 0.1
        ]
      };
      orders.set(plantingId, order);
      // Simulate asynchronous processing. Here you would integrate with
      // a reforestation partner API. We wait 500ms to emulate a network
      // call.
      setTimeout(() => {
        // Order processed – nothing else to do in this demo
      }, 500);
      sendJson(res, 200, { planting_id: plantingId });
    });
    return;
  }

  if (pathname === '/proofs' && req.method === 'GET') {
    // The planting_id can be provided as a query parameter
    const plantingId = parsedUrl.query.planting_id;
    if (!plantingId || !orders.has(plantingId)) {
      sendJson(res, 404, { error: 'Planting order not found' });
      return;
    }
    const certificate = generateCertificate(orders.get(plantingId));
    sendJson(res, 200, certificate);
    return;
  }

  // Catch‑all for unrecognised endpoints
  sendJson(res, 404, { error: 'Not Found' });
});

const PORT = 8000;
server.listen(PORT, () => {
  console.log(`Jungle 404 server listening on http://localhost:${PORT}`);
});