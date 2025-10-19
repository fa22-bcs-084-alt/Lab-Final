import { Injectable, Logger } from '@nestjs/common'
import * as cron from 'node-cron'
import { createClient } from '@supabase/supabase-js'

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name)
  private readonly supabase


  constructor() {
    this.supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  }

async handleAppointment(data: any) {
  const { patient_id, doctor_id, patient_name, doctor_name, appointment_date, appointment_time } = data

  // ✅ Combine and treat as UTC
  const appointmentDateTime = new Date(`${appointment_date}T${appointment_time}Z`)

  const thirtyMinBefore = new Date(appointmentDateTime.getTime() - 30 * 60 * 1000)
  const oneDayBefore = new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1000)

  this.scheduleJob(thirtyMinBefore, () => {
    //send email
    this.logger.log(`30-min Reminder: ${patient_name} has an appointment with ${doctor_name}`)
    this.createNotification(patient_id, `Reminder: You have an appointment with ${doctor_name} in 30 minutes`, 'Appointment Reminder')
    this.createNotification(doctor_id, `Reminder: You have an appointment with ${patient_name} in 30 minutes`, 'Appointment Reminder')
  })

  this.scheduleJob(oneDayBefore, async () => {
    //send email
    this.logger.log(`1-day Reminder: ${patient_name} has an appointment with ${doctor_name} tomorrow`)
    await this.createNotification(patient_id, `You have an appointment with ${doctor_name} tomorrow at ${appointment_time}`, 'Appointment Reminder')
    await this.createNotification(doctor_id, `You have an appointment with ${patient_name} tomorrow at ${appointment_time}`, 'Appointment Reminder')


})

  await this.createNotification(patient_id, `Your appointment with ${doctor_name} is booked for ${appointment_date} at ${appointment_time}`,'New Appointment Booked' )
  await this.createNotification(doctor_id, `New appointment scheduled with ${patient_name} on ${appointment_date} at ${appointment_time}`,'New Appointment Booked' )
}


  private scheduleJob(date: Date, callback: () => void) {
    const now = new Date()
    if (date < now) {
      this.logger.warn('Skipping past-due job: ' + date.toISOString())
      return
    }

    const cronExpression = `${date.getUTCMinutes()} ${date.getUTCHours()} ${date.getUTCDate()} ${date.getUTCMonth() + 1} *`
    cron.schedule(cronExpression, callback, {timezone: 'Asia/Karachi' })
    this.logger.log(`Scheduled job at ${date.toISOString()}`)
  }

  private async createNotification(userId: string, message: string,title?: string) {
    const { error } = await this.supabase.from('notifications').insert([
      {
        user_id: userId,
        notification_msg: message,
        action: null,
        title: title || 'Appointment Reminder',

      },
    ])

    if (error) {
      this.logger.error('Failed to insert notification', error)
    } else {
      this.logger.log(`Notification inserted for user: ${userId}`)
    }
  }
}
