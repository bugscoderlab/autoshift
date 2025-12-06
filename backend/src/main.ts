import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS
  app.enableCors({
    origin: [
      'http://localhost:5173', // Vite dev
      'http://localhost:3000',
      'http://localhost:8081', // Expo
      process.env.FRONTEND_URL || '',
    ].filter((url): url is string => Boolean(url)),
    credentials: true,
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('AutoShift API')
    .setDescription('Modular Roster Planning System API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('employees', 'Employee management')
    .addTag('shifts', 'Shift management')
    .addTag('roster', 'Roster generation & management')
    .addTag('leave', 'Leave management')
    .addTag('swap', 'Shift swap requests')
    .addTag('ai', 'AI-powered features')
    .addTag('reports', 'Analytics & reporting')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 AutoShift API running on http://localhost:${port}`);
  console.log(`📚 API Docs available at http://localhost:${port}/api/docs`);
}

bootstrap();

