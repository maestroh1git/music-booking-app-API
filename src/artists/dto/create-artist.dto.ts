import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ArtistStatus } from '../schemas/artist.schema';

class PricingDto {
  @IsNumber()
  @IsNotEmpty()
  hourlyRate: number;

  @IsNumber()
  @IsNotEmpty()
  minimumHours: number;

  @IsNumber()
  @IsOptional()
  travelFees: number;
}

class AvailabilityDto {
  @IsNotEmpty()
  date: Date;

  @IsNotEmpty()
  isAvailable: boolean;
}

export class CreateArtistDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  genres: string[];

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsObject()
  @ValidateNested()
  @Type(() => PricingDto)
  pricing: PricingDto;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  portfolioLinks?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilityDto)
  @IsOptional()
  availability?: AvailabilityDto[];

  @IsEnum(ArtistStatus)
  @IsOptional()
  status?: ArtistStatus;
}
