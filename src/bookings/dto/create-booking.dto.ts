import {
  IsDate,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BookingStatus } from '../schemas/booking.schema';
import { ArtistSlotRole } from 'src/events/schemas/event.schema';

class PaymentInfoDto {
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsOptional()
  isPaid?: boolean;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  paidDate?: Date;

  @IsString()
  @IsOptional()
  transactionId?: string;
}

export class CreateBookingDto {
  @IsMongoId()
  @IsNotEmpty()
  artist: string;

  //artist role
  @IsString()
  @IsOptional()
  role?: ArtistSlotRole;

  @IsMongoId()
  @IsNotEmpty()
  event: string;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  startTime?: Date;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  endTime?: Date;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentInfoDto)
  payment?: PaymentInfoDto;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(BookingStatus)
  @IsOptional()
  status?: BookingStatus;
}
