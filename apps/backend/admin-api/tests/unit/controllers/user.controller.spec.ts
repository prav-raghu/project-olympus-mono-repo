import { Test, type TestingModule } from '@nestjs/testing';
import { UsersController } from '../../../src/modules/users/users.controller';
import { UsersService } from '../../../src/modules/users/users.service';
import { AzureAuthGuard } from '../../../src/modules/auth/guards/azure-auth.guard';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;

  const mockUsersService = {
    getOnlineUsers: jest.fn(),
    getUserDetails: jest.fn(),
    getUserProfile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    })
      .overrideGuard(AzureAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(UsersController);
    usersService = module.get(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns paged users when service resolves', async () => {
      const response = {
        users: [{ id: 'uuid-1', email: 'a@test.com' }],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
        isSuccessful: true,
        message: 'Users retrieved successfully',
      };
      mockUsersService.getOnlineUsers.mockResolvedValue(response);

      const result = await controller.findAll();

      expect(result).toEqual(response);
      expect(usersService.getOnlineUsers).toHaveBeenCalledWith({
        page: 1,
        pageSize: 20,
        searchQuery: undefined,
        sortBy: undefined,
        sortOrder: undefined,
      });
    });

    it('parses page and pageSize query params when provided', async () => {
      mockUsersService.getOnlineUsers.mockResolvedValue({ users: [], total: 0 });

      await controller.findAll('2', '50', 'jane', 'username', 'asc');

      expect(usersService.getOnlineUsers).toHaveBeenCalledWith({
        page: 2,
        pageSize: 50,
        searchQuery: 'jane',
        sortBy: 'username',
        sortOrder: 'asc',
      });
    });
  });

  describe('findById', () => {
    it('returns user details when found', async () => {
      const details = { id: 'uuid-1', username: 'jane' };
      mockUsersService.getUserDetails.mockResolvedValue(details);

      const result = await controller.findById('uuid-1');

      expect(result).toEqual(details);
      expect(usersService.getUserDetails).toHaveBeenCalledWith('uuid-1');
    });

    it('returns null when user not found', async () => {
      mockUsersService.getUserDetails.mockResolvedValue(null);

      const result = await controller.findById('missing-id');

      expect(result).toBeNull();
    });
  });
});
