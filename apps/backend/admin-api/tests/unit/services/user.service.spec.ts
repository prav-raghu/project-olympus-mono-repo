import { Test, type TestingModule } from '@nestjs/testing';
import { UsersService } from '../../../src/modules/users/users.service';
import { ADMIN_DB } from '@project-olympus/database';
import { EmailService } from '@project-olympus/email';
import type { CreateUserDto } from '../../../src/modules/users/dto/create-user.dto';

describe('UsersService', () => {
  let service: UsersService;

  const mockPrisma = {
    user: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    userStatus: {
      findMany: jest.fn(),
    },
  };

  const mockEmailService = {
    sendMail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: ADMIN_DB, useValue: mockPrisma },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOnlineUsers', () => {
    it('returns paged users when the query resolves', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'uuid-1',
          username: 'jane',
          email: 'jane@test.com',
          avatar: null,
          ipAddress: '127.0.0.1',
          createdAt: new Date(),
          lastSeen: new Date(),
          status: { name: 'Online' },
          roles: { name: 'Admin' },
        },
      ]);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = (await service.getOnlineUsers({ page: 1, pageSize: 20 })) as {
        isSuccessful: boolean;
        total: number;
      };

      expect(result.isSuccessful).toBe(true);
      expect(result.total).toBe(1);
    });
  });

  describe('onboardUser', () => {
    const dto: CreateUserDto = {
      username: 'jane',
      email: 'jane@test.com',
      password: '',
      roleId: 'role-1',
      userStatusId: 'status-1',
      acceptTermsAndConditions: true,
      allowEmailCommunications: false,
    };

    it('fails when the username or email is already taken', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ username: 'jane', email: 'jane@test.com' });

      const result = (await service.onboardUser(dto)) as { isSuccessful: boolean; message: string };

      expect(result.isSuccessful).toBe(false);
      expect(result.message).toBe('Username already exists');
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('creates the user and sends an onboarding email when available', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'uuid-1',
        username: 'jane',
        email: 'jane@test.com',
        roleId: 'role-1',
      });
      mockPrisma.role.findUnique.mockResolvedValue({ id: 'role-1', name: 'Admin' });
      mockEmailService.sendMail.mockResolvedValue(true);

      const result = (await service.onboardUser(dto)) as { isSuccessful: boolean; message: string };

      expect(result.isSuccessful).toBe(true);
      expect(mockEmailService.sendMail).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateProfile', () => {
    it('fails when the user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.updateProfile('missing-id', {});

      expect(result.isSuccessful).toBe(false);
      expect(result.message).toBe('User not found');
    });

    it('updates the user when found', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: 'uuid-1', username: 'jane', email: 'jane@test.com' })
        .mockResolvedValueOnce(null);
      mockPrisma.user.update.mockResolvedValue({ id: 'uuid-1', username: 'jane2', email: 'jane@test.com', avatar: null });

      const result = await service.updateProfile('uuid-1', { username: 'jane2' });

      expect(result.isSuccessful).toBe(true);
      expect(result.data?.username).toBe('jane2');
    });
  });
});
