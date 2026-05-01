import { Router } from 'express';

const router = Router();

router.post('/', (req, res) => {
  const to = req.body.To || req.body.to;
  const callerId = process.env.SIGNALWIRE_PHONE_NUMBER;

  if (!to) {
    return res.status(400).send('Missing "To" parameter');
  }

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${callerId}">
    <Number>${to}</Number>
  </Dial>
</Response>`;

  res.set('Content-Type', 'text/xml');
  res.send(twiml);
});

export default router;
