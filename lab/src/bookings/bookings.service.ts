import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v2 as cloudinary } from 'cloudinary';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';
import * as nodemailer from 'nodemailer';
  import axios from 'axios'
import FormData from 'form-data'
import autoTable from "jspdf-autotable"
import { jsPDF } from "jspdf"
import fs from "fs"
import path from "path"

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

  constructor(private configService: ConfigService) {
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
    const { data: technicians, error } = await this.supabase
      .from('users')
      .select('id')
      .eq('role', 'lab_technician');

    if (error) throw new Error(error.message);
    if (!technicians || technicians.length === 0) {
      throw new Error('No lab technicians available');
    }

    const techId = technicians[this.lastAssignedIndex % technicians.length].id;
    this.lastAssignedIndex++;

    console.log("Booking test for date=",data.scheduledDate)
    const { data: booking, error: bookingError } = await this.supabase
      .from('booked_lab_tests')
      .insert([
        {
          test_id: data.testId,
          patient_id: data.patientId,
          lab_technician_id: techId,
        scheduled_date: new Date(
  data.scheduledDate.split('/').reverse().join('-')
).toISOString().split('T')[0],

          scheduled_time: data.scheduledTime,
          location: data.location,
          instructions: data.instructions,
          status: 'pending',
        },
      ])
      .select()
      .single();

    if (bookingError) throw new Error(bookingError.message);

    const { data: patient } = await this.supabase
      .from('users')
      .select('email')
      .eq('id', data.patientId)
      .single();

    if (patient?.email) {
      await this.sendEmail(
        patient.email,
        'Appointment Confirmation',
        `Your test has been booked for ${data.scheduledDate} at ${data.scheduledTime}.`,
      );
    }

    return booking;
  }


async uploadScan(
  bookingId: string,
  fileBuffer: Buffer | Uint8Array,
  fileName: string,
  doctor_name?: string
) {
  const uploaded = await new Promise<any>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'medical_records/scans', resource_type: 'auto' },
      (error, result) => (error ? reject(error) : resolve(result))
    );

    // Make sure we send the raw buffer, NOT an object
    if (Buffer.isBuffer(fileBuffer) || fileBuffer instanceof Uint8Array) {
      uploadStream.end(fileBuffer);
    } else {
      reject(new Error('fileBuffer must be a Buffer or Uint8Array'));
    }
  });
  const { data, error } = await this.supabase.from('medical_records').insert([
    {
      booked_test_id: bookingId,
      patient_id: (
        await this.supabase
          .from('booked_lab_tests')
          .select('patient_id')
          .eq('id', bookingId)
          .single()
      ).data?.patient_id,
      title: 'Lab Scan',
      record_type: 'scan',
      date: new Date().toISOString(),
      file_url: uploaded.secure_url,
      doctor_name,
    },
  ]);

  if (error) throw new Error(error.message);

  await this.supabase
    .from('booked_lab_tests')
    .update({ status: 'completed' })
    .eq('id', bookingId);

  const { data: patient } = await this.supabase
    .from('users')
    .select('email')
    .eq('id', (
      await this.supabase
        .from('booked_lab_tests')
        .select('patient_id')
        .eq('id', bookingId)
        .single()
    ).data?.patient_id)
    .single();

  if (patient?.email) {
    await this.sendEmail(
      patient.email,
      'Lab Scan Available',
      `Your lab scan for booking ID ${bookingId} is now available.`,
    );
  }

  return data;
}



async uploadResult(
  bookingId: string,
  body: { title: string; resultData: any[]; doctor_name?: string },
) {
  const pageWidth = 595.28
  const pageHeight = 841.89
  const primaryColor: [number, number, number] = [0, 131, 150]

  const loadBase64 = (fileName: string) => {
    const absPath = path.resolve(process.cwd(), "src", "assets", fileName)
    const file = fs.readFileSync(absPath)
    return `data:image/png;base64,${file.toString("base64")}`
  }

  let logoDataUrl: string | null = null
  let watermarkDataUrl: string | null = null
  try {
    logoDataUrl = loadBase64("logo.png")
    watermarkDataUrl = loadBase64("logo-2.png")
  } catch (err) {
    console.warn("Logo/Watermark not loaded:", err)
  }

  const doc = new jsPDF({ unit: "pt", format: "a4" })

  doc.setProperties({
    title: body.title,
    subject: "Lab Report",
    author: body.doctor_name || "Lab",
    keywords: "lab, report, medical",
    creator: "Hygieia",
  })

  // header
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", 40, 25, 50, 50)
  }
  doc.setFontSize(20)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...primaryColor)

  const cleanTitle = body.title
    .replace(/[-_]?results\.json$/i, "")
    .replace(/\.json$/i, "")
    .trim()

  doc.text(cleanTitle, pageWidth / 2, 55, { align: "center" })
  doc.setDrawColor(...primaryColor)

  // === fetch patient info ===
  const patientId = (
    await this.supabase.from("booked_lab_tests").select("patient_id").eq("id", bookingId).single()
  ).data?.patient_id

  const { data: patient } = await this.supabase
    .from("users")
    .select("email")
    .eq("id", patientId)
    .single()

  const dateStr = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

  // patient/report info block with colors
  const infoStartY = 95
  const leftX = 40
  const rightX = pageWidth / 2 + 20
  const labelColor: [number, number, number] = primaryColor
  const valueColor: [number, number, number] = [80, 80, 80]

  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...labelColor)
  doc.text(`Report Name:`, leftX, infoStartY)
  doc.text(`Patient Email:`, rightX, infoStartY)
  doc.text(`Date:`, leftX, infoStartY + 20)
  doc.text(`Referred by:`, rightX, infoStartY + 20)

  doc.setFont("helvetica", "normal")
  doc.setTextColor(...valueColor)
  doc.text(cleanTitle, leftX + 90, infoStartY)
  if (patient?.email) doc.text(patient.email, rightX + 80, infoStartY)
  doc.text(dateStr, leftX + 50, infoStartY + 20)
  doc.text(body.doctor_name || "-", rightX + 80, infoStartY + 20)

  doc.setDrawColor(...primaryColor)
  doc.setLineWidth(0.3)
  doc.line(40, infoStartY + 35, pageWidth - 40, infoStartY + 35)

  let cursorY = infoStartY + 60

  if (!body.resultData || body.resultData.length === 0) {
    doc.text("No results available.", 40, cursorY)
  } else {
    const tableBody = body.resultData.map((row: any) => [
      row.test ?? "-",
      row.reference ?? "-",
      row.unit ?? "-",
      row.result ?? "-",
    ])

    autoTable(doc, {
      startY: cursorY,
      head: [["Test", "Reference", "Unit", "Result"]],
      body: tableBody,
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 40, right: 40 },
    })

    cursorY = (doc as any).lastAutoTable.finalY + 30
  }

  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(9)
    doc.setTextColor(120, 120, 120)
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 20, { align: "center" })
  }

  if (watermarkDataUrl) {
    const wmW = pageWidth * 0.5
    const wmH = pageHeight * 0.5
    const x = (pageWidth - wmW) / 2
    const y = (pageHeight - wmH) / 2

    const gState = doc.GState({ opacity: 0.1 })
    doc.setGState(gState)

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.addImage(watermarkDataUrl, "PNG", x, y, wmW, wmH)
    }

    doc.setGState(new (doc as any).GState({ opacity: 1 }))
  }

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"))

  // === upload to Cloudinary ===
  const uploaded = await new Promise<any>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "medical_records/results",
        resource_type: "raw",
        public_id: cleanTitle.replace(/\s+/g, "_"),
        format: "pdf",
      },
      (error, result) => (error ? reject(error) : resolve(result)),
    )
    const readable = new Readable()
    readable.push(pdfBuffer)
    readable.push(null)
    readable.pipe(stream)
  })

  console.log("upload report cloudinary url=", uploaded.secure_url)

  const { data, error } = await this.supabase.from("medical_records").insert([
    {
      results: JSON.stringify(body.resultData, null, 2),
      booked_test_id: bookingId,
      patient_id: patientId,
      title: cleanTitle,
      record_type: "report",
      date: new Date().toISOString(),
      file_url: uploaded.secure_url,
      doctor_name: body.doctor_name,
    },
  ])

  if (error) throw new Error(error.message)

  await this.supabase.from("booked_lab_tests").update({ status: "completed" }).eq("id", bookingId)

  if (patient?.email) {
    await this.sendEmail(
      patient.email,
      "Lab Report Available",
      `Your lab report "${cleanTitle}" for booking ID ${bookingId} is now available.`,
    )
  }
 
  return   {
      results: JSON.stringify(body.resultData, null, 2),
      booked_test_id: bookingId,
      patient_id: patientId,
      title: cleanTitle,
      record_type: "report",
      date: new Date().toISOString(),
      file_url: uploaded.secure_url,
      doctor_name: body.doctor_name,
    }
}



async getBookingsByPatient(patientId: string): Promise<BookedLabTest[]> {
  const { data: bookings, error: bookingsError } = await this.supabase
    .from('booked_lab_tests')
    .select('*')
    .eq('patient_id', patientId);

  if (bookingsError) throw new Error(bookingsError.message);
  if (!bookings?.length) return [];

  // Get all unique test IDs
  const testIds = bookings.map(b => b.test_id);
  
  const { data: labTests, error: labTestsError } = await this.supabase
    .from('lab_tests')
    .select('id, name')
    .in('id', testIds);

  if (labTestsError) throw new Error(labTestsError.message);

  // Map test IDs to names for quick lookup
  const testMap = new Map(labTests.map(t => [t.id, t.name]));

  return bookings.map(item => ({
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

  // Weekly completed count
  const weeklyData = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => {
    const completed = bookings.filter(
      b => b.status === 'completed' && new Date(b.scheduledDate).getDay() === i
    ).length;
    return { day, completed };
  });

  // Dynamic test category completed count with random colors
  const categoryMap: Record<string, { count: number; color: string }> = {};
  bookings.forEach(b => {
    if (b.status !== 'completed') return;
    const cat = b.testCategory || "Others";
    if (!categoryMap[cat]) {
      categoryMap[cat] = { count: 0, color: `#${Math.floor(Math.random() * 16777215).toString(16)}` };
    }
    categoryMap[cat].count += 1;
  });

  const testCategoryData = Object.entries(categoryMap).map(([category, data]) => ({
    category,
    count: data.count,
    color: data.color
  }));

  return { bookings, weeklyData, testCategoryData };
}





}
