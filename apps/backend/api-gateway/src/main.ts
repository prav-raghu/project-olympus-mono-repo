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

async function bootstrap(): Promise<void> {
  initAzureMonitor('api-gateway');

  const app = await NestFactory.create(AppModule, {
    logger: new AzureMonitorLogger('api-gateway'),
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
      .setTitle('API Gateway')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);
  }

  const port = parseInt(String(EnvConfig.get('PORT') ?? '4000'), 10);
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
