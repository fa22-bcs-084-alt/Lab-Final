import { HYGIEIA_LOGO } from "./utils"

export function generateOtpVerificationEmail(email: string, otp: string): string {
  return `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Verify Your Email - Hygieia</title>
      <style>
        body{margin:0;padding:0;background-color:#fbf9ea;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#001016;}
        h2{color:#17433b;margin-bottom:10px;}
        p{font-size:15px;line-height:1.5;}
        .otp-code{
          font-size:32px;
          font-weight:700;
          color:#008396;
          letter-spacing:8px;
          background-color:#f0f9ff;
          padding:20px 30px;
          border-radius:12px;
          display:inline-block;
          margin:20px 0;
          border:2px dashed #46bba5;
        }
        @media(max-width:480px){
          .content{padding:20px !important;}
          h2{font-size:18px !important;}
          .otp-code{font-size:24px !important;letter-spacing:4px;}
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
                        <h1 style="margin:0;">Verify Your Email</h1>
                      </td>
                    </tr>
                  </table>

                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:30px 25px;" class="content">
                    <tr>
                      <td>
                        <h2>Hello!</h2>
                        <p>Welcome to Hygieia! To complete your registration, please verify your email address using the OTP code below:</p>
                        <div style="text-align:center;margin:30px 0;">
                          <div class="otp-code">${otp}</div>
                        </div>
                        <p style="color:#17433b;margin-top:20px;">
                          This code will expire in <strong>10 minutes</strong>. If you didn't request this code, please ignore this email.
                        </p>
                        <p style="margin-top:20px;font-size:13px;color:#6b7280;">
                          For your security, never share this code with anyone.
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
