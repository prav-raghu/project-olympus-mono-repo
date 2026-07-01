import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { EnvConfig } from './config/env.config';
import { AzureMonitorLogger, initAzureMonitor } from '@project-olympus/logging';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ADMIN_DB, type PrismaClient } from '@project-olympus/database';
import { EmailService } from '@project-olympus/email';
import { CronSchedulerService } from './services/cron-scheduler.service';

async function bootstrap(): Promise<void> {
  initAzureMonitor('schedule-api');

  const app = await NestFactory.create(AppModule, {
    logger: new AzureMonitorLogger('schedule-api'),
    bufferLogs: true,
  });

  app.use(helmet());

  app.enableCors({
    origin: EnvConfig.get('CORS_ORIGIN'),
    credentials: true,
  });

  app.enableVersioning({ type: VersioningType.URI });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new ResponseTransformInterceptor());

  if (EnvConfig.get('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Schedule API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);
  }

  const prisma = app.get<PrismaClient>(ADMIN_DB);
  const cronScheduler = new CronSchedulerService(prisma, new EmailService());
  cronScheduler.startAll();
  app.enableShutdownHooks();
  process.on('SIGTERM', () => cronScheduler.stopAll());
  process.on('SIGINT', () => cronScheduler.stopAll());

  const port = parseInt(String(EnvConfig.get('PORT') ?? '4003'), 10);
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
