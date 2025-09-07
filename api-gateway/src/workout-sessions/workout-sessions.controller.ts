import { Controller, Get, Post, Body, Param, Patch, Delete, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CreateWorkoutSessionDto } from './dto/create-workout-session.dto';

import { UpdateWorkoutSessionDto } from './dto/update-workout-session.dto';
import { lastValueFrom } from 'rxjs';

@Controller('workout-sessions')
export class WorkoutSessionsController {
  constructor(
    @Inject('FITNESS_SERVICE') private client: ClientProxy
  ) {}

  @Post()
  async create(@Body() dto: CreateWorkoutSessionDto) {
    return lastValueFrom(
      this.client.send({ cmd: 'create_workout_session' }, dto)
    );
  }

  @Get('patient/:patientId')
  async findAllByPatient(@Param('patientId') patientId: string) {
    return lastValueFrom(
      this.client.send({ cmd: 'find_all_sessions_by_patient' }, patientId)
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return lastValueFrom(
      this.client.send({ cmd: 'find_workout_session' }, id)
    );
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateWorkoutSessionDto) {
    return lastValueFrom(
      this.client.send({ cmd: 'update_workout_session' }, { id, dto })
    );
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return lastValueFrom(
      this.client.send({ cmd: 'delete_workout_session' }, id)
    );
  }
}
