import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
  ],
  });

  // Changed to 0.0.0.0 to help tunnel visibility
  await app.listen(3001, '0.0.0.0'); 
  console.log(`Application is running on port 3001`);
}
bootstrap();
