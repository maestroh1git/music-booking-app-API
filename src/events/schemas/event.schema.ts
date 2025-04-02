import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { Artist, ArtistDocument } from '../../artists/schemas/artist.schema';

export type EventDocument = Event & Document;

export enum EventStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export enum ArtistSlotStatus {
  UNFILLED = 'unfilled',
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

export enum ArtistSlotRole {
  HEADLINER = 'headliner',
  SUPPORT = 'support',
  OPENER = 'opener',
}

class ArtistSlot {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Artist' })
  artist?: string | Artist | ArtistDocument;

  @Prop({ required: true, enum: ArtistSlotRole })
  role: ArtistSlotRole;

  @Prop({ enum: ArtistSlotStatus, default: ArtistSlotStatus.UNFILLED })
  status?: ArtistSlotStatus;
}

@Schema({ timestamps: true })
export class Event {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  venue: string;

  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  //minimum artist budget
  budget: number;

  @Prop({ required: true })
  description: string;

  @Prop()
  requirements: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  organizer: UserDocument;

  @Prop({ type: [ArtistSlot], default: [] })
  artistSlots: ArtistSlot[];

  @Prop({ enum: EventStatus, default: EventStatus.DRAFT })
  status: EventStatus;
}

export const EventSchema = SchemaFactory.createForClass(Event);
