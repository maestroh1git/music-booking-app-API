import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from './config/config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  //get config service
  const configService = app.get(ConfigService);
  const port = configService.getPort();
  await app.listen(port);
}
bootstrap();
