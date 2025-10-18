import axios from 'axios'

export async function createZoomMeeting({
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
  joinLink: string
  startLink: string
  meetingId: string
}> {
  console.log('🟢 [Zoom] Creating meeting via Zoom API...')
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
    console.log('🔐 Fetching Zoom access token...')
    const tokenResponse = await axios.post(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${process.env.ZOOM_ACCOUNT_ID}`,
      {},
      {
        headers: {
          Authorization:
            'Basic ' +
            Buffer.from(
              `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
            ).toString('base64')
        }
      }
    )

    const accessToken = tokenResponse.data.access_token
    if (!accessToken) throw new Error('Failed to retrieve Zoom access token')
    console.log('✅ Access token obtained successfully')

    console.log('🧭 Parsing appointment date/time...')
    let startDate: Date
    if (appointmentDate.includes('T')) {
      const baseDate = new Date(appointmentDate)
      const [hours, minutes, seconds] = appointmentTime.split(':').map(Number)
      baseDate.setHours(hours, minutes, seconds || 0)
      startDate = baseDate
    } else {
      startDate = new Date(`${appointmentDate}T${appointmentTime}`)
    }

    if (isNaN(startDate.getTime())) throw new Error('Invalid appointment date/time')

    const meetingStartTime = startDate.toISOString()

    console.log('📨 Sending meeting creation request to Zoom...')
    const meetingResponse = await axios.post(
      'https://api.zoom.us/v2/users/me/meetings',
      {
        topic: `Hygieia Appointment - ${patientName} & ${nutritionistName}`,
        type: 2, // scheduled meeting
        start_time: meetingStartTime,
        duration: 30,
        timezone: 'Asia/Karachi',
        agenda: notes || 'Appointment via Hygieia Health Platform',
        settings: {
          host_video: true,
          participant_video: true,
          waiting_room: false,
          join_before_host: true,
          approval_type: 2,
          audio: 'both',
          auto_recording: 'none',
          registrants_email_notification: false
        }
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    const data = meetingResponse.data
    console.log('✅ Zoom meeting created successfully!')
    console.log('🔗 Join URL:', data.join_url)
    console.log('🚀 Start URL (host):', data.start_url)
    console.log('🆔 Meeting ID:', data.id)

    return {
      joinLink: data.join_url,
      startLink: data.start_url,
      meetingId: data.id.toString()
    }
  } catch (error: any) {
    console.error('❌ [Zoom] Error creating meeting:', error.message)
    console.error('⚙️ Full Error:', error.response?.data || error)
    throw new Error(`Failed to create Zoom meeting: ${error.message}`)
  }
}
