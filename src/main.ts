import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Strip unknown properties and auto-transform incoming payloads.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Catch every thrown error (Nest's own + our own) and return a
  // consistent, predictable JSON error shape to the frontend.
  app.useGlobalFilters(new HttpExceptionFilter());

  // Allow the vanilla-JS frontend (served from the same origin, but this
  // keeps things safe if it's ever opened from a different port/origin).
  app.enableCors();

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);

  console.log(`\n🚀 AI PDF Ingestion Pipeline is running`);
  console.log(`   Local:  http://localhost:${port}`);
  console.log(`   Upload API: POST http://localhost:${port}/ai/upload\n`);
}

bootstrap();
