import { PartialType } from '@nestjs/mapped-types';
import { CreateBookingDto } from './create-booking.dto';
import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { BookingStatus } from '../schemas/booking.schema';

export class UpdateBookingDto extends PartialType(CreateBookingDto) {}

export class UpdateBookingStatusDto {
  @IsEnum(BookingStatus)
  @IsNotEmpty()
  status: BookingStatus;

  @IsOptional()
  @IsNotEmpty()
  notes?: string;
}
