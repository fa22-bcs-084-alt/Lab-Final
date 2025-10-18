import { google } from 'googleapis'

export async function createGoogleMeetLink({
  patientEmail,
  nutritionistEmail,
  patientName,
  nutritionistName,
  appointmentDate,
  appointmentTime,
  appointmentId,
  notes
}: {
  patientEmail: string
  nutritionistEmail: string
  patientName: string
  nutritionistName: string
  appointmentDate: string
  appointmentTime: string
  appointmentId: string
  notes?: string
}): Promise<{
  meetLink: string
  eventId: string
  eventLink: string
}> {
  console.log('🟢 [GoogleMeet] Starting Meet creation via Calendar API...')
  console.log('📅 Input Data:', {
    patientEmail,
    nutritionistEmail,
    patientName,
    nutritionistName,
    appointmentDate,
    appointmentTime,
    appointmentId,
    notes
  })

  try {
    console.log('🔐 Initializing OAuth2 client...')
    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'http://localhost:4001/auth/google/callback'
    )

    if (!process.env.GOOGLE_REFRESH_TOKEN) throw new Error('Missing GOOGLE_REFRESH_TOKEN in environment variables')
    oAuth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })

    console.log('✅ OAuth2 client authenticated successfully')

    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client })

    console.log('🧭 Parsing appointment date and time...')
    let startDate: Date
    if (appointmentDate.includes('T')) {
      const baseDate = new Date(appointmentDate)
      const [hours, minutes, seconds] = appointmentTime.split(':').map(Number)
      baseDate.setHours(hours, minutes, seconds || 0)
      startDate = baseDate
    } else {
      startDate = new Date(`${appointmentDate}T${appointmentTime}`)
    }

    if (isNaN(startDate.getTime())) throw new Error('Invalid appointment date/time provided')

    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000)
    console.log('🕒 Appointment Start:', startDate.toISOString())
    console.log('🕓 Appointment End:', endDate.toISOString())

    const event = {
      summary: `Hygieia Appointment - ${patientName} & ${nutritionistName}`,
      description: notes || 'Appointment via Hygieia Health Platform',
      start: { dateTime: startDate.toISOString(), timeZone: 'Asia/Karachi' },
      end: { dateTime: endDate.toISOString(), timeZone: 'Asia/Karachi' },
      attendees: [
        { email: patientEmail },
        { email: nutritionistEmail }
      ],
      conferenceData: {
        createRequest: {
          requestId: `meet-${appointmentId}-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      }
    }

    console.log('📨 Sending event creation request to Google Calendar...')
    const response = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      requestBody: event,
      sendUpdates: 'all'
    })

    const meetLink = response.data.hangoutLink || ''
    const eventId = response.data.id || ''
    const eventLink = response.data.htmlLink || ''

    console.log('✅ Google Meet created successfully!')
    console.log('🔗 Meet Link:', meetLink)
    console.log('🆔 Event ID:', eventId)
    console.log('🌐 Calendar Event URL:', eventLink)

    return { meetLink, eventId, eventLink }
  } catch (error: any) {
    console.error('❌ [GoogleMeet] Error creating Meet link:', error.message)
    console.error('⚙️ Full Error:', error)
    throw new Error(`Failed to create Google Meet link: ${error.message}`)
  }
}
