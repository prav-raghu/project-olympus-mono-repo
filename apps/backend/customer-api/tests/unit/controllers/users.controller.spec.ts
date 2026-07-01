import { NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { UsersController } from '../../../src/modules/users/users.controller';
import { UsersService } from '../../../src/modules/users/users.service';
import { AzureAuthGuard } from '../../../src/modules/auth/guards/azure-auth.guard';
import type { AzureUser } from '@project-olympus/auth';

describe('UsersController', () => {
  let controller: UsersController;

  const mockUsersService = {
    getUsers: jest.fn(),
    getUserById: jest.fn(),
  };

  const currentUser = { id: 'uuid-current' } as AzureUser;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    })
      .overrideGuard(AzureAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(UsersController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns users when the service resolves', async () => {
      const response = { isSuccessful: true, data: [{ id: 'uuid-1', username: 'jane' }] };
      mockUsersService.getUsers.mockResolvedValue(response);

      const result = await controller.findAll(currentUser);

      expect(result).toEqual(response);
      expect(mockUsersService.getUsers).toHaveBeenCalledWith(
        { genderId: undefined, minAge: undefined, maxAge: undefined, limit: 20, offset: 0 },
        currentUser.id,
      );
    });

    it('returns empty data when no users exist', async () => {
      mockUsersService.getUsers.mockResolvedValue({ isSuccessful: true, data: [] });

      const result = await controller.findAll(currentUser);

      expect(result).toEqual({ isSuccessful: true, data: [] });
    });

    it('parses limit and offset query params when provided', async () => {
      mockUsersService.getUsers.mockResolvedValue({ isSuccessful: true, data: [] });

      await controller.findAll(currentUser, '50', '10', 'male', '18', '65');

      expect(mockUsersService.getUsers).toHaveBeenCalledWith(
        { genderId: 'male', minAge: 18, maxAge: 65, limit: 50, offset: 10 },
        currentUser.id,
      );
    });
  });

  describe('findById', () => {
    it('returns the user when found', async () => {
      const response = { isSuccessful: true, data: { id: 'uuid-1', username: 'jane' } };
      mockUsersService.getUserById.mockResolvedValue(response);

      const result = await controller.findById('uuid-1');

      expect(result).toEqual(response);
    });

    it('throws NotFoundException when the service reports failure', async () => {
      mockUsersService.getUserById.mockResolvedValue({ isSuccessful: false, message: 'User not found' });

      await expect(controller.findById('missing-id')).rejects.toThrow(NotFoundException);
    });
  });
});
