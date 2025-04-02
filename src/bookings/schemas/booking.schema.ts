import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { Artist, ArtistDocument } from '../../artists/schemas/artist.schema';
import { Event, EventDocument } from '../../events/schemas/event.schema';

export type BookingDocument = Booking & Document;

export enum BookingStatus {
  REQUESTED = 'requested',
  IN_REVIEW = 'in_review',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  PAID = 'paid',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

class StatusChange {
  @Prop({ required: true })
  status: BookingStatus;

  @Prop({ required: true })
  timestamp: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  changedBy: User;
}

@Schema({ timestamps: true })
export class Booking {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Artist', required: true })
  artist: ArtistDocument;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Event', required: true })
  event: EventDocument;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  organizer: UserDocument;

  @Prop({ enum: BookingStatus, default: BookingStatus.REQUESTED })
  status: BookingStatus;

  @Prop({ type: [StatusChange], default: [] })
  statusHistory: StatusChange[];

  @Prop()
  startTime: Date;

  @Prop()
  endTime: Date;

  @Prop({ type: Object })
  payment: {
    amount: number;
    isPaid: boolean;
    paidDate?: Date;
    transactionId?: string;
  };

  @Prop()
  notes: string;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);
