import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import * as nodemailer from 'nodemailer';
import autoTable from "jspdf-autotable"
import { jsPDF } from "jspdf"
import fs from "fs"
import path from "path"
import { InjectModel } from '@nestjs/mongoose';
import { Profile, ProfileDocument } from './schema/patient.profile.schema';
import { Model } from 'mongoose';

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
  private transporter: nodemailer.Transporter;
  private readonly fastApiUrl: string




  constructor(private configService: ConfigService , @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL')!,
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('SMTP_EMAIL'),
        pass: this.configService.get<string>('SMTP_PASSWORD'),
      },
    });

    this.fastApiUrl = this.configService.get<string>('FASTAPI_URL') || 'http://localhost:4004/medical-records/index'

  }

  private logger(msg:string){
    console.log("[INFO BOOKING MS]"+msg)
  }
  private async sendEmail(to: string, subject: string, text: string) {
    await this.transporter.sendMail({
      from: this.configService.get<string>('SMTP_USER'),
      to,
      subject,
      text,
    });
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
  const { data: technicians, error: techError } = await this.supabase
    .from('users')
    .select('id')
    .eq('role', 'lab_technician')
    .range(this.lastAssignedIndex, this.lastAssignedIndex)
    .limit(1);

  if (techError) throw new Error(techError.message);
  if (!technicians || technicians.length === 0) {
    throw new Error('No lab technicians available');
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
    this.logger(`Sending email to ${patient.email}`);
    this.sendEmail(
      patient.email,
      'Appointment Confirmation',
      `Your test has been booked for ${data.scheduledDate} at ${data.scheduledTime}.`
    );
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
  this.logger(`Starting upload for booking ID=${bookingId}`);

  const patientIdPromise = this.supabase
    .from('booked_lab_tests')
    .select('patient_id')
    .eq('id', bookingId)
    .single()
    .then(res => res.data?.patient_id);

  const uploaded = await new Promise<any>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'medical_records/scans', resource_type: 'auto' },
      (error, result) => (error ? reject(error) : resolve(result))
    );

    if (Buffer.isBuffer(fileBuffer) || fileBuffer instanceof Uint8Array) {
      uploadStream.end(fileBuffer);
    } else {
      reject(new Error('fileBuffer must be a Buffer or Uint8Array'));
    }
  });

  this.logger(`File uploaded to Cloudinary: ${uploaded.secure_url}`);

  const patientId = await patientIdPromise;
  if (!patientId) throw new Error('Patient ID not found for booking');

  // Insert medical record
  const { data, error } = await this.supabase.from('medical_records').insert([
    {
      booked_test_id: bookingId,
      patient_id: patientId,
      title: 'Lab Scan',
      record_type: 'scan',
      date: new Date().toISOString(),
      file_url: uploaded.secure_url,
      doctor_name,
    },
  ]);

  if (error) throw new Error(error.message);
  this.logger(`Medical record inserted for booking ID=${bookingId}`);

  // Fire-and-forget: update booking status and send email in parallel
  const updateAndNotify = async () => {
    this.logger(`Updating booking status to completed for ID=${bookingId}`);
    await this.supabase
      .from('booked_lab_tests')
      .update({ status: 'completed' })
      .eq('id', bookingId);

    this.logger(`Fetching patient email for ID=${patientId}`);
    const { data: patient } = await this.supabase
      .from('users')
      .select('email')
      .eq('id', patientId)
      .single();

    if (patient?.email) {
      this.logger(`Sending email to ${patient.email}`);
      await this.sendEmail(
        patient.email,
        'Lab Scan Available',
        `Your lab scan for booking ID ${bookingId} is now available.`
      );
    }
  };

  updateAndNotify(); // fire-and-forget

  return data;
}









async uploadResult(
  bookingId: string,
  body: { title: string; resultData: any[]; doctor_name?: string }
) {
  this.logger(`Starting report generation for booking ID=${bookingId}`);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const primaryColor: [number, number, number] = [0, 131, 150];
  const grayText: [number, number, number] = [60, 60, 60];
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
    if (logoDataUrl) d.addImage(logoDataUrl, "PNG", M.left, 44, 56, 56);
    
    // Hospital name and details
    d.setTextColor(...primaryColor);
    d.setFont("helvetica", "bold");
    d.setFontSize(18);
    d.text(hospitalName, M.left + 70, 60);
    d.setFont("helvetica", "normal");
    d.setFontSize(12);
    d.setTextColor(...grayText);
    d.text(hospitalTagline, M.left + 70, 78);
    d.setFontSize(10);
    d.setTextColor(80, 80, 80);
    d.text(hospitalAddress, M.left + 70, 94);
    d.text(hospitalContact, M.left + 70, 108);
    
    // Report title and details
    d.setFont("helvetica", "bold");
    d.setFontSize(20);
    d.setTextColor(...primaryColor);
    d.text(cleanTitle(body.title || labTestRow?.name || "Laboratory Report"), pageWidth - M.right, 64, { align: "right" });
    d.setFont("helvetica", "normal");
    d.setFontSize(11);
    d.setTextColor(80, 80, 80);
    d.text(`Report Date: ${dateStr}`, pageWidth - M.right, 80, { align: "right" });
    d.text(`Generated: ${timeStr}`, pageWidth - M.right, 92, { align: "right" });
    
    // Report ID
    d.setFontSize(9);
    d.setTextColor(120, 120, 120);
    d.text(`Report ID: ${bookingId.slice(0, 8).toUpperCase()}`, pageWidth - M.right, 108, { align: "right" });
    
    // Professional separator line
    d.setDrawColor(...primaryColor);
    d.setLineWidth(2);
    d.line(M.left, headerHeight, pageWidth - M.right, headerHeight);
  };

  const drawFooter = (d: any, pageNumber: number, pageCount: number) => {
    d.setDrawColor(...primaryColor);
    d.setLineWidth(2);
    d.line(M.left, pageHeight - M.bottom, pageWidth - M.right, pageHeight - M.bottom);
    
    // Professional medical disclaimers
    const disclaimer1 = "This laboratory report is confidential and intended solely for the patient and their healthcare provider.";
    const disclaimer2 = "Results should be interpreted by a qualified medical professional. Normal ranges may vary by laboratory.";
    const disclaimer3 = "This document is computer-generated and legally binding. Report ID: " + bookingId.slice(0, 8).toUpperCase();
    
    d.setFont("helvetica", "normal");
    d.setFontSize(8);
    d.setTextColor(100, 100, 100);
    
    const wrapped1 = d.splitTextToSize(disclaimer1, pageWidth - M.left - M.right - 140);
    d.text(wrapped1, M.left, pageHeight - M.bottom + 12);
    
    const wrapped2 = d.splitTextToSize(disclaimer2, pageWidth - M.left - M.right - 140);
    d.text(wrapped2, M.left, pageHeight - M.bottom + 24);
    
    const wrapped3 = d.splitTextToSize(disclaimer3, pageWidth - M.left - M.right - 140);
    d.text(wrapped3, M.left, pageHeight - M.bottom + 36);
    
    d.setFontSize(9);
    d.text(`Page ${pageNumber} of ${pageCount}`, pageWidth / 2, pageHeight - 16, { align: "center" });
  };

  const drawWatermark = (d: any) => {
    if (!watermarkDataUrl) return;
    try {
      // Create a much more subtle watermark
      const wmW = pageWidth * 0.3;
      const wmH = pageHeight * 0.3;
      const x = (pageWidth - wmW) / 2;
      const y = (pageHeight - wmH) / 2;
      
      // Apply very low opacity (0.03 = 3% opacity)
      const gState = (d as any).GState ? (d as any).GState({ opacity: 0.03 }) : null;
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

  // --- Patient Information Section ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...primaryColor);
  doc.text("Patient Information", M.left, infoStartY - 16);

  const patientInfoBody = [
    ["Patient Name", patientProfileFromMongo?.name || "Not Available"],
    ["Patient ID", patientId.slice(0, 8).toUpperCase()],
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

  autoTable(doc, {
    startY: infoStartY,
    theme: "grid",
    styles: { fontSize: 11, cellPadding: 6 },
    headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
    margin: { top: M.top, bottom: M.bottom + 50, left: M.left, right: M.right },
    head: [["Field", "Details"]],
    body: patientInfoBody,
    didDrawPage: () => {
      drawWatermark(doc);
      drawHeader(doc);
      const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber;
      const pageCount = (doc as any).internal.getNumberOfPages();
      drawFooter(doc, pageNumber, pageCount);
    },
  });

  let cursorY = (doc as any).lastAutoTable.finalY + 30;

  // --- Test Information Section ---
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("Test Information", M.left, cursorY - 10);

  const testInfoBody = [
    ["Test Name", labTestRow?.name || body.title || "Laboratory Test"],
    ["Test Category", labTestRow?.category || "General"],
    ["Test Description", labTestRow?.description || "Diagnostic laboratory test"],
    ["Measurement Unit", labTestRow?.unit || labTestRow?.record_type || "Various"],
    ["Reference Range", labTestRow?.optimal_range || "See individual results"],
    ["Test Duration", labTestRow?.duration || "24-48 hours"],
    ["Collection Date", bookedTest?.scheduled_date ? new Date(bookedTest.scheduled_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Not Available"],
    ["Collection Time", bookedTest?.scheduled_time || "Not Available"],
    ["Collection Location", bookedTest?.location || "Main Laboratory"],
    ["Preparation Instructions", labTestRow?.preparation_instructions && Array.isArray(labTestRow.preparation_instructions) && labTestRow.preparation_instructions.length > 0 ? labTestRow.preparation_instructions.join("; ") : "Standard preparation"],
    ["Special Instructions", bookedTest?.instructions && Array.isArray(bookedTest.instructions) && bookedTest.instructions.length > 0 ? bookedTest.instructions.join("; ") : "None"],
  ];

  autoTable(doc, {
    startY: cursorY + 8,
    theme: "grid",
    styles: { fontSize: 11, cellPadding: 6 },
    headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
    margin: { top: M.top, bottom: M.bottom + 50, left: M.left, right: M.right },
    head: [["Field", "Details"]],
    body: testInfoBody,
    didDrawPage: () => {
      drawWatermark(doc);
      drawHeader(doc);
      const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber;
      const pageCount = (doc as any).internal.getNumberOfPages();
      drawFooter(doc, pageNumber, pageCount);
    },
  });

  cursorY = (doc as any).lastAutoTable.finalY + 30;

  // --- Laboratory Results Section ---
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("Laboratory Results", M.left, cursorY - 10);
  
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
    doc.setTextColor(80, 80, 80);
    doc.text(`Total Parameters Tested: ${body.resultData.length}`, M.left, cursorY + 5);
    doc.text(`Report Generated: ${dateStr} at ${timeStr}`, pageWidth - M.right, cursorY + 5, { align: "right" });
    
    autoTable(doc, {
      startY: cursorY + 15,
      head: [["Parameter", "Result", "Reference Range", "Unit", "Status"]],
      body: body.resultData.map((row: any) => [
        row.test ?? "N/A", 
        row.result ?? "N/A", 
        row.reference ?? "See lab notes", 
        row.unit ?? "N/A",
        "Normal" // You can add logic here to determine if result is normal/abnormal
      ]),
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      margin: { top: M.top, bottom: M.bottom + 50, left: M.left, right: M.right },
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
    cursorY += 15;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text("Historical Test Results", M.left, cursorY - 10);
    
    // Add summary
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(`Previous tests found: ${prevBookings.length}`, M.left, cursorY + 5);
    cursorY += 20;

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
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...primaryColor);
      doc.text(`${prevRecordData.title || "Previous Laboratory Report"}`, M.left, cursorY);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.text(`Test Date: ${prevDate}`, M.left, cursorY + 12);
      if (prevRecordData.doctor_name) {
        doc.text(`Reviewed by: Dr. ${prevRecordData.doctor_name}`, M.left, cursorY + 24);
      }
      cursorY += 35;

      let parsedResults: any[] = [];
      try {
        parsedResults = typeof prevRecordData.results === "string" ? JSON.parse(prevRecordData.results) : prevRecordData.results;
      } catch {
        parsedResults = [];
      }

      if (parsedResults && parsedResults.length > 0) {
        autoTable(doc, {
          startY: cursorY,
          head: [["Parameter", "Result", "Reference Range", "Unit"]],
          body: parsedResults.map(r => [r.test ?? "N/A", r.result ?? "N/A", r.reference ?? "See notes", r.unit ?? "N/A"]),
          theme: "grid",
          styles: { fontSize: 9, cellPadding: 5 },
          headStyles: { fillColor: [200, 200, 200], textColor: [40, 40, 40] },
          alternateRowStyles: { fillColor: [252, 252, 252] },
          margin: { top: M.top, bottom: M.bottom + 50, left: M.left + 8, right: M.right + 8 },
          didDrawPage: () => {
            drawWatermark(doc);
            drawHeader(doc);
            const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber;
            const pageCount = (doc as any).internal.getNumberOfPages();
            drawFooter(doc, pageNumber, pageCount);
          },
        });
        cursorY = (doc as any).lastAutoTable.finalY + 15;
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text("No detailed laboratory results available for this historical test.", M.left + 8, cursorY);
        cursorY += 20;
      }

      if (prevRecordData.file_url) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(120, 120, 120);
        doc.text(`Digital Report Available: ${prevRecordData.file_url}`, M.left + 8, cursorY, { maxWidth: pageWidth - M.left - M.right - 16 });
        cursorY += 15;
      }

      // Add separator line between historical results
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(M.left + 8, cursorY, pageWidth - M.right - 8, cursorY);
      cursorY += 20;

      if (cursorY > pageHeight - M.bottom - 200) {
        doc.addPage();
        cursorY = M.top;
      }
    }
  }

  // --- Professional Conclusion Section ---
  cursorY += 20;
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
    "• For questions regarding these results, please contact your healthcare provider or our laboratory directly.",
    "• This report is valid for medical decision-making purposes and meets clinical laboratory standards."
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

  const insertPayload = {
    results: JSON.stringify(body.resultData, null, 2),
    booked_test_id: bookingId,
    patient_id: patientId,
    title: cleanTitle(body.title),
    record_type: "report",
    date: new Date().toISOString(),
    file_url: uploaded?.secure_url || null,
    doctor_name: body.doctor_name,
  };

  const { data, error } = await this.supabase.from("medical_records").insert([insertPayload]);
  if (error) throw new Error(error.message);
  this.logger(`Medical record inserted for booking ID=${bookingId}`);

  await this.supabase.from("booked_lab_tests").update({ status: "completed" }).eq("id", bookingId);
  this.logger(`Booking status updated to completed for ID=${bookingId}`);

  if (patientRow?.email) {
    await this.sendEmail(
      patientRow.email,
      "Lab Report Available",
      `Your lab report "${cleanTitle(body.title)}" for booking ID ${bookingId} is now available.`
    );
    this.logger(`Email sent to patient ${patientRow.email}`);
  }

  return {
    ...insertPayload,
    file_url: uploaded?.secure_url || null,
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