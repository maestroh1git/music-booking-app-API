import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { ConfigService } from './config.service';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      envFilePath: '.env', // Default .env file location
      // validationSchema: Joi.object({
      //   PORT: Joi.number().default(3000), // Default port
      //   DATABASE_HOST: Joi.string().required(),
      //   DATABASE_PORT: Joi.number().default(27017),
      //   JWT_SECRET: Joi.string().required(),
      // }),
      isGlobal: true, // Makes the configuration available globally
    }),
  ],
  providers: [ConfigService], // Make ConfigService available
  exports: [ConfigService], // Export ConfigService for use in other modules
})
export class ConfigModule {}
