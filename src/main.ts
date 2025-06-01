import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { zod } from './shared/config/zod-config.singleton';
import { ValidationPipe } from '@nestjs/common';

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

  const applicationPort: number = zod.get('APP_PORT');

  await app.listen(applicationPort ?? 3000);
}
bootstrap();
