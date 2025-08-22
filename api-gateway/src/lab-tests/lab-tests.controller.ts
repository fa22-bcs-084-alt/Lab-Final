import { Controller } from '@nestjs/common';
import { LabTestsService } from './lab-tests.service';

@Controller('lab-tests')
export class LabTestsController {
  constructor(private readonly labTestsService: LabTestsService) {}
}
