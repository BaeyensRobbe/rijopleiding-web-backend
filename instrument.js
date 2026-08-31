// Sentry initialisatie. Dit bestand moet als ALLEREERSTE geladen worden
// (nog voor express en de routes), zodat Sentry alle fouten kan opvangen.
// Zie server.js: `import './instrument.js'` staat bovenaan.
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import dotenv from 'dotenv';

dotenv.config();

// Alleen initialiseren als er een DSN is ingesteld. Zonder DSN doet Sentry
// niets (handig lokaal), met DSN worden fouten naar je dashboard gestuurd.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    // Onderscheid tussen productie en lokaal in het Sentry dashboard.
    environment: process.env.NODE_ENV || 'development',
    integrations: [nodeProfilingIntegration()],
    // Percentage van requests waarvan we performance meten. 10% is ruim
    // voldoende voor een site van deze grootte en blijft binnen de gratis limiet.
    tracesSampleRate: 0.1,
    profilesSampleRate: 0.1,
  });
  console.log('Sentry error tracking is actief.');
} else {
  console.log('Sentry uitgeschakeld (geen SENTRY_DSN ingesteld).');
}
