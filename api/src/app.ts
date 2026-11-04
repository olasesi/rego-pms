import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import hpp from 'hpp';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/env';
import { log } from './config/logger';
import { i18nMiddleware } from './config/i18n';
import { requestContext } from './common/middleware/requestContext';
import { apiLimiter } from './common/middleware/rateLimiter';
import { metricsMiddleware, metricsEndpoint } from './common/middleware/metrics';
import { auditMiddleware } from './common/middleware/audit';
import { errorHandler } from './common/middleware/errorHandler';
import { notFound } from './common/middleware/notFound';
import { routes } from './routes';
import { swaggerSpec } from './swagger';
import { sequelize } from './config/database';
import { authenticate } from './common/middleware/authenticate';
import { graphqlHandler } from './graphql';

const morganStream = {
  write: (message: string): void => {
    log.info(message.trim());
  },
};

export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(requestContext);

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        const allowlist = config.corsOrigins();
        if (!origin || config.isDevelopment || allowlist.length === 0 || allowlist.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    }),
  );

  app.use(i18nMiddleware);
  app.use(compression());
  app.use(hpp());

  // GraphQL reads the raw request stream itself, so it must be mounted before
  // the JSON body parser.
  app.use('/graphql', authenticate, graphqlHandler);

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  if (config.ENABLE_METRICS) {
    app.use(metricsMiddleware);
  }

  app.use(
    morgan(config.isProduction ? 'combined' : 'dev', {
      stream: morganStream,
      skip: (req) => req.path === '/health' || req.path === '/metrics',
    }),
  );

  app.get('/health', async (_req, res) => {
    let db = 'up';
    try {
      await sequelize.authenticate();
    } catch {
      db = 'down';
    }
    const healthy = db === 'up';
    res.status(healthy ? 200 : 503).json({
      success: true,
      data: {
        status: healthy ? 'ok' : 'degraded',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version ?? '1.0.0',
        db,
      },
    });
  });

  if (config.ENABLE_METRICS) {
    app.get('/metrics', metricsEndpoint);
  }

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/docs.json', (_req, res) => res.json(swaggerSpec));

  app.use(auditMiddleware);
  app.use(config.API_PREFIX, apiLimiter, routes);

  app.use(notFound);
  app.use(errorHandler());

  return app;
}

export default createApp;