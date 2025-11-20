import { Injectable ,Inject} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import autoTable from "jspdf-autotable"
import { jsPDF } from "jspdf"
import fs from "fs"
import path from "path"
import { InjectModel } from '@nestjs/mongoose';
import { Profile, ProfileDocument } from './schema/patient.profile.schema';
import { Model } from 'mongoose';
import { ClientProxy } from '@nestjs/microservices';
import { LabBookingConfirmationDto } from './dtos/lab-booking-confirmation.dto';
import { ScanReportCompletionDto } from './dtos/scan-report-completion.dto';
import { LabReportCompletionDto } from './dtos/lab-report-completion.dto'

export interface BookedLabTest {
  id: string
  testId: string
  testName: string
  scheduledDate: Date
  scheduledTime: string
  status: "pending" | "completed" | "cancelled"
  bookedAt: string
  location: string
  instructions?: string[]
}

@Injectable()
export class BookingsService {
  private supabase: SupabaseClient;
  private lastAssignedIndex = 0;

  constructor(private configService: ConfigService , 
     @Inject('MAILER_SERVICE') private readonly mailerClient: ClientProxy,
       @Inject('SCHEDULER_SERVICE') private readonly schedulerClient: ClientProxy,
    @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL')!,
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });


  }

  private logger(msg:string){
    console.log("[INFO BOOKING MS]"+msg)
  }

async bookTest(data: {
  testId: string;
  patientId: string;
  scheduledDate: string;
  scheduledTime: string;
  location?: string;
  instructions?: string[];
}) {
  this.logger(`Booking test for date=${data.scheduledDate}`);

  // Fetch next lab technician only
  let { data: technicians, error: techError } = await this.supabase
    .from('users')
    .select('id')
    .eq('role', 'lab_technician')
    .range(this.lastAssignedIndex, this.lastAssignedIndex)
    .limit(1);

  if (techError) throw new Error(techError.message);
 if (!technicians || technicians.length === 0) {
  this.lastAssignedIndex = 0;

  const { data: resetTechs, error: resetErr } = await this.supabase
    .from('users')
    .select('id')
    .eq('role', 'lab_technician')
    .range(0, 0)
    .limit(1);

  if (resetErr) throw new Error(resetErr.message);
  if (!resetTechs || resetTechs.length === 0) throw new Error('No lab technicians available');

  technicians = resetTechs;
}



  const techId = technicians[0].id;
  this.lastAssignedIndex++;

  const scheduledDateIso = new Date(
    data.scheduledDate.split('/').reverse().join('-')
  ).toISOString().split('T')[0];

  this.logger(`Assigning technician ID=${techId}`);

  // Insert booking and fetch patient email in parallel
  const [bookingResult, patientResult] = await Promise.all([
    this.supabase
      .from('booked_lab_tests')
      .insert([
        {
          test_id: data.testId,
          patient_id: data.patientId,
          lab_technician_id: techId,
          scheduled_date: scheduledDateIso,
          scheduled_time: data.scheduledTime,
          location: data.location,
          instructions: data.instructions,
          status: 'pending',
        },
      ])
      .select()
      .single(),
    this.supabase
      .from('users')
      .select('email')
      .eq('id', data.patientId)
      .single(),
  ]);

  const { data: booking, error: bookingError } = bookingResult;
  if (bookingError) throw new Error(bookingError.message);

  const { data: patient } = patientResult;

  

  if (patient?.email) {

   const {data:TestData, error:TestError}= await this.supabase.from('lab_tests').select("*").eq('id',data.testId).single();
   const patientData= await this.profileModel.findOne({id:data.patientId}).lean().exec(); 
   
    this.logger(`Sending email to ${patient.email}`);
    this.mailerClient.emit('lab_test_booking_confirmed', {
      technician_id: techId,
      booking_id: booking.id,
      patient_id: data.patientId,
      patient_email: patient.email,
      test_name: TestData?.name || 'Lab Test',
      scheduled_date: data.scheduledDate,
      scheduled_time: data.scheduledTime,
      location: data.location,
      patient_name: patientData?.name,
    } as LabBookingConfirmationDto);


       this.schedulerClient.emit('lab_test_booking_confirmed', {
      technician_id: techId,
      booking_id: booking.id,
      patient_id: data.patientId,
      patient_email: patient.email,
      test_name: TestData?.name || 'Lab Test',
      scheduled_date: data.scheduledDate,
      scheduled_time: data.scheduledTime,
      location: data.location,
      patient_name: patientData?.name,
    } as LabBookingConfirmationDto);


  }

  this.logger(`Booking completed with ID=${booking.id}`);
  return booking;
}



async uploadScan(
  bookingId: string,
  fileBuffer: Buffer | Uint8Array,
  fileName: string,
  doctor_name?: string
) {
  this.logger(`Starting scan PDF generation for booking ID=${bookingId}`);

  // ====== CONSTANTS (same as uploadResult) ======
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const primaryColor: [number, number, number] = [0, 102, 153];
  const grayText: [number, number, number] = [80, 80, 80];
  const M = { left: 48, right: 48, top: 160, bottom: 72 };
  const headerHeight = 120;

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const hospitalName = "Hygieia";
  const hospitalTagline = "From Past to Future of Healthcare";
  const hospitalAddress = "www.hygieia-frontend.vercel.app";
  const hospitalContact = "+92 80 1234 5678 • hygieia.fyp@gmail.com";

  const doc = new jsPDF({ unit: "pt", format: "a4" });

  // ====== LOAD LOGO + WATERMARK ======
  this.logger(`Loading logo and watermark assets`);
  const loadBase64 = (fileName: string) => {
    const abs = path.resolve(process.cwd(), "src", "assets", fileName);
    const file = fs.readFileSync(abs);
    return `data:image/png;base64,${file.toString("base64")}`;
  };

  let logoDataUrl ;
  let watermarkDataUrl ;
  try {
    logoDataUrl = loadBase64("logo.png");
    this.logger(`Logo loaded successfully`);
  } catch (e) {
    this.logger(`Failed to load logo: ${e}`);
  }
  try {
    watermarkDataUrl = loadBase64("logo-2.png");
    this.logger(`Watermark loaded successfully`);
  } catch (e) {
    this.logger(`Failed to load watermark: ${e}`);
  }

  // ====== FETCH BOOKING, PATIENT, TEST DATA ======
  this.logger(`Fetching booking details from database`);
  const { data: booking } = await this.supabase
    .from("booked_lab_tests")
    .select(
      "patient_id,test_id,scheduled_date,scheduled_time,location,instructions"
    )
    .eq("id", bookingId)
    .single();

  if (!booking?.patient_id) throw new Error("Booking not found");
  this.logger(`Booking found - Patient ID: ${booking.patient_id}, Test ID: ${booking.test_id}`);

  const patientId = booking.patient_id;
  const testId = booking.test_id;

  this.logger(`Fetching test details for test ID: ${testId}`);
  const { data: testDetails } = await this.supabase
    .from("lab_tests")
    .select(
      "name,description,category,price,duration,preparation_instructions,record_type"
    )
    .eq("id", testId)
    .single();
  this.logger(`Test details retrieved: ${testDetails?.name || 'Unknown'}`);

  this.logger(`Fetching patient email for patient ID: ${patientId}`);
  const { data: patientRow } = await this.supabase
    .from("users")
    .select("email")
    .eq("id", patientId)
    .single();
  this.logger(`Patient email: ${patientRow?.email || 'Not found'}`);

  // MongoDB patient profile
  this.logger(`Fetching patient profile from MongoDB`);
  let patientProfile: any = {};
  try {
    if ((this as any).profileModel) {
      patientProfile = await (this as any).profileModel
        .findOne({ id: patientId })
        .lean()
        .exec();
      this.logger(`Patient profile retrieved: ${patientProfile?.name || 'Not found'}`);
    }
  } catch (e) {
    this.logger(`Failed to fetch patient profile from MongoDB: ${e}`);
  }

  // ====== DRAW HEADER ======
  const drawHeader = (d: any) => {
    if (logoDataUrl) d.addImage(logoDataUrl, "PNG", M.left, 44, 64, 64);

    d.setTextColor(...primaryColor);
    d.setFont("helvetica", "bold");
    d.setFontSize(20);
    d.text(hospitalName, M.left + 80, 64);

    d.setFont("helvetica", "normal");
    d.setFontSize(11);
    d.setTextColor(...grayText);
    d.text(hospitalTagline, M.left + 80, 82);

    d.setFontSize(9);
    d.text(hospitalAddress, M.left + 80, 96);
    d.text(hospitalContact, M.left + 80, 110);

    // Right side
    d.setFont("helvetica", "bold");
    d.setFontSize(18);
    d.setTextColor(...primaryColor);
    d.text("Scan Report", pageWidth - M.right, 64, { align: "right" });

    d.setFont("helvetica", "normal");
    d.setFontSize(10);
    d.setTextColor(110, 110, 110);
    d.text(`Report Date: ${dateStr}`, pageWidth - M.right, 82, {
      align: "right",
    });
    d.text(`Generated: ${timeStr}`, pageWidth - M.right, 96, {
      align: "right",
    });

    d.setFontSize(9);
    d.setTextColor(140, 140, 140);
    d.text(
      `Report ID: ${bookingId.slice(0, 8).toUpperCase()}`,
      pageWidth - M.right,
      110,
      { align: "right" }
    );

    // Divider
    d.setDrawColor(...primaryColor);
    d.setLineWidth(1.8);
    d.line(M.left, headerHeight, pageWidth - M.right, headerHeight);
  };

  // ====== FOOTER ======
  const drawFooter = (d: any, page: number, total: number) => {
    d.setDrawColor(220, 220, 220);
    d.line(
      M.left,
      pageHeight - M.bottom - 8,
      pageWidth - M.right,
      pageHeight - M.bottom - 8
    );

    const t =
      "This scan report is confidential and intended for the patient and authorized healthcare professionals.";
    d.setFont("helvetica", "normal");
    d.setFontSize(8);
    d.setTextColor(120, 120, 120);
    const wrap = d.splitTextToSize(t, pageWidth - M.left - M.right);
    d.text(wrap, M.left, pageHeight - M.bottom + 4);

    d.setFontSize(9);
    d.text(`Page ${page} of ${total}`, pageWidth / 2, pageHeight - 16, {
      align: "center",
    });
  };

  // ====== WATERMARK ======
  const drawWatermark = (d: any) => {
    if (!watermarkDataUrl) return;
    try {
      const wmW = pageWidth * 0.28;
      const wmH = pageHeight * 0.28;
      const x = (pageWidth - wmW) / 2;
      const y = (pageHeight - wmH) / 2;

      const gState = (d as any).GState?.({ opacity: 0.04 });
      if (gState && (d as any).setGState) {
        (d as any).setGState(gState);
        d.addImage(watermarkDataUrl, "PNG", x, y, wmW, wmH);
      } else {
        d.addImage(watermarkDataUrl, "PNG", x, y, wmW, wmH);
      }
    } catch {}
  };

  // ==========================================================================================
  //                          PATIENT INFORMATION SECTION
  // ==========================================================================================

  this.logger(`Drawing page 1 - Patient and Test Information`);
  drawHeader(doc);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...primaryColor);
  doc.text("Patient Information", M.left, M.top - 16);

  const patientRows = [
    ["Patient Name", patientProfile?.name || "Not Available"],
    ["Email Address", patientRow?.email || "Not Available"],
    ["Gender", patientProfile?.gender || "Not Available"],
    ["Date of Birth", patientProfile?.dateOfBirth || "Not Available"],
    ["Contact Number", patientProfile?.phone || "Not Available"],
    ["Address", patientProfile?.address || "Not Available"],
  ];

  autoTable(doc, {
    startY: M.top,
    head: [["Field", "Value"]],
    body: patientRows,
    theme: "grid",
    styles: { fontSize: 11, cellPadding: 6 },
    headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
    margin: { left: M.left, right: M.right },
  });

  let cursorY = (doc as any).lastAutoTable.finalY + 28;

  // ==========================================================================================
  //                                  TEST INFORMATION SECTION
  // ==========================================================================================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...primaryColor);
  doc.text("Test Information", M.left, cursorY - 10);

  const testPairs: [string, string][] = [
    ["Test Name", testDetails?.name || "Laboratory Test"],
    ["Test Category", testDetails?.category || "General"],
    ["Test Description", testDetails?.description || "Diagnostic laboratory test"],
    ["Test Duration", testDetails?.duration || "24-48 hours"],
    [
      "Preparation Instructions",
      Array.isArray(testDetails?.preparation_instructions)
        ? testDetails.preparation_instructions.join("; ")
        : testDetails?.preparation_instructions || "Standard preparation",
    ],
    [
      "Collection Date",
      booking?.scheduled_date
        ? new Date(booking.scheduled_date).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "Not Available",
    ],
    ["Collection Time", booking?.scheduled_time || "Not Available"],
    ["Collection Location", booking?.location || "Main Laboratory"],
  ];

  const testPairedRows: any[] = [];
  for (let i = 0; i < testPairs.length; i += 2) {
    const a = testPairs[i];
    const b = testPairs[i + 1];
    testPairedRows.push([
      a?.[0] || "",
      a?.[1] || "",
      b?.[0] || "",
      b?.[1] || "",
    ]);
  }

  autoTable(doc, {
    startY: cursorY + 8,
    head: [["Field", "Details", "Field", "Details"]],
    body: testPairedRows,
    theme: "grid",
    styles: { fontSize: 11, cellPadding: 6 },
    headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
    margin: { left: M.left, right: M.right },
  });

  cursorY = (doc as any).lastAutoTable.finalY + 28;

  // Draw footer for first page
  drawFooter(doc, 1, 2);
  this.logger(`Page 1 completed successfully`);

  // ==========================================================================================
  //                                  SCAN PREVIEW SECTION (NEW PAGE)
  // ==========================================================================================

  this.logger(`Creating page 2 - Scan Preview`);
  doc.addPage();
  
  drawHeader(doc);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...primaryColor);
  doc.text("Scan Preview", M.left, M.top - 10);

  this.logger(`Converting scan image to base64`);
  const imgBase64 = `data:image/png;base64,${Buffer.from(fileBuffer).toString(
    "base64"
  )}`;

  this.logger(`Getting image properties`);
  const imgProps = doc.getImageProperties(imgBase64);
  this.logger(`Image dimensions: ${imgProps.width}x${imgProps.height}, type: ${imgProps.fileType}`);

  const maxW = pageWidth - M.left - M.right;
  const maxH = pageHeight - M.top - M.bottom - 80;
  let imgW = maxW;
  let imgH = maxW * (imgProps.height / imgProps.width);

  if (imgH > maxH) {
    imgH = maxH;
    imgW = imgH * (imgProps.width / imgProps.height);
  }
  this.logger(`Calculated image size for PDF: ${imgW.toFixed(2)}x${imgH.toFixed(2)} pt`);

  const x = M.left;
  const y = M.top + 10;

  this.logger(`Adding scan image to PDF at position (${x}, ${y})`);
  doc.addImage(imgBase64, imgProps.fileType || "PNG", x, y, imgW, imgH);

  cursorY = y + imgH + 30;

  // ==========================================================================================
  //                                  SUMMARY SECTION
  // ==========================================================================================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.text("Scan Summary", M.left, cursorY);

  cursorY += 15;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);

  const summaryLines = [
    "• This scan has been reviewed and processed by the laboratory.",
    "• Please consult a qualified clinician for professional interpretation.",
    "• Reference ranges are not applicable for imaging scans.",
    "• This is a computer-generated report; no physical signature is required.",
  ];

  summaryLines.forEach((t, i) => {
    doc.text(t, M.left, cursorY + i * 12);
  });

  // Draw footer for second page
  drawFooter(doc, 2, 2);
  this.logger(`Page 2 completed successfully`);

  // No need to draw watermark again here as it's already drawn at the top of page 2

  // ==========================================================================================
  //                                UPLOAD PDF TO CLOUDINARY
  // ==========================================================================================
  this.logger(`Generating PDF buffer`);
  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
  this.logger(`PDF buffer size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);

  this.logger(`Uploading PDF to Cloudinary`);
  const uploaded = await new Promise<any>((resolve, reject) => {
    const publicId = `scan_${bookingId}_${Date.now()}`;
    this.logger(`Cloudinary public ID: ${publicId}`);
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "medical_records/scans",
        resource_type: "raw",
        format: "pdf",
        public_id: publicId,
      },
      (error, result) => {
        if (error) {
          this.logger(`Cloudinary upload failed: ${error}`);
          reject(error);
        } else {
          this.logger(`Cloudinary upload successful: ${result?.secure_url}`);
          resolve(result);
        }
      }
    );
    const readable = new Readable();
    readable.push(pdfBuffer);
    readable.push(null);
    readable.pipe(stream);
  });

  const viewUrl = `https://hygieia-frontend.vercel.app/viewReport?fileUrl=${encodeURIComponent(
    uploaded.secure_url
  )}`;
  this.logger(`Generated view URL: ${viewUrl}`);

  // ==========================================================================================
  //                                SAVE RECORD TO DATABASE
  // ==========================================================================================
  this.logger(`Saving medical record to database`);
  const insertPayload = {
    booked_test_id: bookingId,
    patient_id: patientId,
    title: "Scan Report",
    record_type: "scan",
    date: new Date().toISOString(),
    file_url: viewUrl,
    doctor_name,
  };

  const { error: insertError } = await this.supabase.from("medical_records").insert([insertPayload]);
  if (insertError) {
    this.logger(`Failed to insert medical record: ${insertError.message}`);
    throw insertError;
  }
  this.logger(`Medical record saved successfully`);

  // Fire-and-forget
  this.logger(`Starting background tasks (status update & email)`);
  (async () => {
    this.logger(`Updating booking status to completed`);
    const { error: updateError } = await this.supabase
      .from("booked_lab_tests")
      .update({ status: "completed" })
      .eq("id", bookingId);
    
    if (updateError) {
      this.logger(`Failed to update booking status: ${updateError.message}`);
    } else {
      this.logger(`Booking status updated to completed`);
    }

    if (patientRow?.email) {
      this.logger(`Sending email notification to ${patientRow.email}`);
      try {
        this.mailerClient.emit('scan_report_available', {
          booking_id: bookingId,
          patient_id: patientId,
          patient_email: patientRow.email,
          patient_name: patientProfile?.name,
          report_url: viewUrl,
          test_name: testDetails?.name,
        } as ScanReportCompletionDto);
        this.logger(`Email event emitted successfully for ${patientRow.email}`);
      } catch (emailError) {
        this.logger(`Failed to emit email event: ${emailError}`);
      }
    }
  })();

  this.logger(`Scan upload completed successfully for booking ID=${bookingId}`);
  return insertPayload;
}









async uploadResult(
  bookingId: string,
  body: { title: string; resultData: any[]; doctor_name?: string }
) {
  this.logger(`Starting report generation for booking ID=${bookingId}`);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const primaryColor: [number, number, number] = [0, 102, 153];
  const grayText: [number, number, number] = [80, 80, 80];
  const M = { left: 48, right: 48, top: 160, bottom: 72 };
  const headerHeight = 120;

  const loadBase64 = (fileName: string) => {
    const absPath = path.resolve(process.cwd(), "src", "assets", fileName);
    const file = fs.readFileSync(absPath);
    return `data:image/png;base64,${file.toString("base64")}`;
  };

  const [logoDataUrl, watermarkDataUrl] = await Promise.all(
    ["logo.png", "logo-2.png"].map(async fileName => {
      try {
        return loadBase64(fileName);
      } catch (err) {
        this.logger(`Could not load ${fileName}: ${err}`);
        return null;
      }
    })
  );

  // Fetch booking details with all relevant info
  const { data: bookedTest, error: bookedError } = await this.supabase
    .from("booked_lab_tests")
    .select("patient_id,test_id,scheduled_date,scheduled_time,location,instructions")
    .eq("id", bookingId)
    .single();
  if (bookedError || !bookedTest?.patient_id) throw new Error("Booking not found or patient ID missing");
  const patientId = bookedTest.patient_id;
  const testId = bookedTest.test_id;

  // Fetch patient email from users table
  const { data: patientRow } = await this.supabase
    .from("users")
    .select("email")
    .eq("id", patientId)
    .single();

  // Fetch patient profile from MongoDB
  let patientProfileFromMongo: any = {};
  try {
    if ((this as any).profileModel) {
      patientProfileFromMongo = await (this as any).profileModel.findOne({ id: patientId }).lean().exec();
    }
  } catch (e) {
    this.logger(`Mongo profile fetch failed: ${e}`);
  }

  // Fetch lab test details
  const { data: labTestRow } = await this.supabase
    .from("lab_tests")
    .select("name,description,category,price,duration,preparation_instructions,unit,optimal_range,record_type")
    .eq("id", testId)
    .single();

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const hospitalName = "Hygieia";
  const hospitalTagline = "From Past to Future of Healthcare";
  const hospitalAddress = "www.hygieia-frontend.vercel.app";
  const hospitalContact = "+92 80 1234 5678 • hygieia.fyp@gmail.com";

  const drawHeader = (d: any) => {
    // Hospital logo and branding
    if (logoDataUrl) d.addImage(logoDataUrl, "PNG", M.left, 44, 64, 64);
    
    // Hospital name and details
    d.setTextColor(...primaryColor);
    d.setFont("helvetica", "bold");
    d.setFontSize(20);
    d.text(hospitalName, M.left + 80, 64);
    d.setFont("helvetica", "normal");
    d.setFontSize(11);
    d.setTextColor(...grayText);
    d.text(hospitalTagline, M.left + 80, 82);
    d.setFontSize(9);
    d.setTextColor(80, 80, 80);
    d.text(hospitalAddress, M.left + 80, 96);
    d.text(hospitalContact, M.left + 80, 110);
    
    // Report title and details
    d.setFont("helvetica", "bold");
    d.setFontSize(18);
    d.setTextColor(...primaryColor);
    d.text(cleanTitle(body.title || labTestRow?.name || "Laboratory Report"), pageWidth - M.right, 64, { align: "right" });
    d.setFont("helvetica", "normal");
    d.setFontSize(10);
    d.setTextColor(110, 110, 110);
    d.text(`Report Date: ${dateStr}`, pageWidth - M.right, 82, { align: "right" });
    d.text(`Generated: ${timeStr}`, pageWidth - M.right, 96, { align: "right" });
    
    // Report ID
    d.setFontSize(9);
    d.setTextColor(140, 140, 140);
    d.text(`Report ID: ${bookingId.slice(0, 8).toUpperCase()}`, pageWidth - M.right, 110, { align: "right" });
    
    // Professional separator line
    d.setDrawColor(...primaryColor);
    d.setLineWidth(1.8);
    d.line(M.left, headerHeight, pageWidth - M.right, headerHeight);
  };

  const drawFooter = (d: any, pageNumber: number, pageCount: number) => {
    d.setDrawColor(220, 220, 220);
    d.setLineWidth(1);
    d.line(M.left, pageHeight - M.bottom - 8, pageWidth - M.right, pageHeight - M.bottom - 8);
    const disclaimer = "This laboratory report is confidential and intended for the patient and authorized healthcare professionals. Results should be interpreted by a qualified clinician.";
    d.setFont("helvetica", "normal");
    d.setFontSize(8);
    d.setTextColor(120, 120, 120);
    const wrapped = d.splitTextToSize(disclaimer, pageWidth - M.left - M.right);
    d.text(wrapped, M.left, pageHeight - M.bottom + 4);
    d.setFontSize(9);
    d.setTextColor(100, 100, 100);
    d.text(`Page ${pageNumber} of ${pageCount}`, pageWidth / 2, pageHeight - 16, { align: "center" });
  };

  const drawWatermark = (d: any) => {
    if (!watermarkDataUrl) return;
    try {
      // Create a subtle watermark
      const wmW = pageWidth * 0.28;
      const wmH = pageHeight * 0.28;
      const x = (pageWidth - wmW) / 2;
      const y = (pageHeight - wmH) / 2;
      
      // Apply very low opacity
      const gState = (d as any).GState ? (d as any).GState({ opacity: 0.04 }) : null;
      if (gState && (d as any).setGState) {
        (d as any).setGState(gState);
        d.addImage(watermarkDataUrl, "PNG", x, y, wmW, wmH);
        (d as any).setGState(new (d as any).GState({ opacity: 1 }));
      } else {
        // Fallback: just add the image without opacity control
        d.addImage(watermarkDataUrl, "PNG", x, y, wmW, wmH);
      }
    } catch (err) {
      this.logger(`watermark error: ${err}`);
    }
  };

  const infoStartY = M.top;
  const leftX = M.left;
  const rightX = pageWidth / 2 + 20;

  // --- Patient Information Section (compact 2-column) ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...primaryColor);
  doc.text("Patient Information", M.left, infoStartY - 16);

  const patientPairsSrc: [string, string][] = [
    ["Patient Name", patientProfileFromMongo?.name || "Not Available"],
    // Patient ID removed per request
    ["Email Address", patientRow?.email || "Not Available"],
    ["Contact Number", patientProfileFromMongo?.phone || "Not Available"],
    ["Date of Birth", patientProfileFromMongo?.dateOfBirth || "Not Available"],
    ["Gender", patientProfileFromMongo?.gender || "Not Available"],
    ["Blood Type", patientProfileFromMongo?.bloodType || "Not Available"],
    ["Height", patientProfileFromMongo?.height ? `${patientProfileFromMongo.height} cm` : "Not Available"],
    ["Weight", patientProfileFromMongo?.weight ? `${patientProfileFromMongo.weight} kg` : "Not Available"],
    ["Address", patientProfileFromMongo?.address || "Not Available"],
    ["Emergency Contact", patientProfileFromMongo?.emergencyContact || "Not Available"],
    ["Known Allergies", patientProfileFromMongo?.allergies || "None Reported"],
    ["Medical Conditions", patientProfileFromMongo?.conditions || "None Reported"],
  ];

  const patientInfoBodyPaired: any[] = [];
  for (let i = 0; i < patientPairsSrc.length; i += 2) {
    const a = patientPairsSrc[i];
    const b = patientPairsSrc[i + 1];
    patientInfoBodyPaired.push([a?.[0] || "", a?.[1] || "", b?.[0] || "", b?.[1] || ""]);
  }

  autoTable(doc, {
    startY: infoStartY,
    theme: "grid",
    styles: { fontSize: 11, cellPadding: 6, valign: "middle" },
    headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], halign: "left" },
    margin: { top: M.top, bottom: M.bottom + 50, left: M.left, right: M.right },
    head: [["Field", "Details", "Field", "Details"]],
    body: patientInfoBodyPaired,
    didDrawPage: () => {
      drawWatermark(doc);
      drawHeader(doc);
      const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber;
      const pageCount = (doc as any).internal.getNumberOfPages();
      drawFooter(doc, pageNumber, pageCount);
    },
  });

  let cursorY = (doc as any).lastAutoTable.finalY + 28;

  // --- Test Information Section (compact 2-column) ---
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("Test Information", M.left, cursorY - 10);

  const testPairsSrc: [string, string][] = [
    ["Test Name", labTestRow?.name || body.title || "Laboratory Test"],
    ["Test Category", labTestRow?.category || "General"],
    ["Test Description", labTestRow?.description || "Diagnostic laboratory test"],
    ["Test Duration", labTestRow?.duration || "24-48 hours"],
    ["Collection Date", bookedTest?.scheduled_date ? new Date(bookedTest.scheduled_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Not Available"],
    ["Collection Time", bookedTest?.scheduled_time || "Not Available"],
    ["Collection Location", bookedTest?.location || "Main Laboratory"],
    ["Preparation Instructions", labTestRow?.preparation_instructions && Array.isArray(labTestRow.preparation_instructions) && labTestRow.preparation_instructions.length > 0 ? labTestRow.preparation_instructions.join("; ") : "Standard preparation"],
  ];
  const testInfoBodyPaired: any[] = [];
  for (let i = 0; i < testPairsSrc.length; i += 2) {
    const a = testPairsSrc[i];
    const b = testPairsSrc[i + 1];
    testInfoBodyPaired.push([a?.[0] || "", a?.[1] || "", b?.[0] || "", b?.[1] || ""]);
  }

  autoTable(doc, {
    startY: cursorY + 8,
    theme: "grid",
    styles: { fontSize: 11, cellPadding: 6, valign: "middle" },
    headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], halign: "left" },
    margin: { top: M.top, bottom: M.bottom + 50, left: M.left, right: M.right },
    head: [["Field", "Details", "Field", "Details"]],
    body: testInfoBodyPaired,
    didDrawPage: () => {
      drawWatermark(doc);
      drawHeader(doc);
      const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber;
      const pageCount = (doc as any).internal.getNumberOfPages();
      drawFooter(doc, pageNumber, pageCount);
    },
  });

  cursorY = (doc as any).lastAutoTable.finalY + 28;

  // --- Laboratory Results Section ---
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("Laboratory Results", M.left, cursorY - 10);
  
  function parseNumeric(v: any) {
    if (v === null || v === undefined) return NaN;
    if (typeof v === "number") return v;
    const s = String(v).replace(/[,]/g, "").trim();
    const m = s.match(/^-?\d+(\.\d+)?/);
    return m ? Number(m[0]) : NaN;
  }

  function determineStatus(resultVal: any, reference: any) {
    const numResult = parseNumeric(resultVal);
    const ref = reference || labTestRow?.optimal_range;
    if (!ref) return "Reported";
    const rangeMatch = String(ref).match(/(-?\d+(\.\d+)?).*[-–to]+.*?(-?\d+(\.\d+)?)/i);
    if (rangeMatch) {
      const min = Number(rangeMatch[1]);
      const max = Number(rangeMatch[3]);
      if (!isNaN(numResult)) {
        if (numResult < min) return "Low";
        if (numResult > max) return "High";
        return "Normal";
      }
    }
    const singleMatch = String(ref).match(/(<=|≥|>=|≤|<|>)?\s*(-?\d+(\.\d+)?)/);
    if (singleMatch && !isNaN(numResult)) {
      const threshold = Number(singleMatch[2]);
      const op = singleMatch[1] || "";
      if (op.includes("<")) {
        return numResult < threshold ? "Normal" : "High";
      }
      if (op.includes(">")) {
        return numResult > threshold ? "Normal" : "Low";
      }
    }
    return "Reported";
  }

  if (!Array.isArray(body.resultData) || body.resultData.length === 0) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...grayText);
    doc.text("No laboratory results available for this test.", M.left, cursorY + 10);
    cursorY += 18;
  } else {
    // Add results summary
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Total Parameters Tested: ${body.resultData.length}`, M.left, cursorY + 5);
    doc.text(`Report Generated: ${dateStr} at ${timeStr}`, pageWidth - M.right, cursorY + 5, { align: "right" });
    
    autoTable(doc, {
      startY: cursorY + 18,
      head: [["Parameter", "Result", "Reference Range", "Unit", "Status"]],
      body: body.resultData.map((row: any) => {
        const status = determineStatus(row.result, row.reference);
        return [
          row.test ?? "N/A",
          row.result ?? "N/A",
          row.reference ?? "See lab notes",
          row.unit ?? "N/A",
          status,
        ];
      }),
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 6, valign: "middle" },
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      columnStyles: {
        0: { cellWidth: 160 },
        1: { cellWidth: 90 },
        2: { cellWidth: 120 },
        3: { cellWidth: 60 },
        4: { cellWidth: 80 },
      },
      didParseCell: function (data: any) {
        if (data.column.index === 4) {
          if (data.cell.raw === "High") {
            data.cell.styles.textColor = [189, 45, 45];
            data.cell.styles.fontStyle = "bold";
          } else if (data.cell.raw === "Low") {
            data.cell.styles.textColor = [204, 102, 0];
            data.cell.styles.fontStyle = "bold";
          } else if (data.cell.raw === "Normal") {
            data.cell.styles.textColor = [34, 139, 34];
          } else {
            data.cell.styles.textColor = [80, 80, 80];
          }
        }
        if (data.column.index === 1) {
          // Color the result cell itself based on status
          const rowStatus = data.row.raw?.[4];
          if (rowStatus === "High") data.cell.styles.textColor = [189, 45, 45];
          else if (rowStatus === "Low") data.cell.styles.textColor = [204, 102, 0];
          else if (rowStatus === "Normal") data.cell.styles.textColor = [34, 139, 34];
        }
      },
      margin: { top: M.top, bottom: M.bottom + 80, left: M.left, right: M.right },
      didDrawPage: () => {
        drawWatermark(doc);
        drawHeader(doc);
        const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber;
        const pageCount = (doc as any).internal.getNumberOfPages();
        drawFooter(doc, pageNumber, pageCount);
      },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 20;
  }

  // --- Previous Results Section ---
  const prevBookingsQuery = testId
    ? this.supabase.from("booked_lab_tests").select("id,scheduled_date,status,test_id").eq("patient_id", patientId).eq("test_id", testId).neq("id", bookingId).eq("status", "completed")
    : this.supabase.from("booked_lab_tests").select("id,scheduled_date,status,test_id").eq("patient_id", patientId).neq("id", bookingId).eq("status", "completed");

  const { data: prevBookings } = await prevBookingsQuery;

  if (Array.isArray(prevBookings) && prevBookings.length > 0) {
    // Build a map of current test parameters for standardization (parameter name -> unit & reference)
    const currentParamsMap = new Map<string, { unit: string; reference: string }>();
    if (Array.isArray(body.resultData)) {
      body.resultData.forEach((row: any) => {
        const paramName = (row.test || "").trim().toLowerCase();
        if (paramName) {
          currentParamsMap.set(paramName, {
            unit: row.unit || "N/A",
            reference: row.reference || "See lab notes"
          });
        }
      });
    }

    // Start previous results on a new page for clean layout
    doc.addPage();
    cursorY = M.top;
    // Heading for previous results (left aligned)
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text("Previous Results Comparison", M.left, cursorY - 10);
    cursorY += 6;
    
    // Group previous results by parameter for better comparison
    const parameterHistory = new Map<string, any[]>();
    
    for (const pb of prevBookings) {
      const { data: prevRecordData } = await this.supabase
        .from("medical_records")
        .select("results,title,date,file_url,doctor_name,record_type")
        .eq("booked_test_id", pb.id)
        .order("date", { ascending: false })
        .limit(1)
        .single();

      if (!prevRecordData) continue;

      const prevDate = prevRecordData.date ? new Date(prevRecordData.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-";

      let parsedResults: any[] = [];
      try {
        parsedResults = typeof prevRecordData.results === "string" ? JSON.parse(prevRecordData.results) : prevRecordData.results;
      } catch {
        parsedResults = [];
      }

      if (parsedResults && parsedResults.length > 0) {
        parsedResults.forEach(r => {
          const paramName = (r.test || "").trim().toLowerCase();
          // Only include parameters that match current test parameters
          if (paramName && currentParamsMap.has(paramName)) {
            if (!parameterHistory.has(paramName)) {
              parameterHistory.set(paramName, []);
            }
            const history = parameterHistory.get(paramName);
            if (history) {
              history.push({
                date: prevDate,
                result: r.result ?? "N/A",
                originalUnit: r.unit,
                originalReference: r.reference
              });
            }
          }
        });
      }
    }

    if (parameterHistory.size > 0) {
      // Create consolidated rows with standardized units and references
      const consolidatedRows: any[] = [];
      
      parameterHistory.forEach((history, paramName) => {
        const standardized = currentParamsMap.get(paramName);
        if (!standardized) return; // Skip if no standardized values
        
        // Sort by date (most recent first)
        history.sort((a, b) => {
          const dateA = new Date(a.date.split(' ').reverse().join('-'));
          const dateB = new Date(b.date.split(' ').reverse().join('-'));
          return dateB.getTime() - dateA.getTime();
        });
        
        history.forEach(entry => {
          // Use standardized unit and reference from current test
          const status = determineStatus(entry.result, standardized.reference);
          consolidatedRows.push([
            entry.date,
            paramName.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '), // Capitalize parameter name
            entry.result,
            standardized.unit, // Use current test's unit
            standardized.reference, // Use current test's reference
            status
          ]);
        });
      });
    
      autoTable(doc, {
        startY: cursorY,
        head: [["Date", "Parameter", "Result", "Unit", "Reference Range", "Status"]],
        body: consolidatedRows,
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 5, valign: "middle" },
        headStyles: { fillColor: [200, 200, 200], textColor: [40, 40, 40], halign: "left" },
        alternateRowStyles: { fillColor: [252, 252, 252] },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { cellWidth: 140 },
          2: { cellWidth: 80 },
          3: { cellWidth: 60 },
          4: { cellWidth: 100 },
          5: { cellWidth: 60 },
        },
        margin: { top: M.top, bottom: M.bottom + 50, left: M.left, right: M.right },
        didParseCell(data: any) {
          if (data.column.index === 5) {
            const val = data.cell.raw;
            if (val === "High") {
              data.cell.styles.textColor = [189, 45, 45];
              data.cell.styles.fontStyle = "bold";
            } else if (val === "Low") {
              data.cell.styles.textColor = [204, 102, 0];
              data.cell.styles.fontStyle = "bold";
            } else if (val === "Normal") {
              data.cell.styles.textColor = [34, 139, 34];
            } else {
              data.cell.styles.textColor = [80, 80, 80];
            }
          }
          if (data.column.index === 2) {
            const status = data.row.raw?.[5];
            if (status === "High") data.cell.styles.textColor = [189, 45, 45];
            else if (status === "Low") data.cell.styles.textColor = [204, 102, 0];
            else if (status === "Normal") data.cell.styles.textColor = [34, 139, 34];
          }
        },
        didDrawPage: () => {
          drawWatermark(doc);
          drawHeader(doc);
          const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber;
          const pageCount = (doc as any).internal.getNumberOfPages();
          drawFooter(doc, pageNumber, pageCount);
        },
      });
      cursorY = (doc as any).lastAutoTable.finalY + 12;
    } else {
      // No matching previous results found
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text("No previous results available for comparison with current test parameters.", M.left, cursorY + 10);
      cursorY += 30;
    }
    
  }

  // --- Professional Conclusion Section ---
  cursorY += 20;
  
  // Check if there's enough space for the summary section (heading + 7 lines + padding)
  // Each line is ~12pt, so we need approximately 135pt for the entire section
  const summaryHeight = 135;
  const pageBottomThreshold = pageHeight - M.bottom - 50; // Footer area starts here
  
  if (cursorY + summaryHeight > pageBottomThreshold) {
    doc.addPage();
    drawWatermark(doc);
    drawHeader(doc);
    cursorY = M.top;
  }
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("Laboratory Report Summary", M.left, cursorY);
  
  cursorY += 15;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  
  const summaryText = [
    "• This laboratory report contains confidential medical information and should be handled with appropriate care.",
    "• Results should be interpreted by a qualified healthcare professional in conjunction with clinical findings.",
    "• Reference ranges may vary between laboratories and testing methods.",
    "• This is a computer generated report; no physical signature is required.",
    "• Values and reference ranges are verified by the laboratory’s quality controls.",
    "• For questions regarding these results, please contact your healthcare provider or our laboratory directly.",
    "• This report is valid for medical decision making purposes and meets clinical laboratory standards."
  ];
  
  summaryText.forEach((text, index) => {
    doc.text(text, M.left, cursorY + (index * 12));
  });

  drawWatermark(doc);

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
  this.logger(`PDF generated for booking ID=${bookingId}`);

  const uploaded = await new Promise<any>((resolve, reject) => {
    const publicId = `${cleanTitle(body.title).replace(/\s+/g, "_")}_${bookingId}_${Date.now()}`;
    const stream = cloudinary.uploader.upload_stream(
      { folder: "medical_records/results", resource_type: "raw", public_id: publicId, format: "pdf" },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    const readable = new Readable();
    readable.push(pdfBuffer);
    readable.push(null);
    readable.pipe(stream);
  });
  this.logger(`Report uploaded to Cloudinary: ${uploaded?.secure_url || "no-url"}`);

  const frontendDomain = "https://hygieia-frontend.vercel.app";
  const viewUrl = uploaded?.secure_url
    ? `${frontendDomain}/viewReport?fileUrl=${encodeURIComponent(uploaded.secure_url)}`
    : `${frontendDomain}/viewReport?fileUrl=${encodeURIComponent(uploaded?.url || "")}`;

  const insertPayload = {
    results: JSON.stringify(body.resultData, null, 2),
    booked_test_id: bookingId,
    patient_id: patientId,
    title: cleanTitle(body.title),
    record_type: "report",
    date: new Date().toISOString(),
    file_url: viewUrl,
    doctor_name: body.doctor_name,
  };

  const { data, error } = await this.supabase.from("medical_records").insert([insertPayload]);
  if (error) throw new Error(error.message);
  this.logger(`Medical record inserted for booking ID=${bookingId}`);

  await this.supabase.from("booked_lab_tests").update({ status: "completed" }).eq("id", bookingId);
  this.logger(`Booking status updated to completed for ID=${bookingId}`);

  if (patientRow?.email) {
    this.mailerClient.emit('lab_report_available', {
      booking_id: bookingId,
      patient_id: patientId,
      patient_email: patientRow.email,
      patient_name: patientProfileFromMongo?.name,
      report_title: cleanTitle(body.title),
      report_url: viewUrl,
      test_name: labTestRow?.name,
    } as LabReportCompletionDto);
    this.logger(`Email event emitted to patient ${patientRow.email}`);
  }

  return {
    ...insertPayload,
    file_url: viewUrl,
  };

  function cleanTitle(t: string) {
    return (t || "Lab Report").replace(/[-_]?results\.json$/i, "").replace(/\.json$/i, "").trim();
  }
}





  async cancelBooking(bookingId: string) {
    const { data, error } = await this.supabase
      .from('booked_lab_tests')
      .update({ status: 'cancelled' })  // Set the status to 'cancelled'
      .eq('id', bookingId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }




  async getBookingsByTechnician(techId: string) {
  this.logger(`Fetching bookings for technician ID=${techId}`);

  const { data, error } = await this.supabase
    .from('booked_lab_tests')
    .select(`
      id,
      test_id,
      scheduled_date,
      scheduled_time,
      status,
      booked_at,
      location,
      instructions,
      patient:patient_id (
        id,
        email
      ),
      test:lab_tests!booked_lab_tests_test_id_fkey (
        id,
        name,
        category,
        record_type
      ),
      medical_records!booked_test_id (
        record_type,
        title,
        date,
        file_url
      )
    `)
    .eq('lab_technician_id', techId);

  if (error) throw new Error(error.message);
  this.logger(`Fetched ${data.length} bookings for technician ID=${techId}`);

  const bookings = data.map((item: any) => {
    const medicalRecord = item.status === 'completed' ? item.medical_records?.[0] : null;
    return {
      id: item.id,
      testId: item.test_id,
      testName: item.test?.name || "",
      testCategory: item.test?.category || "Others",
      scheduledDate: new Date(item.scheduled_date),
      scheduledTime: item.scheduled_time,
      status: item.status,
      bookedAt: item.booked_at,
      location: item.location || "",
      instructions: item.instructions || undefined,
      patientName: item.patient?.email || "Unknown",
      type: item.test?.record_type || "lab-result",
      uploadedAt: medicalRecord?.date ? new Date(medicalRecord.date) : undefined,
      reportFile: medicalRecord?.file_url || undefined
    };
  });

  // Compute weeklyData & testCategoryData in parallel
  const [weeklyData, testCategoryData] = await Promise.all([
    (async () => {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return days.map((day, i) => ({
        day,
        completed: bookings.filter(b => b.status === 'completed' && b.scheduledDate.getDay() === i).length
      }));
    })(),
    (async () => {
      const categoryMap: Record<string, { count: number; color: string }> = {};
      bookings.forEach(b => {
        if (b.status !== 'completed') return;
        const cat = b.testCategory || "Others";
        if (!categoryMap[cat]) {
          categoryMap[cat] = { count: 0, color: `#${Math.floor(Math.random() * 16777215).toString(16)}` };
        }
        categoryMap[cat].count += 1;
      });
      return Object.entries(categoryMap).map(([category, data]) => ({
        category,
        count: data.count,
        color: data.color
      }));
    })()
  ]);

  this.logger(`Computed weeklyData and testCategoryData for technician ID=${techId}`);

  return { bookings, weeklyData, testCategoryData };
}




async getBookingsByPatient(patientId: string): Promise<BookedLabTest[]> {
  this.logger(`Fetching bookings for patient ID=${patientId}`);

  const { data: bookings, error: bookingsError } = await this.supabase
    .from('booked_lab_tests')
    .select('*')
    .eq('patient_id', patientId);

  if (bookingsError) throw new Error(bookingsError.message);
  if (!bookings?.length) {
    this.logger(`No bookings found for patient ID=${patientId}`);
    return [];
  }

  this.logger(`Found ${bookings.length} bookings for patient ID=${patientId}`);

  // Get all unique test IDs
  const testIds = [...new Set(bookings.map(b => b.test_id))];

  const { data: labTests, error: labTestsError } = await this.supabase
    .from('lab_tests')
    .select('id, name')
    .in('id', testIds);

  if (labTestsError) throw new Error(labTestsError.message);

  this.logger(`Fetched ${labTests.length} lab tests for patient ID=${patientId}`);

  const testMap = new Map(labTests.map(t => [t.id, t.name]));

  const result = bookings.map(item => ({
    id: item.id,
    testId: item.test_id,
    testName: testMap.get(item.test_id) || 'Unknown',
    scheduledDate: new Date(item.scheduled_date),
    scheduledTime: item.scheduled_time,
    status: item.status as "pending" | "completed" | "cancelled",
    bookedAt: item.booked_at,
    location: item.location || '',
    instructions: item.instructions || []
  }));

  this.logger(`Mapped bookings to return format for patient ID=${patientId}`);
  return result;
}




}