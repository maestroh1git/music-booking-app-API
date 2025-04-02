import {
  IsDate,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ArtistSlotRole,
  ArtistSlotStatus,
  EventStatus,
} from '../schemas/event.schema';

export class ArtistSlotDto {
  @IsString()
  @IsOptional()
  @IsMongoId()
  artist?: string;

  @IsString()
  @IsNotEmpty()
  role: ArtistSlotRole;

  @IsEnum(ArtistSlotStatus)
  @IsOptional()
  status?: ArtistSlotStatus;
}

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  venue: string;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  date: Date;

  @IsNumber()
  @IsNotEmpty()
  budget: number;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  requirements?: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ArtistSlotDto)
  artistSlots?: ArtistSlotDto[];

  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus;
}
