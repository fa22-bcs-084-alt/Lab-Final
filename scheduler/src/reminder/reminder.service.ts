// reminder.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Inject, Logger } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices/client/client-proxy'
import { createClient } from '@supabase/supabase-js'

@Processor('appointment-schedules')
export class ReminderService extends WorkerHost {
  private readonly logger = new Logger(ReminderService.name)
  private readonly supabase

    constructor(
       @Inject('MAILER_SERVICE') private readonly mailerClient: ClientProxy,
    ) {
      super()
      this.supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    }
  

  async process(job:{data: {patient_id: string, doctor_id: string, patient_name: string, doctor_name: string, appointment_date: string, appointment_time: string , name: string  ,patient_email:string, appointment_mode: string, appointment_link: string}, name: string}) {
    const { patient_id, doctor_id, patient_name, doctor_name, appointment_date, appointment_time,patient_email ,appointment_mode,appointment_link} = job.data

    if (job.name === 'oneDayReminder') {
      
    this.logger.log(`1-day Reminder: ${patient_name} has an appointment with ${doctor_name} tomorrow`)
    await this.createNotification(patient_id, `You have an appointment with ${doctor_name} tomorrow at ${appointment_time}`, 'Appointment Reminder')
    await this.createNotification(doctor_id, `You have an appointment with ${patient_name} tomorrow at ${appointment_time}`, 'Appointment Reminder')

     this.mailerClient.emit('one_day_reminder', {
          patient_id: patient_id,
          doctor_id: doctor_id,
          patient_email: patient_email,
          patient_name: patient_name || 'Patient',
          doctor_name: doctor_name || 'Doctor',
          appointment_date: appointment_date,
          appointment_time: appointment_time,
          appointment_mode: appointment_mode,
          appointment_link: appointment_link || undefined,
         
        });

        
    } else if (job.name === 'thirtyMinReminder') {
       this.logger.log(`30-min Reminder: ${patient_name} has an appointment with ${doctor_name}`)
      this.createNotification(patient_id, `Reminder: You have an appointment with ${doctor_name} in 30 minutes`, 'Appointment Reminder')
      this.createNotification(doctor_id, `Reminder: You have an appointment with ${patient_name} in 30 minutes`, 'Appointment Reminder')

     this.mailerClient.emit('thirty_min_reminder', {
          patient_id: patient_id,
          doctor_id: doctor_id,
          patient_email: patient_email,
          patient_name: patient_name || 'Patient',
          doctor_name: doctor_name || 'Doctor',
          appointment_date: appointment_date,
          appointment_time: appointment_time,
          appointment_mode: appointment_mode,
          appointment_link: appointment_link || undefined,
         
        });
    }
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
