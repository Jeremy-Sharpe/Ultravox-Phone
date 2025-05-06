import express from 'express';
import https from 'https';
import twilio from 'twilio';

const app = express();
const port = 3000;

// Configuration
const ULTRAVOX_API_KEY = process.env.ULTRAVOX_API_KEY;
const ULTRAVOX_API_URL = 'https://api.ultravox.ai/api/calls';

// Ultravox configuration
const SYSTEM_PROMPT =`
You are Savvy, a friendly AI receptionist, you should always have an upbeat and friendly tone and energy.
You're interacting with the user over voice, so speak casually.
Keep your responses short and to the point, much like someone would in dialogue. 
Since this is a voice conversation, do not use lists, bullets, emojis, or other 
things that do not translate to voice. In addition, do not use stage directions 
or otherwise engage in action-based roleplay (e.g., "(pauses), "*laughs").

Services Offered (based on description): Handle reservation calls 24/7, manage table bookings during peak hours, and take food orders without keeping customers waiting.

You are answering the phone for a resturant: Savvy's Kitchen.
Do not mention SpeakSavvy or that you are an AI unless specifically asked or necessary for clarification. Act as the business itself.
`;
const ULTRAVOX_CALL_CONFIG = {
    systemPrompt: SYSTEM_PROMPT,
    model: 'fixie-ai/ultravox',
    voice: '813f0a80-2dc5-4019-af72-11237a2b74d5',
    temperature: 0.3,
    firstSpeaker: 'FIRST_SPEAKER_AGENT',
    medium: { "twilio": {} }
};

// Create Ultravox call and get join URL
async function createUltravoxCall() {
    const request = https.request(ULTRAVOX_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': ULTRAVOX_API_KEY
        }
    });

    return new Promise((resolve, reject) => {
        let data = '';

        request.on('response', (response) => {
            response.on('data', chunk => data += chunk);
            response.on('end', () => resolve(JSON.parse(data)));
        });

        request.on('error', reject);
        request.write(JSON.stringify(ULTRAVOX_CALL_CONFIG));
        request.end();
    });
}

// Handle incoming calls
app.post('/incoming', async (req, res) => {
    try {
        console.log('Incoming call received');
        const response = await createUltravoxCall();
        const twiml = new twilio.twiml.VoiceResponse();
        const connect = twiml.connect();
        connect.stream({
            url: response.joinUrl,
            name: 'ultravox'
        });

        const twimlString = twiml.toString();
        res.type('text/xml');
        res.send(twimlString);

    } catch (error) {
        console.error('Error handling incoming call:', error);
        const twiml = new twilio.twiml.VoiceResponse();
        twiml.say('Sorry, there was an error connecting your call.');
        res.type('text/xml');
        res.send(twiml.toString());
    }
});

app.get('/', (req, res) => {
    res.send('Hello World');
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});