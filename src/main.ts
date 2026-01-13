import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // --- ENABLE CORS ---
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://book-explorer-sooty.vercel.app',   // No trailing slash
      'https://book-explorer-sooty.vercel.app/',  // With trailing slash
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: [
      'Content-Type', 
      'Accept', 
      'Authorization',
      // Note: You no longer need the bypass-tunnel headers on Render, 
      // but keeping them doesn't hurt.
    ],
  });

  // --- DYNAMIC PORT FOR RENDER ---
  // process.env.PORT is provided by Render automatically.
  // It defaults to 3001 only when you run it locally.
  const port = process.env.PORT || 3001;

  await app.listen(port, '0.0.0.0'); 
  console.log(`Application is running on port ${port}`);
}
bootstrap();
