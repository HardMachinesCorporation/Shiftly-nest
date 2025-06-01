import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { zod } from './shared/config/zod-config.singleton';
import { ValidationPipe } from '@nestjs/common';
import { DatabaseFilterException } from './exceptions/database/database.filter.exception';
import { GlobalExceptionFilter } from './exceptions/global.exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: zod.get('NODE_ENV') === 'production',
    })
  );

  const dbFilter = new DatabaseFilterException();
  const globalFilter = new GlobalExceptionFilter();

  app.useGlobalFilters(dbFilter, globalFilter);

  const applicationPort: number = zod.get('APP_PORT');

  await app.listen(applicationPort ?? 3000);
}
void bootstrap();
