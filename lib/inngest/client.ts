import { Inngest} from "inngest";

const isDev = process.env.NODE_ENV !== 'production' || process.env.INNGEST_DEV === '1';

export const inngest = new Inngest({
    id: 'traderx',
    isDev,
    eventKey: process.env.INNGEST_EVENT_KEY,
    ai: {
        gemini: {
            apiKey: process.env.GEMINI_API_KEY || ''
        }
    }
});

