import { HYGIEIA_LOGO } from "./utils"

export function generateWelcomeEmail(email: string, name?: string): string {
  const displayName = name || email.split('@')[0]
  
  return `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Welcome to Hygieia!</title>
      <style>
        body{margin:0;padding:0;background-color:#fbf9ea;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#001016;}
        h2{color:#17433b;margin-bottom:10px;}
        p{font-size:15px;line-height:1.5;}
        .feature-card{
          background-color:#f0f9ff;
          border-left:4px solid #46bba5;
          padding:15px 20px;
          margin:15px 0;
          border-radius:8px;
        }
        .feature-card h3{
          margin:0 0 8px 0;
          color:#008396;
          font-size:16px;
        }
        .feature-card p{
          margin:0;
          font-size:14px;
          color:#17433b;
        }
        .btn{
          display:inline-block;
          background:linear-gradient(90deg,#008396,#46bba5);
          color:#fff !important;
          padding:14px 30px;
          border-radius:30px;
          text-decoration:none;
          font-weight:600;
          margin-top:20px;
        }
        @media(max-width:480px){
          .content{padding:20px !important;}
          h2{font-size:18px !important;}
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
                  
                  <table width="100%" style="background:linear-gradient(90deg,#008396,#46bba5);color:white;text-align:center;padding:40px 20px;">
                    <tr>
                      <td>
                        <img src="${HYGIEIA_LOGO}" width="80" height="80" style="border-radius:50%;margin-bottom:15px;"/>
                        <h1 style="margin:0;font-size:28px;">Welcome to Hygieia!</h1>
                        <p style="margin:10px 0 0;font-size:16px;opacity:0.95;">Your journey to better health starts here</p>
                      </td>
                    </tr>
                  </table>

                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:30px 25px;" class="content">
                    <tr>
                      <td>
                        <h2>Hi ${displayName}! 👋</h2>
                        <p>Thank you for joining Hygieia — your all-in-one healthcare companion. We're thrilled to have you on board!</p>
                        
                        <p style="margin-top:25px;font-weight:600;color:#17433b;">Here's what you can do with Hygieia:</p>
                        
                        <div class="feature-card">
                          <h3>🏥 Book Appointments</h3>
                          <p>Schedule appointments with top doctors and healthcare professionals.</p>
                        </div>
                        
                        <div class="feature-card">
                          <h3>🧪 Lab Tests & Reports</h3>
                          <p>Book lab tests and access your reports online securely.</p>
                        </div>
                        
                        <div class="feature-card">
                          <h3>💪 Fitness & Nutrition</h3>
                          <p>Get personalized diet plans and workout sessions tailored to your goals.</p>
                        </div>
                        
                        <div class="feature-card">
                          <h3>📊 Health Analytics</h3>
                          <p>Track your health metrics with AI-powered insights and recommendations.</p>
                        </div>
                        
                        <div style="text-align:center;margin-top:30px;">
                          <a href="https://hygieia-frontend.vercel.app" class="btn">Get Started</a>
                        </div>
                        
                        <p style="margin-top:30px;color:#6b7280;font-size:14px;">
                          Need help getting started? Feel free to reach out to our support team anytime.
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
