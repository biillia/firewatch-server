// server.js — Jembatan antara ESP32 (Wokwi) dan Dashboard FireWatch IoT
//
// ALUR DATA:
//   ESP32 (Wokwi)  --HTTP POST JSON-->  Server ini (/api/sensors)
//   Dashboard HTML --HTTP GET-->        Server ini (/api/sensors)
//
// Server menyimpan data terakhir yang dikirim ESP32 di memori (variabel),
// lalu dashboard mengambilnya setiap 2 detik lewat fetch('/api/sensors').

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Sajikan dashboard (index.html) sebagai file statis dari folder /public
app.use(express.static(path.join(__dirname, 'public')));

// Data sensor terakhir (default sebelum ESP32 pernah mengirim data)
let sensorData = {
  temp: 0,
  humidity: 0,
  gas: 0,
  bahaya: false,
};

// Posisi marker ESP32 di peta dashboard (viewBox 0-600 x 0-400)
let configPos = { x: 310, y: 175 };

let lastReceivedAt = 0;

// ── ESP32 mengirim data ke sini (HTTP POST) ─────────────────────────────
app.post('/api/sensors', (req, res) => {
  const { temp, humidity, gas, bahaya } = req.body;

  if (typeof temp !== 'number' || typeof gas !== 'number') {
    return res.status(400).json({ error: 'Field temp dan gas wajib berupa angka' });
  }

  sensorData = {
    temp,
    humidity: typeof humidity === 'number' ? humidity : sensorData.humidity,
    gas,
    bahaya: Boolean(bahaya),
  };
  lastReceivedAt = Date.now();

  console.log(`[${new Date().toLocaleTimeString('id-ID')}] Data diterima dari ESP32:`, sensorData);
  res.json({ status: 'ok' });
});

// ── Dashboard mengambil data terbaru dari sini (HTTP GET) ───────────────
app.get('/api/sensors', (req, res) => {
  // Jika ESP32 tidak pernah kirim data > 5 detik, dashboard.js akan
  // menganggap ESP32 offline berdasarkan waktu fetch gagal/timeout.
  res.json({
    ...sensorData,
    x: configPos.x,
    y: configPos.y,
  });
});

// ── Konfigurasi posisi marker di peta ────────────────────────────────────
app.get('/api/config', (req, res) => {
  res.json(configPos);
});

app.post('/api/config', (req, res) => {
  const { x, y } = req.body;
  if (typeof x !== 'number' || typeof y !== 'number' || x < 0 || x > 600 || y < 0 || y > 400) {
    return res.status(400).json({ error: 'Koordinat tidak valid' });
  }
  configPos = { x, y };
  res.json({ status: 'ok', config: configPos });
});

// ── Endpoint cek kesehatan server (opsional, untuk debugging) ───────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    lastReceivedAt,
    secondsSinceLastData: lastReceivedAt ? Math.floor((Date.now() - lastReceivedAt) / 1000) : null,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`FireWatch server berjalan di http://localhost:${PORT}`);
  console.log('Dashboard: buka URL di atas di browser');
  console.log('ESP32 harus POST ke: <url-publik-anda>/api/sensors');
});
