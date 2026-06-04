import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PartnersController } from '../../../src/modules/partners/partners.controller';
import { PartnersService } from '../../../src/modules/partners/partners.service';
import { AzureAuthGuard } from '../../../src/modules/auth/guards/azure-auth.guard';
import type { AzureUser } from '@project-olympus/auth';

const mockUser: AzureUser = {
  id: 'user-1',
  email: 'admin@test.com',
  role: 'Administrator',
  permissions: ['Administrator'],
  scope: 'access_as_user',
  azureOid: 'user-1',
};

describe('PartnersController', () => {
  let controller: PartnersController;

  const mockService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PartnersController],
      providers: [{ provide: PartnersService, useValue: mockService }],
    })
      .overrideGuard(AzureAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(PartnersController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('should return paginated partners', async () => {
      const result = { isSuccessful: true, data: [], total: 0, page: 1, pageSize: 20 };
      mockService.findAll.mockResolvedValue(result);

      const response = await controller.findAll('1', '20', undefined);

      expect(response).toEqual(result);
      expect(mockService.findAll).toHaveBeenCalledWith(1, 20, undefined);
    });
  });

  describe('findById', () => {
    it('should return a partner', async () => {
      const partner = { id: 'p-1', name: 'Acme', email: 'acme@test.com' };
      mockService.findById.mockResolvedValue({ isSuccessful: true, data: partner });

      const response = await controller.findById('p-1');

      expect(response).toEqual({ isSuccessful: true, data: partner });
    });

    it('should throw NotFoundException when partner not found', async () => {
      mockService.findById.mockResolvedValue({ isSuccessful: false, message: 'Partner not found' });

      await expect(controller.findById('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a partner', async () => {
      const dto = { name: 'Acme Corp', email: 'acme@corp.com' };
      const created = { id: 'p-1', ...dto };
      mockService.create.mockResolvedValue({ isSuccessful: true, data: created });

      const response = await controller.create(dto as never, mockUser);

      expect(mockService.create).toHaveBeenCalledWith(dto, mockUser.id);
      expect(response).toEqual({ isSuccessful: true, data: created });
    });
  });

  describe('remove', () => {
    it('should deactivate a partner', async () => {
      mockService.softDelete.mockResolvedValue({ isSuccessful: true, message: 'Partner deactivated successfully' });

      const response = await controller.remove('p-1', mockUser);

      expect(mockService.softDelete).toHaveBeenCalledWith('p-1', mockUser.id);
      expect(response).toEqual({ isSuccessful: true, message: 'Partner deactivated successfully' });
    });
  });
});
