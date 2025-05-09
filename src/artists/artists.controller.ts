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
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';

@Controller('api/artists')
@UseGuards(JwtAuthGuard)
export class ArtistsController {
  constructor(private readonly artistsService: ArtistsService) {}

  @Post()
  create(@Body() createArtistDto: CreateArtistDto, @Request() req) {
    return this.artistsService.create(createArtistDto, req.user._id);
  }

  @Get()
  findAll(@Query() query) {
    return this.artistsService.findAll(query);
  }

  @Get('me')
  findMyProfile(@Request() req) {
    return this.artistsService.findByUserId(req.user._id);
  }

  @Get(':id')
  findOne(@Param('id', new ParseMongoIdPipe()) id: string) {
    return this.artistsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  update(
    @Param('id', new ParseMongoIdPipe()) id: string,
    @Body() updateArtistDto: UpdateArtistDto,
    @Request() req,
  ) {
    return this.artistsService.update(id, updateArtistDto, req.user);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  updateStatus(
    @Param('id', new ParseMongoIdPipe()) id: string,
    @Body('status') status: ArtistStatus,
  ) {
    return this.artistsService.updateStatus(id, status);
  }

  @Patch(':id/availability')
  updateAvailability(
    @Param('id', new ParseMongoIdPipe()) id: string,
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
  remove(@Param('id', new ParseMongoIdPipe()) id: string, @Request() req) {
    return this.artistsService.remove(id, req.user);
  }

  @Get('status/pending')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findPendingProfiles() {
    return this.artistsService.findAll({ status: ArtistStatus.PENDING_REVIEW });
  }
}
