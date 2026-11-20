import { Inngest } from 'inngest';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const isDev = process.env.NODE_ENV !== 'production' || process.env.INNGEST_DEV === '1';

const inngest = new Inngest({
  id: 'traderx',
  isDev,
  eventKey: process.env.INNGEST_EVENT_KEY,
});


async function main() {
  console.log('Sending "app/send.daily.news" event to Inngest...');
  console.log('Target event URL:', isDev ? 'http://localhost:8288' : 'Inngest Cloud');
  try {
    const result = await inngest.send({
      name: 'app/send.daily.news',
      data: {
        timestamp: new Date().toISOString(),
        triggeredBy: 'manual-script',
      },
    });
    console.log('Event successfully sent to Inngest! Result:', result);
  } catch (err) {
    console.error('Failed to send event to Inngest:', err);
    process.exit(1);
  }
}


main();
