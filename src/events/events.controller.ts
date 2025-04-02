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
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import {
  ArtistSlotRole,
  ArtistSlotStatus,
  EventStatus,
} from './schemas/event.schema';

@Controller('api/events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  create(@Body() createEventDto: CreateEventDto, @Request() req) {
    return this.eventsService.create(createEventDto, req.user._id);
  }

  @Get()
  findAll(@Query() query) {
    return this.eventsService.findAll(query);
  }

  @Get('my-events')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  findMyEvents(@Request() req) {
    return this.eventsService.findByOrganizer(req.user._id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
    @Request() req,
  ) {
    return this.eventsService.update(id, updateEventDto, req.user);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: EventStatus,
    @Request() req,
  ) {
    return this.eventsService.updateStatus(id, status, req.user);
  }

  @Post(':id/artist-slots')
  @UseGuards(JwtAuthGuard)
  addArtistSlot(
    @Param('id') id: string,
    @Body()
    artistSlot: {
      role: ArtistSlotRole;
      artist?: string;
      status?: ArtistSlotStatus;
    },
    @Request() req,
  ) {
    return this.eventsService.addArtistSlot(id, artistSlot, req.user);
  }

  @Post(':id/artist-slots/batch')
  @UseGuards(JwtAuthGuard)
  addArtistSlots(
    @Param('id') id: string,
    @Body()
    artistSlots: {
      role: ArtistSlotRole;
      artist?: string;
      status?: ArtistSlotStatus;
    }[],
    @Request() req,
  ) {
    return this.eventsService.addArtistSlots(id, artistSlots, req.user);
  }

  @Patch(':id/artist-slots/:slotIndex')
  @UseGuards(JwtAuthGuard)
  updateArtistSlot(
    @Param('id') id: string,
    @Param('slotIndex') slotIndex: number,
    @Body() update: { artist?: string; status?: ArtistSlotStatus },
    @Request() req,
  ) {
    return this.eventsService.updateArtistSlot(id, slotIndex, update, req.user);
  }

  @Delete(':id/artist-slots/:slotIndex')
  @UseGuards(JwtAuthGuard)
  removeArtistSlot(
    @Param('id') id: string,
    @Param('slotIndex') slotIndex: number,
    @Request() req,
  ) {
    return this.eventsService.removeArtistSlot(id, slotIndex, req.user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @Request() req) {
    return this.eventsService.remove(id, req.user);
  }
}
