import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Artist, ArtistDocument, ArtistStatus } from './schemas/artist.schema';
import { CreateArtistDto } from './dto/create-artist.dto';
import { UpdateArtistDto } from './dto/update-artist.dto';
import { UserRole } from '../users/schemas/user.schema';

@Injectable()
export class ArtistsService {
  constructor(
    @InjectModel(Artist.name) private artistModel: Model<ArtistDocument>,
  ) {}

  async create(
    createArtistDto: CreateArtistDto,
    userId: string,
  ): Promise<Artist> {
    const newArtist = new this.artistModel({
      ...createArtistDto,
      user: userId,
    });
    return newArtist.save();
  }

  async findAll(query: any = {}): Promise<Artist[]> {
    return this.artistModel
      .find({ ...query })
      .populate('user', 'name email')
      .exec();
  }

  async findOne(id: string): Promise<ArtistDocument> {
    const artist = await this.artistModel
      .findById(id)
      .populate('user', 'name email')
      .exec();

    if (!artist) {
      throw new NotFoundException(`Artist with ID ${id} not found`);
    }

    return artist;
  }

  async findByUserId(userId: string): Promise<ArtistDocument> {
    const artist = await this.artistModel
      .findOne({ user: userId })
      .populate('user', 'name email')
      .exec();

    if (!artist) {
      throw new NotFoundException(
        `Artist profile for user ID ${userId} not found`,
      );
    }

    return artist;
  }

  async update(
    id: string,
    updateArtistDto: UpdateArtistDto,
    currentUser: any,
  ): Promise<Artist> {
    const artist = await this.findOne(id);

    // Check if user is authorized to update this profile
    if (
      currentUser.role !== UserRole.ADMIN &&
      artist.user.toString() !== currentUser._id.toString()
    ) {
      throw new ForbiddenException('You can only update your own profile');
    }

    // If regular user updates, set status back to pending review
    if (currentUser.role !== UserRole.ADMIN && updateArtistDto.status) {
      delete updateArtistDto.status;
    }

    if (currentUser.role !== UserRole.ADMIN) {
      updateArtistDto.status = ArtistStatus.PENDING_REVIEW;
    }

    const updatedArtist = await this.artistModel
      .findByIdAndUpdate(id, updateArtistDto, { new: true })
      .exec();

    if (!updatedArtist) {
      throw new NotFoundException(`Artist with ID ${id} not found`);
    }

    return updatedArtist;
  }

  async updateStatus(id: string, status: ArtistStatus): Promise<Artist> {
    const updatedArtist = await this.artistModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .exec();

    if (!updatedArtist) {
      throw new NotFoundException(`Artist with ID ${id} not found`);
    }

    return updatedArtist;
  }

  async updateAvailability(
    id: string,
    availabilityUpdates: { date: Date; isAvailable: boolean }[],
    currentUser: any,
  ): Promise<Artist> {
    const artist = await this.findOne(id);

    // Check if user is authorized to update this availability
    if (
      currentUser.role !== UserRole.ADMIN &&
      artist.user.toString() !== currentUser._id.toString()
    ) {
      throw new ForbiddenException('You can only update your own availability');
    }

    // Update availability
    const currentAvailability = artist.availability || [];
    availabilityUpdates.forEach((update) => {
      const existingIndex = currentAvailability.findIndex(
        (a) =>
          a.date.toISOString().split('T')[0] ===
          new Date(update.date).toISOString().split('T')[0],
      );

      if (existingIndex >= 0) {
        currentAvailability[existingIndex] = update;
      } else {
        currentAvailability.push(update);
      }
    });

    const updatedArtist = await this.artistModel
      .findByIdAndUpdate(
        id,
        { availability: currentAvailability },
        { new: true },
      )
      .exec();

    return updatedArtist;
  }

  async remove(id: string, currentUser: any): Promise<Artist> {
    const artist = await this.findOne(id);

    // Check if user is authorized to delete this profile
    if (
      currentUser.role !== UserRole.ADMIN &&
      artist.user.toString() !== currentUser._id.toString()
    ) {
      throw new ForbiddenException('You can only delete your own profile');
    }

    // For regular users, we'll just mark it as inactive instead of deleting
    if (currentUser.role !== UserRole.ADMIN) {
      return this.updateStatus(id, ArtistStatus.INACTIVE);
    }

    // For admins, we'll actually delete the profile
    const deletedArtist = await this.artistModel.findByIdAndDelete(id).exec();

    if (!deletedArtist) {
      throw new NotFoundException(`Artist with ID ${id} not found`);
    }

    return deletedArtist;
  }
}
