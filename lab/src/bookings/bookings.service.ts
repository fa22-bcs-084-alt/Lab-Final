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
    ["Measurement Unit", labTestRow?.unit || labTestRow?.record_type || "Various"],
    ["Reference Range", labTestRow?.optimal_range || "See individual results"],
    ["Test Duration", labTestRow?.duration || "24-48 hours"],
    ["Collection Date", bookedTest?.scheduled_date ? new Date(bookedTest.scheduled_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Not Available"],
    ["Collection Time", bookedTest?.scheduled_time || "Not Available"],
    ["Collection Location", bookedTest?.location || "Main Laboratory"],
    ["Preparation Instructions", labTestRow?.preparation_instructions && Array.isArray(labTestRow.preparation_instructions) && labTestRow.preparation_instructions.length > 0 ? labTestRow.preparation_instructions.join("; ") : "Standard preparation"],
    // Special Instructions removed per request
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
    // Start previous results on a new page for clean layout
    doc.addPage();
    cursorY = M.top;
    // Heading for previous results (left aligned)
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text("Previous Results", M.left, cursorY - 10);
    cursorY += 6;
    // Consolidate all previous results into a single table (no heading/URLs)
    const consolidatedRows: any[] = [];
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
          const status = determineStatus(r.result, r.reference);
          consolidatedRows.push([
            prevDate,
            prevRecordData.title || "Previous Laboratory Report",
            r.test ?? "N/A",
            r.result ?? "N/A",
            r.reference ?? "See notes",
            r.unit ?? "N/A",
            status,
          ]);
        });
      }
    }

    if (consolidatedRows.length > 0) {
      const simplifiedRows = consolidatedRows.map(r => [
        r[0], // Date
        r[1], // Report title
        r[3], // Result
        r[6], // Status
      ]);
    
      autoTable(doc, {
        startY: cursorY,
        head: [["Date", "Report", "Result", "Status"]],
        body: simplifiedRows,
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 5, valign: "middle" },
        headStyles: { fillColor: [200, 200, 200], textColor: [40, 40, 40], halign: "left" },
        alternateRowStyles: { fillColor: [252, 252, 252] },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 200 },
          2: { cellWidth: 100 },
          3: { cellWidth: 80 },
        },
        margin: { top: M.top, bottom: M.bottom + 50, left: M.left, right: M.right },
        didParseCell(data: any) {
          if (data.column.index === 3) {
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
            const status = data.row.raw?.[3];
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
    await this.sendEmail(
      patientRow.email,
      "Lab Report Available",
      `Your lab report "${cleanTitle(body.title)}" for booking ID ${bookingId} is now available. View it here: ${viewUrl}`
    );
    this.logger(`Email sent to patient ${patientRow.email}`);
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