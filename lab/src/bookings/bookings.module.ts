import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Profile, ProfileSchema } from './schema/patient.profile.schema';

@Module({
  imports:[  MongooseModule.forFeature([{ name: Profile.name, schema: ProfileSchema }]),
],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
