import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // --- CRITICAL: Enable CORS ---
  // This allows your Next.js frontend (running on port 3000) 
  // to fetch data from this backend (running on port 3001).
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001'], // Allow both just in case
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // --- Listen on Port 3001 ---
  // We use 3001 because Next.js usually takes 3000
  await app.listen(3001);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();