import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Booking,
  BookingDocument,
  BookingStatus,
} from './schemas/booking.schema';
import { CreateBookingDto } from './dto/create-booking.dto';
import {
  UpdateBookingDto,
  UpdateBookingStatusDto,
} from './dto/update-booking.dto';
import { UserRole } from '../users/schemas/user.schema';
import { ArtistSlotStatus } from '../events/schemas/event.schema';
import { ArtistsService } from '../artists/artists.service';
import { EventsService } from '../events/events.service';
import { ArtistDocument } from 'src/artists/schemas/artist.schema';

@Injectable()
export class BookingsService {
  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    private artistsService: ArtistsService,
    @Inject(forwardRef(() => EventsService))
    private eventsService: EventsService,
  ) {}

  async create(
    createBookingDto: CreateBookingDto,
    currentUser: any,
  ): Promise<Booking> {
    // Validate that artist exists
    const artist = await this.artistsService.findOne(createBookingDto.artist);

    if (!artist) {
      throw new NotFoundException(
        `Artist with ID ${createBookingDto.artist} not found`,
      );
    }

    if (artist.status !== 'active') {
      throw new BadRequestException(
        `Artist with ID ${createBookingDto.artist} is not active`,
      );
    }

    // Validate that event exists
    const event = await this.eventsService.findOne(createBookingDto.event);

    // Validate that the current user is the organizer of the event
    if (
      currentUser.role !== UserRole.ADMIN &&
      event.organizer._id.toString() !== currentUser._id.toString()
    ) {
      throw new ForbiddenException(
        'You can only create bookings for your own events',
      );
    }

    // Check for date conflicts for this artist
    await this.checkDateConflicts(
      createBookingDto.artist,
      createBookingDto.startTime,
      createBookingDto.endTime,
    );

    // Initialize status history
    const statusHistory = [
      {
        status: createBookingDto.status || BookingStatus.REQUESTED,
        timestamp: new Date(),
        changedBy: currentUser._id,
      },
    ];

    // Create booking
    const newBooking = new this.bookingModel({
      ...createBookingDto,
      organizer: currentUser._id,
      statusHistory,
    });

    return newBooking.save();
  }

  async findAll(query: any = {}): Promise<Booking[]> {
    return this.bookingModel
      .find(query)
      .populate('artist')
      .populate('event')
      .populate('organizer', 'name email')
      .exec();
  }

  async findByArtist(artistId: string): Promise<Booking[]> {
    return this.bookingModel
      .find({ artist: artistId })
      .populate('artist')
      .populate('event')
      .populate('organizer', 'name email')
      .exec();
  }

  async findByOrganizer(organizerId: string): Promise<Booking[]> {
    return this.bookingModel
      .find({ organizer: organizerId })
      .populate('artist')
      .populate('event')
      .populate('organizer', 'name email')
      .exec();
  }

  async findOne(id: string): Promise<BookingDocument> {
    const booking = await this.bookingModel
      .findById(id)
      .populate('artist')
      .populate('event')
      .populate('organizer', 'name email')
      .exec();

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    return booking;
  }

  async update(
    id: string,
    updateBookingDto: UpdateBookingDto,
    currentUser: any,
  ): Promise<BookingDocument> {
    const booking = await this.findOne(id);

    // Authorization check
    this.checkUpdateAuthorization(booking, currentUser);

    // Handle date changes
    if (updateBookingDto.startTime || updateBookingDto.endTime) {
      const startTime = updateBookingDto.startTime || booking.startTime;
      const endTime = updateBookingDto.endTime || booking.endTime;

      await this.checkDateConflicts(
        booking.artist._id.toString(),
        startTime,
        endTime,
        id,
      );
    }

    // Handle status changes
    if (updateBookingDto.status && updateBookingDto.status !== booking.status) {
      // Validate status transition
      this.validateStatusTransition(
        booking.status,
        updateBookingDto.status,
        currentUser.role,
      );

      // Update status history
      booking.statusHistory.push({
        status: updateBookingDto.status,
        timestamp: new Date(),
        changedBy: currentUser._id,
      });
    }

    // Apply updates
    const updatedBooking = await this.bookingModel
      .findByIdAndUpdate(
        id,
        {
          ...updateBookingDto,
          statusHistory: booking.statusHistory,
        },
        { new: true },
      )
      .exec();

    if (!updatedBooking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    return updatedBooking;
  }

  async updateStatus(
    id: string,
    updateStatusDto: UpdateBookingStatusDto,
    currentUser: any,
  ): Promise<Booking> {
    const booking = await this.findOne(id);

    // Authorization check based on role and new status
    this.checkStatusUpdateAuthorization(
      booking,
      updateStatusDto.status,
      currentUser,
    );

    // Validate status transition
    this.validateStatusTransition(
      booking.status,
      updateStatusDto.status,
      currentUser.role,
    );

    // Update status history
    booking.statusHistory.push({
      status: updateStatusDto.status,
      timestamp: new Date(),
      changedBy: currentUser._id,
    });

    // Update payment info if status is PAID
    let paymentUpdate = {};
    if (updateStatusDto.status === BookingStatus.PAID && booking.payment) {
      paymentUpdate = {
        'payment.isPaid': true,
        'payment.paidDate': new Date(),
      };
    }

    // Apply updates
    const updatedBooking = await this.bookingModel
      .findByIdAndUpdate(
        id,
        {
          status: updateStatusDto.status,
          statusHistory: booking.statusHistory,
          notes: updateStatusDto.notes
            ? booking.notes + '\n' + updateStatusDto.notes
            : booking.notes,
          ...paymentUpdate,
        },
        { new: true },
      )
      .exec();

    if (!updatedBooking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    // Update the event artist slot status to match booking status
    await this.syncEventArtistSlotStatus(updatedBooking);

    return updatedBooking;
  }

  async remove(id: string, currentUser: any): Promise<Booking> {
    const booking = await this.findOne(id);

    // Only admins can delete bookings
    // Regular users should update status to CANCELLED instead
    if (currentUser.role !== UserRole.ADMIN) {
      if (
        booking.organizer._id.toString() !== currentUser._id.toString() &&
        booking.artist.user.toString() !== currentUser._id.toString()
      ) {
        throw new ForbiddenException('You can only cancel your own bookings');
      }

      // If not in REQUESTED or IN_REVIEW status, don't allow deletion
      if (
        booking.status !== BookingStatus.REQUESTED &&
        booking.status !== BookingStatus.IN_REVIEW
      ) {
        return this.updateStatus(
          id,
          { status: BookingStatus.CANCELLED },
          currentUser,
        );
      }
    }

    const deletedBooking = await this.bookingModel.findByIdAndDelete(id).exec();

    if (!deletedBooking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    return deletedBooking;
  }

  // Helper methods

  private async checkDateConflicts(
    artistId: string,
    startTime: Date,
    endTime: Date,
    excludeBookingId?: string,
  ): Promise<void> {
    // Skip validation if no dates provided
    if (!startTime || !endTime) {
      return;
    }

    // Validate start time is before end time
    if (startTime >= endTime) {
      throw new BadRequestException('Start time must be before end time');
    }

    // Check for conflicting bookings
    const query: any = {
      artist: artistId,
      status: {
        $in: [
          BookingStatus.REQUESTED,
          BookingStatus.IN_REVIEW,
          BookingStatus.ACCEPTED,
          BookingStatus.PAID,
        ],
      },
      $or: [
        // Case 1: New booking starts during an existing booking
        { startTime: { $lte: startTime }, endTime: { $gt: startTime } },
        // Case 2: New booking ends during an existing booking
        { startTime: { $lt: endTime }, endTime: { $gte: endTime } },
        // Case 3: New booking completely contains an existing booking
        { startTime: { $gte: startTime }, endTime: { $lte: endTime } },
      ],
    };

    // Exclude current booking if updating
    if (excludeBookingId) {
      query._id = { $ne: excludeBookingId };
    }

    const conflictingBookings = await this.bookingModel.find(query).exec();

    if (conflictingBookings.length > 0) {
      throw new ConflictException(
        `Artist already has booking(s) during this time period. Conflicting booking IDs: ${conflictingBookings
          .map((b) => b._id)
          .join(', ')}`,
      );
    }
  }

  private checkUpdateAuthorization(
    booking: BookingDocument,
    currentUser: any,
  ): void {
    // Admins can update any booking
    if (currentUser.role === UserRole.ADMIN) {
      return;
    }

    // Organizers can only update their own bookings
    if (
      booking.organizer._id.toString() !== currentUser._id.toString() &&
      booking.artist.user.toString() !== currentUser._id.toString()
    ) {
      throw new ForbiddenException('You can only update your own bookings');
    }

    // Additional restrictions based on booking status
    if (
      booking.status === BookingStatus.COMPLETED ||
      booking.status === BookingStatus.CANCELLED
    ) {
      throw new ForbiddenException(
        'Cannot update completed or cancelled bookings',
      );
    }
  }

  private checkStatusUpdateAuthorization(
    booking: BookingDocument,
    newStatus: BookingStatus,
    currentUser: any,
  ): void {
    // Admins can update any status
    if (currentUser.role === UserRole.ADMIN) {
      return;
    }

    // Validate based on role and status transition
    const isOrganizer =
      booking.organizer._id.toString() === currentUser._id.toString();
    const isArtist =
      booking.artist.user.toString() === currentUser._id.toString();

    if (!isOrganizer && !isArtist) {
      throw new ForbiddenException('You can only update your own bookings');
    }

    // Status-specific restrictions
    switch (newStatus) {
      case BookingStatus.IN_REVIEW:
        // Only artists can mark as in-review
        if (!isArtist) {
          throw new ForbiddenException(
            'Only artists can mark bookings as in-review',
          );
        }
        break;

      case BookingStatus.ACCEPTED:
      case BookingStatus.REJECTED:
        // Only artists can accept/reject
        if (!isArtist) {
          throw new ForbiddenException(
            'Only artists can accept or reject bookings',
          );
        }
        break;

      case BookingStatus.PAID:
        // Only organizers can mark as paid
        if (!isOrganizer) {
          throw new ForbiddenException(
            'Only organizers can mark bookings as paid',
          );
        }
        break;

      case BookingStatus.COMPLETED:
        // Only organizers can mark as completed
        if (!isOrganizer) {
          throw new ForbiddenException(
            'Only organizers can mark bookings as completed',
          );
        }
        break;

      case BookingStatus.CANCELLED:
        // Both can cancel in certain states
        break;

      default:
        break;
    }
  }

  private validateStatusTransition(
    currentStatus: BookingStatus,
    newStatus: BookingStatus,
    userRole: UserRole,
  ): void {
    // Define allowed transitions
    const allowedTransitions: Record<BookingStatus, BookingStatus[]> = {
      [BookingStatus.REQUESTED]: [
        BookingStatus.IN_REVIEW,
        BookingStatus.REJECTED,
        BookingStatus.CANCELLED,
      ],
      [BookingStatus.IN_REVIEW]: [
        BookingStatus.ACCEPTED,
        BookingStatus.REJECTED,
        BookingStatus.CANCELLED,
      ],
      [BookingStatus.ACCEPTED]: [BookingStatus.PAID, BookingStatus.CANCELLED],
      [BookingStatus.REJECTED]: [
        // No further transitions allowed
      ],
      [BookingStatus.PAID]: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
      [BookingStatus.COMPLETED]: [
        // No further transitions allowed
      ],
      [BookingStatus.CANCELLED]: [
        // No further transitions allowed
      ],
    };

    // Admins can bypass some restrictions
    if (userRole === UserRole.ADMIN) {
      // Allow admins to move between most states, except completed/cancelled
      if (
        currentStatus === BookingStatus.COMPLETED ||
        currentStatus === BookingStatus.CANCELLED
      ) {
        throw new BadRequestException(
          `Cannot transition from ${currentStatus} status`,
        );
      }
      return;
    }

    // Check if transition is allowed
    if (
      !allowedTransitions[currentStatus] ||
      !allowedTransitions[currentStatus].includes(newStatus)
    ) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${newStatus}. ` +
          `Allowed transitions: ${
            allowedTransitions[currentStatus]?.join(', ') || 'none'
          }`,
      );
    }
  }

  private async syncEventArtistSlotStatus(
    booking: BookingDocument,
  ): Promise<void> {
    try {
      const event = await this.eventsService.findOne(
        booking.event._id.toString(),
      );

      // Find the artist slot that matches this booking
      const artistSlotIndex = event.artistSlots.findIndex(
        (slot) =>
          slot.artist &&
          (typeof slot.artist === 'string'
            ? slot.artist === booking.artist._id.toString()
            : (slot.artist as ArtistDocument)._id.toString() ===
              booking.artist._id.toString()),
      );

      if (artistSlotIndex === -1) {
        return; // No matching slot found
      }

      // Map booking status to artist slot status
      let slotStatus: ArtistSlotStatus;

      switch (booking.status) {
        case BookingStatus.REQUESTED:
        case BookingStatus.IN_REVIEW:
          slotStatus = ArtistSlotStatus.PENDING;
          break;
        case BookingStatus.ACCEPTED:
          slotStatus = ArtistSlotStatus.PENDING; // Still pending until paid
          break;
        case BookingStatus.PAID:
        case BookingStatus.COMPLETED:
          slotStatus = ArtistSlotStatus.CONFIRMED;
          break;
        case BookingStatus.REJECTED:
        case BookingStatus.CANCELLED:
          slotStatus = ArtistSlotStatus.CANCELLED;
          break;
        default:
          slotStatus = ArtistSlotStatus.UNFILLED;
      }

      // Update the slot status without triggering a new booking
      await this.eventsService.updateArtistSlotStatusOnly(
        event._id.toString(),
        artistSlotIndex,
        slotStatus,
      );
    } catch (error) {
      console.error('Failed to sync event artist slot status:', error);
      // We don't want to fail the booking update if this fails,
      // so we just log the error
    }
  }
}
