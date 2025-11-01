
import { COLORS, getHeaderWithLogo, getFooter, getIconCircle } from "./utils"

export function generateAppointmentConfirmationEmail(data: {
  patient_id: string
  doctor_id: string
  patient_name: string
  doctor_name: string
  appointment_date: string
  appointment_time: string
  patient_email: string
  link: string | null
  appointment_mode: string
}): string {
  const checkmarkIcon = `
    <svg width="50" height="50" viewBox="0 0 24 24" fill="none">
      <path d="M20 6L9 17L4 12" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Appointment Confirmation | Hygieia</title>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.background};font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:${COLORS.textDark};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:60px 0;background:${COLORS.background};">
    <tr>
      <td align="center">
        <table width="600" cellspacing="0" cellpadding="0" style="background:#FFFFFF;border-radius:20px;box-shadow:0 10px 25px rgba(0,0,0,0.06);overflow:hidden;">
          
          <tr>
            <td style="background:linear-gradient(135deg,${COLORS.primary},${COLORS.secondary});padding:40px 30px 50px;display:flex;flex-direction:column;align-items:center;justify-content:center;">
              ${getHeaderWithLogo()}
            </td>
          </tr>

          <tr>
            <td style="position:relative;top:-40px;">
              ${getIconCircle(checkmarkIcon)}
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 20px;text-align:center;">
              <h2 style="margin-top:-10px;font-size:26px;font-weight:700;color:${COLORS.textDark};">Appointment Confirmed!</h2>
              <p style="margin:10px 0 35px;font-size:16px;color:${COLORS.textMuted};line-height:1.6;">Your appointment with <strong>${data.doctor_name}</strong> has been successfully booked.</p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${COLORS.lightGray};border-radius:16px;padding:25px;background:#F9FAFB;">
                <tr><td align="left" style="font-size:15px;padding:10px 0;border-bottom:1px solid ${COLORS.borderGray};"><strong style="color:${COLORS.primary};">Patient Name:</strong> ${data.patient_name}</td></tr>
                <tr><td align="left" style="font-size:15px;padding:10px 0;border-bottom:1px solid ${COLORS.borderGray};"><strong style="color:${COLORS.primary};">Doctor:</strong> ${data.doctor_name}</td></tr>
                <tr><td align="left" style="font-size:15px;padding:10px 0;border-bottom:1px solid ${COLORS.borderGray};"><strong style="color:${COLORS.primary};">Date & Time:</strong> ${data.appointment_date} at ${data.appointment_time}</td></tr>
                <tr><td align="left" style="font-size:15px;padding:10px 0;"><strong style="color:${COLORS.primary};">Mode:</strong> ${data.appointment_mode}</td></tr>
              </table>

              ${
                data.link
                  ? `
              <tr style="margin-top:25px;">
                <td align="center" style="padding-top:25px;">
                  <a href="${data.link}" style="display:inline-block;padding:14px 38px;background:linear-gradient(135deg,${COLORS.primary},${COLORS.secondary});color:#fff;text-decoration:none;border-radius:30px;font-weight:600;letter-spacing:0.4px;">Join Appointment</a>
                </td>
              </tr>
              `
                  : ""
              }

              <p style="margin:25px 0 0;font-size:14px;color:${COLORS.textMuted};line-height:1.6;">Please arrive 10 minutes early for in-person sessions or ensure a stable internet connection for virtual ones.</p>
            </td>
          </tr>

          ${getFooter()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
