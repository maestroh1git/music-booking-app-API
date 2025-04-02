import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type ArtistDocument = Artist & Document;

export enum ArtistStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING_REVIEW = 'pending_review',
}

@Schema({ timestamps: true })
export class Artist {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  user: User;

  @Prop({ required: true })
  name: string;

  @Prop({ type: [String], required: true })
  genres: string[];

  @Prop({ required: true })
  description: string;

  @Prop({ type: Object, required: true })
  pricing: {
    hourlyRate: number;
    minimumHours: number;
    travelFees: number;
  };

  @Prop({ type: [String] })
  portfolioLinks: string[];

  @Prop({
    type: [
      {
        date: Date,
        isAvailable: { type: Boolean, default: false },
      },
    ],
  })
  availability: { date: Date; isAvailable: boolean }[];

  @Prop({ enum: ArtistStatus, default: ArtistStatus.PENDING_REVIEW })
  status: ArtistStatus;
}

export const ArtistSchema = SchemaFactory.createForClass(Artist);
