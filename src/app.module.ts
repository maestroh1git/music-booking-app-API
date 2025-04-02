import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ArtistsModule } from './artists/artists.module';
import { EventsModule } from './events/events.module';
import { BookingsModule } from './bookings/bookings.module';
import { ReviewsModule } from './reviews/reviews.module';
import { UploadsModule } from './uploads/uploads.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ConfigModule, ConfigService } from './config/config.module';

@Module({
  imports: [
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(), // For development, colorize the console output
            winston.format.simple(), // Simple format for console logs
          ),
        }),
        // new winston.transports.File({
        //   filename: 'logs/app.log', // Log to a file for production
        //   format: winston.format.combine(
        //     winston.format.timestamp(),
        //     winston.format.json(), // Structured JSON logs for production
        //   ),
        // }),
      ],
    }),
    // MongooseModule.forRoot('mongodb://localhost:27017/music-booking-api'),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        return {
          uri: configService.getMongodbUri(),
        };
      },
      inject: [ConfigService],
    }),

    AuthModule,
    UsersModule,
    ArtistsModule,
    EventsModule,
    BookingsModule,
    ReviewsModule,
    UploadsModule,
    NotificationsModule,
    AnalyticsModule,
    ConfigModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
