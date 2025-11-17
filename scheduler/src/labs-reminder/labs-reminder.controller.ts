import { Controller } from '@nestjs/common';
import { LabsReminderService } from './labs-reminder.service';

@Controller('labs-reminder')
export class LabsReminderController {
  constructor(private readonly labsReminderService: LabsReminderService) {}
}
