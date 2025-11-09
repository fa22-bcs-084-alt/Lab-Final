// reminder.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Inject, Logger } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices/client/client-proxy'
import { createClient } from '@supabase/supabase-js'
import { AppointmentDto } from 'src/dto/appointment.dto'

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
  

  async process(job:{data:AppointmentDto,name:string}) {
    const { patient_id, doctor_id, patient_name, doctor_name, appointment_date, appointment_time,patient_email ,appointment_mode,appointment_link} = job.data

    if (job.name === 'oneDayReminder') {
      if (await this.isAppointmentActive(job.data.appointment_id)) {
    this.logger.log(`1-day Reminder: ${patient_name} has an appointment with ${doctor_name} tomorrow`)
    await this.createNotification(patient_id, `You have an appointment with ${doctor_name} tomorrow at ${appointment_time}`, 'Appointment Reminder')
    await this.createNotification(doctor_id, `You have an appointment with ${patient_name} tomorrow at ${appointment_time}`, 'Appointment Reminder')

     this.mailerClient.emit('one_day_reminder', {
          appointment_id: job.data.appointment_id,
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

      }else{
        this.logger.log(`Appointment ${job.data.appointment_id} is cancelled. Skipping 1-day reminder.`)
      }
        
    } else if (job.name === 'thirtyMinReminder') {
      if (await this.isAppointmentActive(job.data.appointment_id)) {
       this.logger.log(`30-min Reminder: ${patient_name} has an appointment with ${doctor_name}`)
      this.createNotification(patient_id, `Reminder: You have an appointment with ${doctor_name} in 30 minutes`, 'Appointment Reminder')
      this.createNotification(doctor_id, `Reminder: You have an appointment with ${patient_name} in 30 minutes`, 'Appointment Reminder')

     this.mailerClient.emit('thirty_min_reminder', {
          appointment_id: job.data.appointment_id,
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
      }else{
        this.logger.log(`Appointment ${job.data.appointment_id} is cancelled. Skipping 30-min reminder.`)
      }
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


  private async  isAppointmentActive(appointmentId: string): Promise<boolean> {
  const { data, error } = await this.supabase
    .from('appointments')
    .select('status')
    .eq('id', appointmentId)
    .single()

  if (error) {
    console.error('Error fetching appointment:', error)
    return false
  }

  return data?.status !== 'cancelled'
}


}
