// Main entry point for the Telegram Bot application
import 'dotenv/config';

// Import the bot to start it
import './bot';

// For Vercel webhook deployment, uncomment and modify the following:
/*
import express from 'express';
import bodyParser from 'body-parser';
import { bot } from './bot';

const app = express();
app.use(bodyParser.json());

app.post(`/api/webhook`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

const port: number = parseInt(process.env.PORT || '3000');
app.listen(port, () => console.log(`Server running on port ${port}`));

export default app; // For Vercel Serverless Function that exports an Express app
*/

// Note: You'd also need to run `npx prisma migrate deploy` in your Vercel build step or locally.