const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios'); // For future Instagram API calls

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname)); // Serve static files from root

// Data Paths
const DATA_DIR = path.join(__dirname, 'data');
const FILES = {
    bookings: path.join(DATA_DIR, 'bookings.json'),
    inventory: path.join(DATA_DIR, 'inventory.json'),
    accounting: path.join(DATA_DIR, 'accounting.json'),
    botSettings: path.join(DATA_DIR, 'bot_settings.json'),
    botLogs: path.join(DATA_DIR, 'bot_logs.json')
};

// Ensure data files exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
for (const file of Object.values(FILES)) {
    if (!fs.existsSync(file)) fs.writeFileSync(file, '[]');
}

// Helper: Read/Write Data
const readData = (file) => {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch { return []; }
};
const writeData = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// Helper: Logger
const logBot = (message, type = 'info') => {
    const logs = readData(FILES.botLogs);
    logs.unshift({
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        message,
        type
    });
    // Keep last 50 logs
    if (logs.length > 50) logs.length = 50;
    writeData(FILES.botLogs, logs);
};

// =======================
// API ENDPOINTS
// =======================

// --- Bot ---
app.get('/api/bot/logs', (req, res) => {
    res.json(readData(FILES.botLogs));
});

app.get('/api/bot/settings', (req, res) => {
    // Return settings object (not array)
    let settings = readData(FILES.botSettings);
    if (Array.isArray(settings)) settings = {}; // Handle init edge case
    res.json(settings);
});

app.post('/api/bot/settings', (req, res) => {
    writeData(FILES.botSettings, req.body);
    res.json({ success: true });
});

// --- Bookings ---
app.get('/api/bookings', (req, res) => {
    res.json(readData(FILES.bookings));
});

app.post('/api/bookings', (req, res) => {
    // Expects array or single object. For simplicity, we'll just save the whole array sent by frontend for now,
    // or better, implement proper CRUD.
    // To match current frontend logic which saves the whole array, we'll accept the whole array.
    // BUT for concurrent usage (Instagram Bot + User), we should really do transactional updates.
    // For this step, I'll stick to 'save whole list' to minimize frontend refactor risk, 
    // BUT I will modify the frontend to send specific actions later.
    // actually, let's just accept the full list for now to adhere to the "Migrate" step easiest.

    writeData(FILES.bookings, req.body);
    res.json({ success: true });
});

// --- Inventory ---
app.get('/api/inventory', (req, res) => {
    res.json(readData(FILES.inventory));
});

app.post('/api/inventory', (req, res) => {
    writeData(FILES.inventory, req.body);
    res.json({ success: true });
});

// --- Accounting ---
app.get('/api/accounting', (req, res) => {
    res.json(readData(FILES.accounting));
});

app.post('/api/accounting', (req, res) => {
    writeData(FILES.accounting, req.body);
    res.json({ success: true });
});

// =======================
// INSTAGRAM WEBHOOKS
// =======================

// Verification Endpoint (Required by Meta)
app.get('/webhook/instagram', (req, res) => {
    const VERIFY_TOKEN = '3bd_barber_verify_token'; // We will set this in Facebook Developer Portal

    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

// =======================
// INSTAGRAM BOT LOGIC
// =======================

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || 'PLACEHOLDER_TOKEN';

// Helper: Send Message
async function sendInstagramMessage(recipientId, text) {
    const settings = readData(FILES.botSettings);
    const token = settings.accessToken || PAGE_ACCESS_TOKEN;

    if (!token || token === 'PLACEHOLDER_TOKEN') {
        logBot("Missing Access Token. Cannot reply.", "error");
        return;
    }

    try {
        await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${token}`, {
            recipient: { id: recipientId },
            message: { text: text }
        });
        logBot(`Sent reply to ${recipientId}: "${text.substr(0, 20)}..."`, "outgoing");
    } catch (error) {
        const err = error.response ? error.response.data.error.message : error.message;
        logBot(`Failed to send message: ${err}`, "error");
    }
}

// Helper: Parse Date/Time from text
// sophisticated enough for: "tomorrow at 5pm", "today at 12"
function parseBookingRequest(text) {
    text = text.toLowerCase();
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let targetDate = null;
    if (text.includes('today')) targetDate = today;
    if (text.includes('tomorrow')) targetDate = tomorrow;

    // Extract time (e.g. "5", "5:00", "5pm")
    const timeMatch = text.match(/(\d{1,2})(:00)? ?(am|pm)?/);

    if (targetDate && timeMatch) {
        let hour = parseInt(timeMatch[1]);
        const meridiem = timeMatch[3];

        // Convert to 24h
        if (meridiem === 'pm' && hour < 12) hour += 12;
        if (meridiem === 'am' && hour === 12) hour = 0;

        // Default to PM if no meridiem provided and hour is small (e.g. "at 4" -> 4pm, "at 10" -> 10pm usually for barber)
        // Adjust based on shop hours (12pm - 10pm)
        if (!meridiem && hour < 10) hour += 12; // "2" -> 14:00

        return {
            dateStr: targetDate.toISOString().split('T')[0], // YYYY-MM-DD
            hour: hour
        };
    }
    return null;
}

// Main Bot Processor
async function processInstagramMessage(event) {
    const senderId = event.sender.id;
    const message = event.message.text;

    if (!message) return;

    logBot(`Received DM: "${message}"`, "incoming");

    // 1. Analyze Request
    const intent = parseBookingRequest(message);

    if (!intent) {
        // Fallback / Help
        await sendInstagramMessage(senderId, "👋 Hello! To book, please say something like: 'Haircut tomorrow at 4pm'");
        return;
    }

    const { dateStr, hour } = intent;

    // 2. Validate Hours (12 PM - 10 PM)
    if (hour < 12 || hour > 22) {
        await sendInstagramMessage(senderId, "❌ We are only open from 12:00 PM to 10:00 PM. Please choose another time.");
        return;
    }

    // 3. Check Availability
    const bookings = readData(FILES.bookings);
    const isTaken = bookings.some(b => b.date === dateStr && parseInt(b.time) === hour);

    if (isTaken) {
        // Suggest neighbors (simple version)
        const suggestions = [];
        if (!bookings.some(b => b.date === dateStr && parseInt(b.time) === hour + 1) && hour + 1 <= 22) suggestions.push(`${hour + 1 - 12} PM`);
        if (!bookings.some(b => b.date === dateStr && parseInt(b.time) === hour - 1) && hour - 1 >= 12) suggestions.push(`${hour - 1 - 12} PM`);

        const suggestionText = suggestions.length > 0
            ? `Available times near that: ${suggestions.join(' or ')}`
            : "Fully booked around that time.";

        await sendInstagramMessage(senderId, `❌ Sorry, ${hour > 12 ? hour - 12 : hour} PM is taken. ${suggestionText}`);
    } else {
        // 4. Book It
        const newBooking = {
            id: Math.random().toString(36).substr(2, 9),
            customer: `Instagram User (${senderId.substr(0, 4)})`, // We don't have name unless we fetch profile
            service: 'Haircut (Insta)', // Default
            date: dateStr,
            time: hour.toString(),
            source: 'instagram',
            instagramId: senderId
        };

        // IMPORTANT: Read fresh data, modify, write back to avoid race checks (basic)
        const currentBookings = readData(FILES.bookings);
        currentBookings.push(newBooking);
        writeData(FILES.bookings, currentBookings);

        logBot(`Created booking for ${dateStr} @ ${hour}`, "success");

        await sendInstagramMessage(senderId, `✅ Confirmed! Booked for ${dateStr} at ${hour > 12 ? hour - 12 : hour} PM. See you soon at 3BD Barber Shop! ✂️`);
    }
}

// Receive Messages
app.post('/webhook/instagram', async (req, res) => {
    const body = req.body;

    if (body.object === 'instagram') {
        res.status(200).send('EVENT_RECEIVED'); // Ack immediately

        for (const entry of body.entry) {
            // Instagram messaging events are slightly different from general FB pages, but similar structure
            // Usually entry.messaging array
            if (entry.messaging) {
                for (const event of entry.messaging) {
                    if (event.message && !event.message.is_echo) {
                        await processInstagramMessage(event);
                    }
                }
            }
        }
    } else {
        res.sendStatus(404);
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Instagram Webhook listener ready at /webhook/instagram`);
});
console.log('Use "ngrok http 3000" to expose for Instagram Webhooks');
