require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Twilio = require("twilio");

const app = express();
app.use(cors());
app.use(express.json());

// ---- Twilio client ----
const twilioClient = Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;

// Health check
app.get("/health", (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// Main endpoint to send alerts
app.post("/send-alert", async (req, res) => {
  try {
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

    const results = [];

    for (const to of numbers) {
      const msg = await twilioClient.messages.create({
        body: finalText,
        from: FROM_NUMBER,
        to,
      });
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
