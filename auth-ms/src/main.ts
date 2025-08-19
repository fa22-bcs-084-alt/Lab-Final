import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import cookieParser from 'cookie-parser'
import { AppModule } from './app.module'
import { MicroserviceOptions, Transport } from '@nestjs/microservices'

async function bootstrap() {
  // create normal HTTP app
  const app = await NestFactory.create(AppModule)

  // middlewares + pipes work on the HTTP app
  app.use(cookieParser())
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  app.setGlobalPrefix('auth')

  // attach microservice
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      port: 4002,
    },
  })

  // start both
  await app.startAllMicroservices()
  await app.listen(4001)
}
bootstrap()
