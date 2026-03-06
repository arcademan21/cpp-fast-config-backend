import { IncomingMessage, ServerResponse } from 'http';
import express, { Express } from 'express';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

let cachedServer: Express | null = null;
let bootstrapPromise: Promise<Express> | null = null;

async function getServer(): Promise<Express> {
  if (cachedServer) {
    return cachedServer;
  }

  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      const server = express();
      const app = await NestFactory.create(
        AppModule,
        new ExpressAdapter(server),
      );
      configureApp(app);
      await app.init();
      cachedServer = server;
      return server;
    })();
  }

  return bootstrapPromise;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const server = await getServer();
  server(req, res);
}
