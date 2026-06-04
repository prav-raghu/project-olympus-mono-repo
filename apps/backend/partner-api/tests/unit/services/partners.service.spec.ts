import { Test, type TestingModule } from '@nestjs/testing';
import { PartnersService } from '../../../src/modules/partners/partners.service';
import { ADMIN_DB } from '@project-olympus/database';

describe('PartnersService', () => {
  let service: PartnersService;

  const mockPrisma = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartnersService,
        { provide: ADMIN_DB, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(PartnersService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated partners', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      const result = await service.findAll(1, 20);

      expect(result.isSuccessful).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('findById', () => {
    it('should return a partner when found', async () => {
      const partner = { id: 'p-1', name: 'Acme', email: 'acme@test.com', isActive: true };
      mockPrisma.user.findUnique.mockResolvedValue(partner);

      const result = await service.findById('p-1');

      expect(result.isSuccessful).toBe(true);
      expect(result.data).toEqual(partner);
    });

    it('should return failure when not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findById('missing');

      expect(result.isSuccessful).toBe(false);
      expect(result.message).toBe('Partner not found');
    });
  });

  describe('softDelete', () => {
    it('should deactivate partner', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'p-1', isActive: true });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.softDelete('p-1', 'user-1');

      expect(result.isSuccessful).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'p-1' },
        data: { isActive: false, modifiedBy: 'user-1' },
      });
    });
  });
});
