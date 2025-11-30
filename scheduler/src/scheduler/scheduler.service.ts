import { Injectable, Logger } from '@nestjs/common'
import * as cron from 'node-cron'
import { createClient } from '@supabase/supabase-js'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import { AppointmentDto } from 'src/dto/appointment.dto'
import { LabBookingConfirmationDto } from 'src/dto/lab-booking-confirmation.dto'
import { AppointmentCancellationDto } from 'src/dto/appointment-cancellation.dto'

// Map reason codes to display labels
const REASON_LABELS: Record<string, string> = {
  'emergency': 'Personal Emergency',
  'scheduling': 'Scheduling Conflict',
  'patient-request': 'Patient Requested',
  'unavailable': 'Unavailable at Scheduled Time',
  'other': 'Other',
}

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name)
  private readonly supabase

  constructor(@InjectQueue('appointment-schedules') private appointmentQueue: Queue,
  @InjectQueue('lab-schedules') private labQueue: Queue) {
    this.supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  }




async removeScheduledJobs(appointmentId: string, queueType: 'appointment' | 'lab') {
  try {
    const queue = queueType === 'appointment' ? this.appointmentQueue : this.labQueue
    
    const jobs = await queue.getJobs(['delayed', 'waiting'])
    const jobsToRemove = jobs.filter(job => job.data.appointment_id === appointmentId)
    
    for (const job of jobsToRemove) {
      await job.remove()
      this.logger.log(`Removed job ${job.id} for ${queueType} ${appointmentId}`)
    }
    
    return jobsToRemove.length
  } catch (error) {
    this.logger.error(`Failed to remove scheduled jobs for ${appointmentId}`, error)
    throw error
  }
}

async handleAppointmentReschedule(data: AppointmentDto) {
  const appointmentId = data.appointment_id
  
  // Remove all existing scheduled reminders for this appointment
  const removedCount = await this.removeScheduledJobs(appointmentId, 'appointment')
  this.logger.log(`Removed ${removedCount} scheduled jobs for rescheduled appointment ${appointmentId}`)
  
  // Schedule new reminders with updated time
  await this.handleAppointment(data)
  
  // Send reschedule notifications
  const { patient_id, doctor_id, patient_name, doctor_name, appointment_date, appointment_time } = data
  await this.createNotification(
    patient_id,
    `Your appointment with ${doctor_name} has been rescheduled to ${appointment_date.split('T')[0]} at ${appointment_time}`,
    'Appointment Rescheduled'
  )
  await this.createNotification(
    doctor_id,
    `Appointment with ${patient_name} has been rescheduled to ${appointment_date.split('T')[0]} at ${appointment_time}`,
    'Appointment Rescheduled'
  )
}

async handleAppointment(data:AppointmentDto) {
  const { patient_id, doctor_id, patient_name, doctor_name, appointment_date, appointment_time } = data

  // ✅ Combine and treat as UTC
  console.log('Appointment Data:', data)
    const appointmentDateTime = new Date(`${appointment_date.split('T')[0]}T${appointment_time}Z`)
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




  await this.createNotification(patient_id, `Your appointment with ${doctor_name} is booked for ${appointment_date.split('T')[0]} at ${appointment_time}`,'New Appointment Booked' )
  await this.createNotification(doctor_id, `New appointment scheduled with ${patient_name} on ${appointment_date.split('T')[0]} at ${appointment_time}`,'New Appointment Booked' )
}


async handleLabBookingReschedule(data: LabBookingConfirmationDto) {
  const bookingId = data.booking_id
  
  // Remove all existing scheduled reminders for this lab booking
  const removedCount = await this.removeScheduledJobs(bookingId, 'lab')
  this.logger.log(`Removed ${removedCount} scheduled jobs for rescheduled lab booking ${bookingId}`)
  
  // Schedule new reminders with updated time
  await this.handleLabBooking(data)
  
  // Send reschedule notifications
  const { patient_id, technician_id, patient_name, scheduled_date, scheduled_time, test_name, location } = data
  await this.createNotification(
    patient_id,
    `Your Lab test: ${test_name} has been rescheduled to ${scheduled_date} at ${scheduled_time}. Location: ${location}`,
    'Lab Test Rescheduled'
  )
  await this.createNotification(
    technician_id,
    `Lab Test: ${test_name} with ${patient_name} has been rescheduled to ${scheduled_date} at ${scheduled_time}`,
    'Lab Test Rescheduled'
  )
}

async handleLabBooking(data:LabBookingConfirmationDto) {
  const { patient_id,  patient_name, technician_id, location,scheduled_time,scheduled_date,patient_email,test_name} = data

 const [day, month, year] = scheduled_date.split('/')

const isoDate = `${year}-${month}-${day}`

const appointmentDateTime = new Date(`${isoDate}T${scheduled_time}:00Z`)

console.log('lab DateTime (UTC):', appointmentDateTime.toISOString())

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
      await this.labQueue.add('oneDayReminder', data, { delay: delayForOneDay })
    }

    if (delayForThirtyMin > 0) {
      console.log('Scheduling 30-min reminder with delay:', delayForThirtyMin)
      await this.labQueue.add('thirtyMinReminder', data, { delay: delayForThirtyMin })
    }




  await this.createNotification(patient_id, `Your Lab test: ${test_name} booked for ${scheduled_date.split('T')[0]} at ${scheduled_time}  Location: ${location}`,'New Lab Test Booked' )
  await this.createNotification(technician_id, `New Lab Test: ${test_name} scheduled with ${patient_name} on ${scheduled_date.split('T')[0]} at ${scheduled_time}`,'New Lab Test Booked' )
}


async handleAppointmentCancellation(data: AppointmentCancellationDto) {
  const { 
    appointment_id, 
    patient_id, 
    doctor_id, 
    patient_name, 
    doctor_name, 
    appointment_date, 
    appointment_time,
    cancellation_reason,
    cancellation_notes 
  } = data

  this.logger.log(`Handling appointment cancellation for ${appointment_id}`)

  // Remove any scheduled reminders for this appointment
  const removedCount = await this.removeScheduledJobs(appointment_id, 'appointment')
  this.logger.log(`Removed ${removedCount} scheduled reminder jobs for cancelled appointment ${appointment_id}`)

  // Get display label for reason
  const reasonDisplay = cancellation_reason ? (REASON_LABELS[cancellation_reason] || cancellation_reason) : 'Not specified'
  const notesText = cancellation_notes ? ` Notes: ${cancellation_notes}` : ''

  // Send notification to patient
  await this.createNotification(
    patient_id,
    `Your appointment with ${doctor_name} scheduled for ${appointment_date.split('T')[0]} at ${appointment_time} has been cancelled. Reason: ${reasonDisplay}.${notesText}`,
    'Appointment Cancelled'
  )

  // Send notification to doctor/nutritionist
  await this.createNotification(
    doctor_id,
    `Appointment with ${patient_name} scheduled for ${appointment_date.split('T')[0]} at ${appointment_time} has been cancelled. Reason: ${reasonDisplay}.${notesText}`,
    'Appointment Cancelled'
  )

  this.logger.log(`Cancellation notifications sent for appointment ${appointment_id}`)
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
