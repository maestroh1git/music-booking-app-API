import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class ConfigService {
  constructor(private configService: NestConfigService) {}

  // Get database configuration
  getDatabaseHost(): string {
    return this.configService.get<string>('DATABASE_HOST');
  }

  getDatabasePort(): number {
    return this.configService.get<number>('DATABASE_PORT');
  }

  getMongodbUri(): string {
    return this.configService.get<string>(
      'MONGODB_URI',
      'mongodb://localhost:27017/music-booking-api',
    );
  }

  // Get JWT configuration
  getJwtSecret(): string {
    return this.configService.get<string>('JWT_SECRET');
  }

  // Get app port
  getPort(): number {
    return this.configService.get<number>('PORT');
  }
}
