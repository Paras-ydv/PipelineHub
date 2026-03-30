import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as compression from 'compression';
import helmet from 'helmet';

// Build the allowed-origins list from env.
// FRONTEND_URL may be a comma-separated list so multiple Vercel preview URLs
// can be whitelisted without a redeploy, e.g.:
//   FRONTEND_URL=https://pipeline-hub-kappa.vercel.app,https://pipeline-hub-git-main.vercel.app
function buildAllowedOrigins(): string[] {
  const raw = process.env.FRONTEND_URL ?? '';
  const explicit = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return [...explicit, 'http://localhost:3000', 'http://localhost:3001'];
}

export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true; // server-to-server / curl / Postman
  const allowed = buildAllowedOrigins();
  if (allowed.includes(origin)) return true;
  // Allow any *.vercel.app preview deployment automatically
  if (/\.vercel\.app$/.test(origin)) return true;
  // Allow any *.railway.app internal calls
  if (/\.railway\.app$/.test(origin)) return true;
  return false;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.use(helmet({ crossOriginEmbedderPolicy: false }));
  app.use(compression());

  app.enableCors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) return callback(null, true);
      console.warn(`[CORS] Blocked origin: ${origin}`);
      callback(new Error(`CORS: origin "${origin}" is not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Authorization'],
  });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle('PipelineHub API')
    .setDescription('CI/CD Platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));

  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`PipelineHub backend running on port ${port}`);
  console.log(`Allowed origins: ${buildAllowedOrigins().join(', ')} + *.vercel.app + *.railway.app`);
}

bootstrap();
