import { Module } from '@nestjs/common'
import { AppointmentsService } from './appointments.service'
import { AppointmentsController } from './appointments.controller'
import { MongooseModule } from '@nestjs/mongoose'
import { Profile,ProfileSchema } from './schema/patient.profile.schema'
import { NutritionistProfile, NutritionistProfileSchema } from './schema/nutritionist-profile.schema'

@Module({
    imports: [MongooseModule.forFeature([{ name: Profile.name, schema: ProfileSchema },{ name: NutritionistProfile.name, schema: NutritionistProfileSchema }])],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
