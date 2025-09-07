import { Controller } from '@nestjs/common';
import { WorkoutSessionService } from './workout-sessions.service';


import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateWorkoutSessionDto } from './dto/create-workout-session.dto';

import { UpdateWorkoutSessionDto } from './dto/update-workout-session.dto';

@Controller('workout-sessions')
export class WorkoutSessionsController {
  constructor(private readonly service: WorkoutSessionService) {}

  @MessagePattern({ cmd: 'create_workout_session' })
  create(@Payload() dto: CreateWorkoutSessionDto) {
    return this.service.create(dto);
  }

  @MessagePattern({ cmd: 'find_all_sessions_by_patient' })
  findAllByPatient(@Payload() patientId: string) {
    return this.service.findAllByPatient(patientId);
  }

  @MessagePattern({ cmd: 'find_workout_session' })
  findOne(@Payload() id: string) {
    return this.service.findOne(id);
  }

  @MessagePattern({ cmd: 'update_workout_session' })
  update(@Payload() payload: { id: string; dto: UpdateWorkoutSessionDto }) {
    return this.service.update(payload.id, payload.dto);
  }

  @MessagePattern({ cmd: 'delete_workout_session' })
  remove(@Payload() id: string) {
    return this.service.remove(id);
  }

}
