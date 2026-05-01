import { Router } from 'express';

const router = Router();

router.post('/', async (_req, res) => {
  try {
    const { SIGNALWIRE_PROJECT_ID, SIGNALWIRE_API_TOKEN, SIGNALWIRE_SPACE_URL } = process.env;
    const credentials = Buffer.from(`${SIGNALWIRE_PROJECT_ID}:${SIGNALWIRE_API_TOKEN}`).toString('base64');

    // SignalWire RELAY REST JWT — generates a token from credentials, no SMS verification needed
    const response = await fetch(
      `https://${SIGNALWIRE_SPACE_URL}/api/relay/rest/jwt`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expires_in: 3600 }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error('SignalWire token error:', response.status, text);
      return res.status(500).json({ error: 'Failed to generate token' });
    }

    const data = await response.json();
    // endpoint returns { jwt_token: '...' } or { token: '...' }
    const token = data.jwt_token || data.token;
    res.json({ token });
  } catch (err) {
    console.error('Token error:', err);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

export default router;
