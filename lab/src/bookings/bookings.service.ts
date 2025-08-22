import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v2 as cloudinary } from 'cloudinary';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';
import * as nodemailer from 'nodemailer';

@Injectable()
export class BookingsService {
  private supabase: SupabaseClient;
  private lastAssignedIndex = 0;
  private transporter: nodemailer.Transporter;

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

    const { data: booking, error: bookingError } = await this.supabase
      .from('booked_lab_tests')
      .insert([
        {
          test_id: data.testId,
          patient_id: data.patientId,
          lab_technician_id: techId,
          scheduled_date: data.scheduledDate,
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

  async uploadScan(bookingId: string, file: Express.Multer.File, doctor_name?: string) {
    const uploaded = await cloudinary.uploader.upload(file.path, {
      folder: 'medical_records/scans',
      resource_type: 'auto',
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
    body: { title: string; resultData: string; doctor_name?: string },
  ) {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', async () => {});
    doc.text(body.resultData);
    doc.end();

    await new Promise<void>((resolve) => doc.on('end', resolve));
    const pdfBuffer = Buffer.concat(chunks);

    const uploaded = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'medical_records/results', resource_type: 'auto', format: 'pdf' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        },
      );
      const readable = new Readable();
      readable.push(pdfBuffer);
      readable.push(null);
      readable.pipe(stream);
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
        title: body.title,
        record_type: 'report',
        date: new Date().toISOString(),
        file_url: uploaded.secure_url,
        doctor_name: body.doctor_name,
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
        'Lab Report Available',
        `Your lab report "${body.title}" for booking ID ${bookingId} is now available.`,
      );
    }

    return data;
  }

  async getBookingsByPatient(patientId: string) {
    const { data, error } = await this.supabase
      .from('booked_lab_tests')
      .select('*')
      .eq('patient_id', patientId);

    if (error) throw new Error(error.message);
    return data;
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
      .select('*')
      .eq('lab_technician_id', techId);

    if (error) throw new Error(error.message);
    return data;
  }


}
