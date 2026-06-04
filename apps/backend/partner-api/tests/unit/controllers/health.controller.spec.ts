import { Test, type TestingModule } from '@nestjs/testing';
import { HealthController } from '../../../src/modules/health/health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get(HealthController);
  });

  describe('liveness', () => {
    it('should return ok status', () => {
      expect(controller.liveness()).toEqual({ status: 'ok' });
    });
  });

  describe('readiness', () => {
    it('should return ready status with timestamp', () => {
      const result = controller.readiness();
      expect(result.status).toBe('ready');
      expect(typeof result.timestamp).toBe('string');
    });
  });
});
