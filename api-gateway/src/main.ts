import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log', 'debug', 'verbose'] });

  app.enableCors({
    origin: ['http://localhost:3000', 'https://hygieia-frontend.vercel.app'], // array of allowed origins
    credentials: true, // allow cookies/headers if needed
  });

  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
