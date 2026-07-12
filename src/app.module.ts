import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    // Loads .env once, globally, so every module can inject ConfigService.
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Serves everything in /public (index.html, style.css, script.js) as
    // static files from the server root, e.g. http://localhost:3000/
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      exclude: ['/ai/(.*)'],
    }),

    AiModule,
  ],
})
export class AppModule {}
