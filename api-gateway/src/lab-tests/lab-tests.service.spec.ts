import { Test, TestingModule } from '@nestjs/testing';
import { LabTestsService } from './lab-tests.service';

describe('LabTestsService', () => {
  let service: LabTestsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LabTestsService],
    }).compile();

    service = module.get<LabTestsService>(LabTestsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
