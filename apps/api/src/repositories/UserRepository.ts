/**
 * User Repository
 *
 * Extended TypeORM repository with custom query methods for user operations.
 * Provides efficient querying methods for user management functionality.
 */

import { EntityManager, Repository } from 'typeorm';
import { User } from '../entities/User';
import { UserNotFoundError } from '../errors/UserError';

export interface UserSearchFilters {
  search?: string;
  roleId?: string;
  isActive?: boolean;
  sortBy?: 'firstName' | 'lastName' | 'email' | 'createdAt';
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export class UserRepository {
  private repository: Repository<User>;

  constructor(entityManager?: EntityManager) {
    if (!entityManager) {
      throw new Error('EntityManager is required for UserRepository initialization');
    }
    this.repository = entityManager.getRepository(User);
  }

  /**
   * Get the underlying TypeORM repository
   */
  getRepository(): Repository<User> {
    return this.repository;
  }

  /**
   * Find user with role relationship eager loaded
   */
  async findWithRole(id: string): Promise<User | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['role'],
    });
  }

  /**
   * Find user by email with role relationship for authentication
   */
  async findByEmailWithRole(email: string): Promise<User | null> {
    return this.repository.findOne({
      where: { email: email.toLowerCase().trim() },
      relations: ['role'],
    });
  }

  /**
   * Search users with pagination and filtering
   */
  async searchUsersWithPagination(filters: UserSearchFilters): Promise<PaginatedResponse<User>> {
    const {
      search,
      roleId,
      isActive,
      sortBy = 'firstName',
      sortOrder = 'ASC',
      page = 1,
      pageSize = 50,
    } = filters;

    // Ensure pageSize doesn't exceed maximum
    const actualPageSize = Math.min(pageSize, 100);
    const skip = (page - 1) * actualPageSize;

    let queryBuilder = this.repository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role');

    // Apply search filter across first_name, last_name, and email
    if (search) {
      const searchTerm = `%${search.toLowerCase()}%`;
      queryBuilder = queryBuilder.andWhere(
        '(LOWER(user.firstName) LIKE :search OR LOWER(user.lastName) LIKE :search OR LOWER(user.email) LIKE :search)',
        { search: searchTerm }
      );
    }

    // Apply role filter
    if (roleId) {
      queryBuilder = queryBuilder.andWhere('user.roleId = :roleId', { roleId });
    }

    // Apply active status filter
    if (isActive !== undefined) {
      queryBuilder = queryBuilder.andWhere('user.isActive = :isActive', { isActive });
    }

    // Apply sorting
    const sortColumn = this.getSortColumn(sortBy);
    queryBuilder = queryBuilder.orderBy(sortColumn, sortOrder);

    // Get total count before applying pagination
    const total = await queryBuilder.getCount();

    // Apply pagination
    const users = await queryBuilder.skip(skip).take(actualPageSize).getMany();

    return {
      data: users,
      pagination: {
        page,
        pageSize: actualPageSize,
        total,
        totalPages: Math.ceil(total / actualPageSize),
      },
    };
  }

  /**
   * Find active users by role ID
   */
  async findActiveUsersByRole(roleId: string): Promise<User[]> {
    return this.repository.find({
      where: {
        roleId,
        isActive: true,
      },
      relations: ['role'],
      order: {
        firstName: 'ASC',
        lastName: 'ASC',
      },
    });
  }

  /**
   * Create a new user
   */
  async createUser(userData: Partial<User>): Promise<User> {
    const user = this.repository.create(userData);
    return this.repository.save(user);
  }

  /**
   * Update user by ID
   */
  async updateUser(id: string, updateData: Partial<User>): Promise<User> {
    const updateResult = await this.repository.update(id, updateData);

    // Check if any rows were actually updated
    if (updateResult.affected === 0) {
      throw new UserNotFoundError(id);
    }

    const updatedUser = await this.findWithRole(id);
    if (!updatedUser) {
      throw new UserNotFoundError(id);
    }

    return updatedUser;
  }

  /**
   * Soft delete user (set isActive to false)
   */
  async softDeleteUser(id: string): Promise<void> {
    const updateResult = await this.repository.update(id, { isActive: false });

    // Throw error if user doesn't exist
    if (updateResult.affected === 0) {
      throw new Error('User not found');
    }
  }

  /**
   * Check if email exists (case insensitive)
   */
  async emailExists(email: string, excludeUserId?: string): Promise<boolean> {
    let queryBuilder = this.repository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = LOWER(:email)', { email: email.trim() });

    if (excludeUserId) {
      queryBuilder = queryBuilder.andWhere('user.id != :userId', { userId: excludeUserId });
    }

    const count = await queryBuilder.getCount();
    return count > 0;
  }

  /**
   * Get user count by role
   */
  async getUserCountByRole(roleId: string): Promise<number> {
    return this.repository.count({
      where: {
        roleId,
        isActive: true,
      },
    });
  }

  /**
   * Get all users without pagination (for internal operations)
   */
  async findAllWithRole(): Promise<User[]> {
    return this.repository.find({
      relations: ['role'],
      order: {
        firstName: 'ASC',
        lastName: 'ASC',
      },
    });
  }

  /**
   * Get sort column mapping for different sort fields
   */
  private getSortColumn(sortBy: string): string {
    const sortMapping: Record<string, string> = {
      firstName: 'user.firstName',
      lastName: 'user.lastName',
      email: 'user.email',
      createdAt: 'user.createdAt',
    };

    return sortMapping[sortBy] || 'user.firstName';
  }
}
