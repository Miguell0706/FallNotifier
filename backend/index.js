require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Twilio = require("twilio");

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, _res, next) => {
  console.log(`[REQ] ${req.method} ${req.url}`);
  next();
});
// ---- Twilio client ----
const twilioClient = Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;

console.log("ENV:", {
  sid: process.env.TWILIO_ACCOUNT_SID,
  token: process.env.TWILIO_AUTH_TOKEN ? "***" : null,
  from: process.env.TWILIO_FROM_NUMBER,
});
// Health check
app.get("/health", (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

app.get("/ping", (req, res) => {
  res.send("pong");
});

// Main endpoint to send alerts
app.post("/send-alert", async (req, res) => {
  try {
    console.log("🛰️ /send-alert hit!");
    console.log("Body:", JSON.stringify(req.body, null, 2));

    const { numbers, message, location } = req.body;

    if (!Array.isArray(numbers) || numbers.length === 0) {
      return res.status(400).json({ error: "numbers[] is required" });
    }

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "message is required" });
    }

    let finalText = message.trim();

    if (location && location.link) {
      finalText += `\nLocation: ${location.link}`;
    } else if (location && location.lat && location.lng) {
      finalText += `\nLocation: https://maps.google.com/?q=${location.lat},${location.lng}`;
    }

    console.log("Final SMS text:", finalText);

    const results = [];

    for (const to of numbers) {
      const msg = await twilioClient.messages.create({
        body: finalText,
        from: FROM_NUMBER,
        to,
      });
      console.log(`Twilio sent to ${to}: sid=${msg.sid} status=${msg.status}`);
      results.push({ to, sid: msg.sid, status: msg.status });
    }

    res.json({ ok: true, results });
  } catch (err) {
    console.error("Error in /send-alert:", err);
    res.status(500).json({ error: "Failed to send alerts" });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`FallNotifier backend listening on port ${port}`);
});
