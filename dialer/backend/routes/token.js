import { Router } from 'express';

const router = Router();

router.post('/', async (_req, res) => {
  try {
    const { SIGNALWIRE_PROJECT_ID, SIGNALWIRE_API_TOKEN, SIGNALWIRE_SPACE_URL } = process.env;
    const credentials = Buffer.from(`${SIGNALWIRE_PROJECT_ID}:${SIGNALWIRE_API_TOKEN}`).toString('base64');

    // Call Fabric subscriber token — required for @signalwire/js v3 SignalWire() client
    const response = await fetch(
      `https://${SIGNALWIRE_SPACE_URL}/api/fabric/subscribers/tokens`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reference: 'dialer-agent' }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error('SignalWire token error:', response.status, text);
      return res.status(500).json({ error: 'Failed to generate token' });
    }

    const data = await response.json();
    console.log('SignalWire token response keys:', Object.keys(data));
    const token = data.token || data.subscriber_token || data.jwt_token;
    res.json({ token });
  } catch (err) {
    console.error('Token error:', err);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

export default router;
