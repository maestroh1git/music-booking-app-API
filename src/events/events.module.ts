import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { Event, EventSchema } from './schemas/event.schema';
import { ArtistsModule } from '../artists/artists.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Event.name, schema: EventSchema }]),
    ArtistsModule,
  ],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
