import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import tokenRoute from './routes/token.js';
import leadsRoute from './routes/leads.js';
import callsRoute from './routes/calls.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/token', tokenRoute);
app.use('/leads', leadsRoute);
app.use('/calls', callsRoute);

app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
