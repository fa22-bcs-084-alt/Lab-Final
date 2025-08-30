import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type ProfileDocument = Profile & Document

@Schema({ timestamps: true })
export class Profile {
  @Prop({ required: true })
  id: string

  @Prop()
  name: string
 

  @Prop()
  phone: string

  @Prop()
  dateOfBirth: string

  @Prop()
  address: string

  @Prop()
  emergencyContact: string

  @Prop()
  bloodType: string

  @Prop()
  allergies: string

  @Prop()
  conditions: string

  @Prop()
  medications: string

  @Prop()
  avatar: string

  @Prop()
  gender: string

  @Prop()
  weight: number

  @Prop()
  height: number

  @Prop()
  vaccines: string

  @Prop()
  ongoingMedications: string

  @Prop()
  surgeryHistory: string

  @Prop()
  implants: string

  @Prop()
  pregnancyStatus: string

  @Prop()
  menstrualCycle: string

  @Prop()
  mentalHealth: string

  @Prop()
  familyHistory: string

  @Prop()
  organDonor: string

  @Prop()
  disabilities: string

  @Prop()
  lifestyle: string

  @Prop()
  healthscore: number

  @Prop()
  adherence: string

  @Prop()
  missed_doses: string

  @Prop()
  doses_taken: string

  @Prop({ type: Object })
  limit: Record<string, number>
}

export const ProfileSchema = SchemaFactory.createForClass(Profile)
