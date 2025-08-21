import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v2 as cloudinary } from 'cloudinary';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

@Injectable()
export class BookingsService {
  private supabase: SupabaseClient;
  private lastAssignedIndex = 0;

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
      .insert([{
        test_id: data.testId,
        patient_id: data.patientId,
        lab_technician_id: techId,
        scheduled_date: data.scheduledDate,
        scheduled_time: data.scheduledTime,
        location: data.location,
        instructions: data.instructions,
        status: 'pending',  // Ensure the status is set to 'pending' initially
      }])
      .select()
      .single();

    if (bookingError) throw new Error(bookingError.message);
    return booking;
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

  async uploadScan(bookingId: string, file: Express.Multer.File, doctor_name?: string) {
  const uploaded = await cloudinary.uploader.upload(file.path, {
  folder: 'medical_records/scans',
  resource_type: 'auto',

    });

    const { data, error } = await this.supabase.from('medical_records').insert([{
      booked_test_id: bookingId,  // Use booked_test_id to reference the booking
      patient_id: (await this.supabase
        .from('booked_lab_tests')
        .select('patient_id')
        .eq('id', bookingId)
        .single()
      ).data?.patient_id,  // Ensure patient_id is correctly inserted
      title: 'Lab Scan',
      record_type: 'scan',  // Set record_type to 'scan'
      date: new Date().toISOString(),
      file_url: uploaded.secure_url,
      doctor_name,
    }]);

    if (error) throw new Error(error.message);

    // Mark the booking as completed after upload
    await this.supabase
      .from('booked_lab_tests')
      .update({ status: 'completed' })  // Status set to 'completed'
      .eq('id', bookingId);

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

    

    const { data, error } = await this.supabase.from('medical_records').insert([{
      booked_test_id: bookingId,  // Use booked_test_id to reference the booking
      patient_id: (await this.supabase
        .from('booked_lab_tests')
        .select('patient_id')
        .eq('id', bookingId)
        .single()
      ).data?.patient_id,  // Ensure patient_id is correctly inserted
      title: body.title,
      record_type: 'report',  // Set record_type to 'report'
      date: new Date().toISOString(),
      file_url: uploaded.secure_url,
      doctor_name: body.doctor_name,
    }]);

    if (error) throw new Error(error.message);

    // Mark the booking as completed after result upload
    await this.supabase
      .from('booked_lab_tests')
      .update({ status: 'completed' })  // Status set to 'completed'
      .eq('id', bookingId);

    return data;
  }
}
