// reminder.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Inject, Logger } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices/client/client-proxy'
import { createClient } from '@supabase/supabase-js'
import { LabBookingConfirmationDto } from 'src/dto/lab-booking-confirmation.dto'


@Processor('lab-schedules')
export class LabsReminderService extends WorkerHost {
  private readonly logger = new Logger(LabsReminderService.name)
  private readonly supabase

    constructor(
       @Inject('MAILER_SERVICE') private readonly mailerClient: ClientProxy,
    ) {
      super()
      this.supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    }
  

  async process(job:{data:LabBookingConfirmationDto,name:string}) {
    const { patient_id,  patient_name, technician_id, location,scheduled_time,scheduled_date,patient_email,test_name} = job.data

    if (job.name === 'oneDayReminder') {
      if (await this.isLabTestActive(job.data.booking_id)) {
    this.logger.log(`1-day Reminder: ${patient_name} has a lab test: ${test_name} tomorrow`)
    await this.createNotification(patient_id, `You have a lab test: ${test_name} tomorrow at ${scheduled_time} Location: ${location}`, 'Lab Test Reminder')
    await this.createNotification(technician_id, `You have a lab test: ${test_name} with ${patient_name} tomorrow at ${scheduled_time} Location: ${location}`, 'Lab Test Reminder')

     this.mailerClient.emit('one_day_reminder_lab_test', job.data);

      }else{
        this.logger.log(`Lab test ${job.data.booking_id} is cancelled. Skipping 1-day reminder.`)
      }
        
    } else if (job.name === 'thirtyMinReminder') {
      if (await this.isLabTestActive(job.data.booking_id)) {
       this.logger.log(`30-min Reminder: ${patient_name} has a lab test: ${test_name}`)
       this.createNotification(patient_id, `You have a lab test: ${test_name} in 30 minutes`, 'Lab Test Reminder')
       this.createNotification(technician_id, `You have a lab test: ${test_name} with ${patient_name} in 30 minutes`, 'Lab Test Reminder')

     this.mailerClient.emit('thirty_min_reminder_lab_test', job.data);
      }else{
        this.logger.log(`Lab test ${job.data.booking_id} is cancelled. Skipping 30-min reminder.`)
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


  private async  isLabTestActive(appointmentId: string): Promise<boolean> {
  const { data, error } = await this.supabase
    .from('booked_lab_tests')
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
