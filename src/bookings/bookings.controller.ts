import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import {
  UpdateBookingDto,
  UpdateBookingStatusDto,
} from './dto/update-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { BookingStatus } from './schemas/booking.schema';
import { ParseMongoIdPipe } from 'src/common/pipes/parse-mongo-id.pipe';

@Controller('api/bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  create(@Body() createBookingDto: CreateBookingDto, @Request() req) {
    return this.bookingsService.create(createBookingDto, req.user);
  }

  @Get()
  findAll(@Query() query, @Request() req) {
    // Admins can see all bookings, others only see their own
    if (req.user.role !== UserRole.ADMIN) {
      if (req.user.role === UserRole.ARTIST) {
        // Artists should get bookings where they are the artist
        // This assumes artists have a related artist profile
        return this.bookingsService.findByArtist(req.user.artistProfile);
      } else {
        // Organizers get their bookings
        return this.bookingsService.findByOrganizer(req.user._id);
      }
    }
    return this.bookingsService.findAll(query);
  }

  @Get('my-bookings')
  findMyBookings(@Request() req) {
    if (req.user.role === UserRole.ARTIST) {
      // Get bookings for this artist
      return this.bookingsService.findByArtist(req.user.artistProfile);
    } else if (req.user.role === UserRole.ORGANIZER) {
      // Get bookings created by this organizer
      return this.bookingsService.findByOrganizer(req.user._id);
    } else {
      // Admins - return all
      return this.bookingsService.findAll();
    }
  }

  @Get('artist/:artistId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findByArtist(@Param('artistId', new ParseMongoIdPipe()) artistId: string) {
    return this.bookingsService.findByArtist(artistId);
  }

  @Get('organizer/:organizerId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findByOrganizer(
    @Param('organizerId', new ParseMongoIdPipe()) organizerId: string,
  ) {
    return this.bookingsService.findByOrganizer(organizerId);
  }

  @Get(':id')
  findOne(@Param('id', new ParseMongoIdPipe()) id: string, @Request() req) {
    return this.bookingsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseMongoIdPipe()) id: string,
    @Body() updateBookingDto: UpdateBookingDto,
    @Request() req,
  ) {
    return this.bookingsService.update(id, updateBookingDto, req.user);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', new ParseMongoIdPipe()) id: string,
    @Body() updateStatusDto: UpdateBookingStatusDto,
    @Request() req,
  ) {
    return this.bookingsService.updateStatus(id, updateStatusDto, req.user);
  }

  @Delete(':id')
  remove(@Param('id', new ParseMongoIdPipe()) id: string, @Request() req) {
    return this.bookingsService.remove(id, req.user);
  }
}
