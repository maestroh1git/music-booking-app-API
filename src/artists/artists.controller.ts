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
import { ArtistsService } from './artists.service';
import { CreateArtistDto } from './dto/create-artist.dto';
import { UpdateArtistDto } from './dto/update-artist.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { ArtistStatus } from './schemas/artist.schema';

@Controller('api/artists')
export class ArtistsController {
  constructor(private readonly artistsService: ArtistsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createArtistDto: CreateArtistDto, @Request() req) {
    return this.artistsService.create(createArtistDto, req.user._id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Query() query) {
    return this.artistsService.findAll(query);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  findMyProfile(@Request() req) {
    return this.artistsService.findByUserId(req.user._id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.artistsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  update(
    @Param('id') id: string,
    @Body() updateArtistDto: UpdateArtistDto,
    @Request() req,
  ) {
    return this.artistsService.update(id, updateArtistDto, req.user);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateStatus(@Param('id') id: string, @Body('status') status: ArtistStatus) {
    return this.artistsService.updateStatus(id, status);
  }

  @Patch(':id/availability')
  @UseGuards(JwtAuthGuard)
  updateAvailability(
    @Param('id') id: string,
    @Body() availabilityUpdates: { date: Date; isAvailable: boolean }[],
    @Request() req,
  ) {
    return this.artistsService.updateAvailability(
      id,
      availabilityUpdates,
      req.user,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @Request() req) {
    return this.artistsService.remove(id, req.user);
  }

  @Get('status/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findPendingProfiles() {
    return this.artistsService.findAll({ status: ArtistStatus.PENDING_REVIEW });
  }
}
