import { Injectable, Logger } from '@nestjs/common'
import * as cron from 'node-cron'
import { createClient } from '@supabase/supabase-js'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name)
  private readonly supabase

  constructor(@InjectQueue('appointment-schedules') private appointmentQueue: Queue) {
    this.supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  }



async handleAppointment(data: {patient_id: string, doctor_id: string, patient_name: string, doctor_name: string, appointment_date: string, appointment_time: string}) {
  const { patient_id, doctor_id, patient_name, doctor_name, appointment_date, appointment_time } = data

  // ✅ Combine and treat as UTC
    const appointmentDateTime = new Date(`${appointment_date}T${appointment_time}Z`)
    console.log('Appointment DateTime (UTC):', appointmentDateTime.toISOString())

    const now =  new Date(
  Date.now() + (5 * 60 * 60 * 1000) // add +5 hours (karachi time)
)
    const oneDayBefore = new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1000)
    const thirtyMinBefore = new Date(appointmentDateTime.getTime() - 30 * 60 * 1000)

    console.log('30-min Reminder (UTC):', thirtyMinBefore.toISOString())
    console.log('1-day Reminder (UTC):', oneDayBefore.toISOString())
    const delayForOneDay = oneDayBefore.getTime() - now.getTime()
    const delayForThirtyMin = thirtyMinBefore.getTime() - now.getTime()

    console.log('1-day reminder with delay:', delayForOneDay)
    console.log('30-min reminder with delay:', delayForThirtyMin)


    if (delayForOneDay > 0) {
      await this.appointmentQueue.add('oneDayReminder', data, { delay: delayForOneDay })
    }

    if (delayForThirtyMin > 0) {
      console.log('Scheduling 30-min reminder with delay:', delayForThirtyMin)
      await this.appointmentQueue.add('thirtyMinReminder', data, { delay: delayForThirtyMin })
    }




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
