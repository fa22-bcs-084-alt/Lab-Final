import { LabReportCompletionDto } from "src/labs/dtos/lab-report-completion.dto"


export const HYGIEIA_LOGO = "https://hygieia-frontend.vercel.app/_next/image?url=%2Flogo%2Flogo-2.png&w=128&q=90"

export function generateLabReportCompletionEmail(data: LabReportCompletionDto): string {
  const { booking_id, patient_name, patient_email, report_title, report_url, test_name } = data
  return `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Hygieia Lab Report Ready</title>
      <style>
        body{margin:0;padding:0;background-color:#fbf9ea;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#001016;}
        h2{color:#17433b;margin-bottom:10px;}
        .details p{margin:6px 0;font-size:15px;}
        .btn{
          display:inline-block;
          background-color:#008396;
          color:#fff !important;
          padding:12px 24px;
          border-radius:8px;
          text-decoration:none;
          margin-top:20px;
        }
        .btn:hover{background-color:#46bba5;}
        @media(max-width:480px){
          .content{padding:20px !important;}
          h2{font-size:18px !important;}
          .btn{width:100% !important;text-align:center !important;}
        }
      </style>
    </head>
    <body>
      <table width="100%" bgcolor="#fbf9ea" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" valign="top">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);overflow:hidden;text-align:center;">
              <tr>
                <td style="padding:0;">
                  <table width="100%" style="background:linear-gradient(90deg,#008396,#46bba5);color:white;text-align:center;padding:30px 20px;">
                    <tr>
                      <td>
                        <img src="${HYGIEIA_LOGO}" width="70" height="70" style="border-radius:50%;margin-bottom:10px;"/>
                        <h1 style="margin:0;">Your Lab Report Is Ready</h1>
                      </td>
                    </tr>
                  </table>

                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:30px 25px;" class="content">
                    <tr>
                      <td>
                        <h2>Hey ${patient_name},</h2>
                        <p>Your lab report <strong>${report_title}</strong> is now available to view and download.</p>

                        <table style="margin:20px auto;border-radius:12px;background-color:#fbf9ea;padding:20px;border-left:4px solid #008396;text-align:left;" class="details">
                          <tr><td><p><strong>Booking ID:</strong> ${booking_id}</p></td></tr>
                          ${
                            test_name
                              ? `<tr><td><p><strong>Test Name:</strong> ${test_name}</p></td></tr>`
                              : ''
                          }
                          <tr><td><p><strong>Email:</strong> ${patient_email}</p></td></tr>
                        </table>

                        <a href="${report_url}" class="btn">View Report</a>

                        <p style="margin-top:20px;color:#17433b;line-height:1.5;">
                          If you have any concerns about your results, consider booking a follow-up appointment with a doctor for further guidance.
                        </p>
                      </td>
                    </tr>
                  </table>

                  <table width="100%" style="background-color:#17433b;text-align:center;padding:15px;">
                    <tr>
                      <td style="color:white;font-size:13px;">
                        © ${new Date().getFullYear()} Hygieia — From Past to Future
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `
}
