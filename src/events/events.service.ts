// src/events/events.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Event,
  EventDocument,
  EventStatus,
  ArtistSlotStatus,
  ArtistSlotRole,
} from './schemas/event.schema';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { UserRole } from '../users/schemas/user.schema';
import { ArtistsService } from '../artists/artists.service';

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    private artistsService: ArtistsService,
  ) {}

  // Helper method to validate budget constraints
  private async validateBudgetConstraints(
    event: EventDocument,
    newArtistId?: string,
    excludeSlotIndex?: number,
  ): Promise<void> {
    const currentSlots = [...event.artistSlots];
    if (excludeSlotIndex !== undefined) {
      currentSlots.splice(excludeSlotIndex, 1);
    }

    let allocatedBudget = 0;
    const artistCosts = [];

    // Calculate costs for existing artists
    for (const slot of currentSlots) {
      if (slot.artist) {
        let artistId: string;

        if (typeof slot.artist === 'string') {
          artistId = slot.artist;
        } else if ('_id' in slot.artist) {
          artistId = slot.artist._id.toString();
        } else {
          continue;
        }

        try {
          const artist = await this.artistsService.findOne(artistId);
          const artistCost =
            artist.pricing.hourlyRate * artist.pricing.minimumHours +
            (artist.pricing.travelFees || 0);

          allocatedBudget += artistCost;
          artistCosts.push({
            name: artist.name,
            cost: artistCost,
            minimumHours: artist.pricing.minimumHours,
          });
        } catch (error) {
          console.log(`Artist not found for ID: ${artistId}`);
        }
      }
    }

    // Add cost for new artist if provided
    if (newArtistId) {
      const newArtist = await this.artistsService.findOne(newArtistId);
      const newArtistCost =
        newArtist.pricing.hourlyRate * newArtist.pricing.minimumHours +
        (newArtist.pricing.travelFees || 0);

      allocatedBudget += newArtistCost;
      artistCosts.push({
        name: newArtist.name,
        cost: newArtistCost,
        minimumHours: newArtist.pricing.minimumHours,
      });
    }

    // Check if total cost exceeds budget
    if (allocatedBudget > event.budget) {
      const breakdown = artistCosts
        .map((a) => `${a.name}: $${a.cost}`)
        .join(', ');
      throw new BadRequestException(
        `Artist allocation would exceed event budget. ` +
          `Total artist costs: $${allocatedBudget}, Event budget: $${event.budget}. ` +
          `Breakdown: ${breakdown}`,
      );
    }
  }

  async create(createEventDto: CreateEventDto, userId: string): Promise<Event> {
    // Validate event date is in the future
    if (new Date(createEventDto.date) <= new Date()) {
      throw new BadRequestException('Event date must be in the future');
    }

    const newEvent = new this.eventModel({
      ...createEventDto,
      organizer: userId,
    });

    // If event has artist slots with assigned artists, validate budget
    if (createEventDto.artistSlots && createEventDto.artistSlots.length > 0) {
      const artistSlots = createEventDto.artistSlots.filter(
        (slot) => slot.artist,
      );

      if (artistSlots.length > 0) {
        // Save without artists first to get event document
        const savedEvent = await newEvent.save();

        // Remove existing slots before validating
        savedEvent.artistSlots = [];
        await savedEvent.save();

        // Now add artists one by one with validation
        for (const slot of artistSlots) {
          await this.validateBudgetConstraints(savedEvent, slot.artist);
          savedEvent.artistSlots.push(slot);
        }

        return savedEvent.save();
      }
    }

    return newEvent.save();
  }

  async findAll(query: any = {}): Promise<Event[]> {
    return this.eventModel
      .find({ status: EventStatus.PUBLISHED, ...query })
      .populate('organizer', 'name email')
      .populate('artistSlots.artist')
      .exec();
  }

  async findByOrganizer(organizerId: string): Promise<Event[]> {
    return this.eventModel
      .find({ organizer: organizerId })
      .populate('organizer', 'name email')
      .populate('artistSlots.artist')
      .exec();
  }

  async findOne(id: string): Promise<EventDocument> {
    const event = await this.eventModel
      .findById(id)
      .populate('organizer', 'name email')
      .populate('artistSlots.artist')
      .exec();

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return event;
  }

  async update(
    id: string,
    updateEventDto: UpdateEventDto,
    currentUser: any,
  ): Promise<Event> {
    const event = await this.findOne(id);

    // Check if user is authorized to update this event
    if (
      currentUser.role !== UserRole.ADMIN &&
      event.organizer._id.toString() !== currentUser._id.toString()
    ) {
      throw new ForbiddenException('You can only update your own events');
    }

    // Validate event date if provided
    if (updateEventDto.date && new Date(updateEventDto.date) <= new Date()) {
      throw new BadRequestException('Event date must be in the future');
    }

    // If updating the budget, validate it's sufficient for existing artists
    if (updateEventDto.budget && updateEventDto.budget < event.budget) {
      // Create a temporary event with the new budget to validate
      const tempEvent = { ...event.toObject(), budget: updateEventDto.budget };
      try {
        await this.validateBudgetConstraints(tempEvent as EventDocument);
      } catch (error) {
        throw new BadRequestException(`Cannot reduce budget: ${error.message}`);
      }
    }

    const updatedEvent = await this.eventModel
      .findByIdAndUpdate(id, updateEventDto, { new: true })
      .exec();

    if (!updatedEvent) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return updatedEvent;
  }

  async updateStatus(
    id: string,
    status: EventStatus,
    currentUser: any,
  ): Promise<Event> {
    const event = await this.findOne(id);

    // Check if user is authorized to update this event status
    if (
      currentUser.role !== UserRole.ADMIN &&
      event.organizer._id.toString() !== currentUser._id.toString()
    ) {
      throw new ForbiddenException('You can only update your own events');
    }

    const updatedEvent = await this.eventModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .exec();

    if (!updatedEvent) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return updatedEvent;
  }

  async addArtistSlot(
    id: string,
    artistSlot: {
      role: ArtistSlotRole;
      artist?: string;
      status?: ArtistSlotStatus;
    },
    currentUser: any,
  ): Promise<EventDocument> {
    const event = await this.findOne(id);

    // Check if user is authorized to update this event
    if (
      currentUser.role !== UserRole.ADMIN &&
      event.organizer._id.toString() !== currentUser._id.toString()
    ) {
      throw new ForbiddenException('You can only update your own events');
    }

    // If artist is specified, validate that it exists and budget constraints
    if (artistSlot.artist) {
      const artist = await this.artistsService.findOne(artistSlot.artist);
      if (!artist) {
        throw new NotFoundException(
          `Artist with ID ${artistSlot.artist} not found`,
        );
      }

      // Validate minimum hours and budget constraints
      await this.validateBudgetConstraints(event, artistSlot.artist);
    }

    // Add the artist slot
    event.artistSlots.push(artistSlot);

    return event.save();
  }

  async updateArtistSlot(
    id: string,
    slotIndex: number,
    update: { artist?: string; status?: ArtistSlotStatus },
    currentUser: any,
  ): Promise<EventDocument> {
    const event = await this.findOne(id);

    // Check if user is authorized to update this event
    if (
      currentUser.role !== UserRole.ADMIN &&
      event.organizer._id.toString() !== currentUser._id.toString()
    ) {
      throw new ForbiddenException('You can only update your own events');
    }

    // Check if the slot exists
    if (!event.artistSlots[slotIndex]) {
      throw new NotFoundException(
        `Artist slot at index ${slotIndex} not found`,
      );
    }

    // If artist is being updated, validate budget constraints
    if (update.artist) {
      const artist = await this.artistsService.findOne(update.artist);
      if (!artist) {
        throw new NotFoundException(
          `Artist with ID ${update.artist} not found`,
        );
      }

      // Validate budget constraints excluding current slot
      await this.validateBudgetConstraints(event, update.artist, slotIndex);
    }

    // Update the slot
    if (update.artist) {
      event.artistSlots[slotIndex].artist = update.artist as any;
    }

    if (update.status) {
      event.artistSlots[slotIndex].status = update.status;
    }

    return event.save();
  }

  async removeArtistSlot(
    id: string,
    slotIndex: number,
    currentUser: any,
  ): Promise<EventDocument> {
    const event = await this.findOne(id);

    // Check if user is authorized to update this event
    if (
      currentUser.role !== UserRole.ADMIN &&
      event.organizer._id.toString() !== currentUser._id.toString()
    ) {
      throw new ForbiddenException('You can only update your own events');
    }

    // Check if the slot exists
    if (!event.artistSlots[slotIndex]) {
      throw new NotFoundException(
        `Artist slot at index ${slotIndex} not found`,
      );
    }

    // Remove the slot
    event.artistSlots.splice(slotIndex, 1);

    return event.save();
  }

  async remove(id: string, currentUser: any): Promise<Event> {
    const event = await this.findOne(id);

    // Check if user is authorized to delete this event
    if (
      currentUser.role !== UserRole.ADMIN &&
      event.organizer._id.toString() !== currentUser._id.toString()
    ) {
      throw new ForbiddenException('You can only delete your own events');
    }

    // For regular users, we'll just mark it as cancelled instead of deleting
    if (
      currentUser.role !== UserRole.ADMIN &&
      event.status === EventStatus.PUBLISHED
    ) {
      return this.updateStatus(id, EventStatus.CANCELLED, currentUser);
    }

    // For admins or draft events, we'll actually delete
    const deletedEvent = await this.eventModel.findByIdAndDelete(id).exec();

    if (!deletedEvent) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return deletedEvent;
  }

  private async validateBatchBudgetConstraints(
    event: EventDocument,
    newSlots: { artist?: string }[],
  ): Promise<void> {
    let allocatedBudget = 0;

    // Calculate costs for new slots
    for (const slot of newSlots) {
      if (slot.artist) {
        const artist = await this.artistsService.findOne(slot.artist);
        const artistCost =
          artist.pricing.hourlyRate * artist.pricing.minimumHours +
          (artist.pricing.travelFees || 0);
        allocatedBudget += artistCost;
      }
    }

    // Add existing artist costs
    for (const slot of event.artistSlots) {
      if (slot.artist) {
        let artistId: string;

        if (typeof slot.artist === 'string') {
          artistId = slot.artist;
        } else if ('_id' in slot.artist) {
          artistId = slot.artist._id.toString();
        } else {
          continue; // Skip if artist is not in a valid format
        }

        try {
          const artist = await this.artistsService.findOne(artistId);
          const artistCost =
            artist.pricing.hourlyRate * artist.pricing.minimumHours +
            (artist.pricing.travelFees || 0);
          allocatedBudget += artistCost;
        } catch (error) {
          // Skip if artist not found
        }
      }
    }

    if (allocatedBudget > event.budget) {
      throw new BadRequestException(
        `Total artist costs ($${allocatedBudget}) would exceed event budget ($${event.budget})`,
      );
    }
  }

  async addArtistSlots(
    id: string,
    artistSlots: {
      role: ArtistSlotRole;
      artist?: string;
      status?: ArtistSlotStatus;
    }[],
    currentUser: any,
  ): Promise<EventDocument> {
    const event = await this.findOne(id);

    if (
      currentUser.role !== UserRole.ADMIN &&
      event.organizer._id.toString() !== currentUser._id.toString()
    ) {
      throw new ForbiddenException('You can only update your own events');
    }

    // Validate all artists exist
    for (const slot of artistSlots) {
      if (slot.artist) {
        const artist = await this.artistsService.findOne(slot.artist);
        if (!artist) {
          throw new NotFoundException(
            `Artist with ID ${slot.artist} not found`,
          );
        }
      }
    }

    // Validate budget constraints
    await this.validateBatchBudgetConstraints(event, artistSlots);

    // Add all artist slots
    event.artistSlots.push(...artistSlots);

    return event.save();
  }
}
