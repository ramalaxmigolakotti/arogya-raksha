const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const supabase = require('../supabaseClient');

// Twilio credentials from .env
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

// POST route to handle incoming WhatsApp messages
router.post('/webhook', async (req, res) => {
    try {
        const incomingMsg = req.body.Body.toLowerCase();
        const fromNumber = req.body.From; // The user's WhatsApp number

        console.log(`Received message from ${fromNumber}: ${incomingMsg}`);

        const twiml = new twilio.twiml.MessagingResponse();

        // Very simple logic to demonstrate working whatsapp bot
        if (incomingMsg.includes('help') || incomingMsg.includes('emergency')) {
            // Save to DB
            await supabase.from('whatsapp_triage').insert([{
                phone_number: fromNumber,
                message: req.body.Body,
                urgency: 'high',
                ai_summary: 'Emergency help requested.'
            }]);
            
            twiml.message('🚨 *Arogya-Rakhshaa AI:* We have noted your emergency. Searching for the nearest PHC and notifying your local ASHA worker immediately.');
        } 
        else if (incomingMsg.includes('symptom')) {
            twiml.message('🩺 *Arogya-Rakhshaa AI:* Please list your symptoms one by one (e.g., Fever, Cough, Chest Pain).');
        }
        else {
            // Save to DB
            await supabase.from('whatsapp_triage').insert([{
                phone_number: fromNumber,
                message: req.body.Body,
                urgency: 'low',
                ai_summary: 'General inquiry.'
            }]);

            twiml.message('Welcome to *Arogya-Rakhshaa AI*!\nHow can I assist you today?\n\nReply with:\n1️⃣ *Help* for emergencies\n2️⃣ *Symptoms* for AI triage');
        }

        res.type('text/xml').send(twiml.toString());

    } catch (error) {
        console.error("Error in WhatsApp Webhook:", error);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
