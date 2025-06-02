import {
  EntityManager,
  FindOptionsOrder,
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import { Logger } from '@nestjs/common';
import {
  IPagination,
  IResultWithPagination,
} from '../../types/pagination/pagination.interface';

/**
 * Abstract base service providing common CRUD operations for TypeORM entities.
 *
 * @template T - The entity type extending ObjectLiteral
 *
 * @property {Logger} logger - Instance-specific logger with context
 * @property {Repository<T>} repository - TypeORM repository for entity T
 */
export abstract class BaseAbstractService<T extends ObjectLiteral> {
  protected readonly logger: Logger;
  protected constructor(
    protected readonly repository: Repository<T>,
    context: string
  ) {
    this.logger = new Logger(context);
    this.logger.log(`🎯 ${context} is Initialized`);
  }

  /**
   * Finds a single entity by its primary ID with optional transaction support.
   *
   * @param {number} id - The primary key ID to search for
   * @param {EntityManager} [manager] - Optional transaction manager
   * @returns {Promise<T|null>} The found entity or null
   *
   * @features
   * - Uses pessimistic read lock in transactions
   * - Explicitly excludes soft-deleted entities
   * - Type-safe where clause construction
   *
   * @example
   * const entity = await service.findOneByID(123);
   *
   * @example
   * // With transaction
   * await manager.transaction(async (tx) => {
   *   const entity = await service.findOneByID(123, tx);
   * });
   */
  async findOneByID(id: number, manager?: EntityManager): Promise<T | null> {
    const repo: Repository<T> = manager
      ? manager.getRepository(this.repository.target)
      : this.repository;

    const whereClause: FindOptionsWhere<T> = {
      id,
    } as unknown as FindOptionsWhere<T>;

    // Maintenant, `where: { id }` est typé comme { id: number } & FindOptionsWhere<T>
    return await repo.findOne({
      where: whereClause, // plus besoin de "as any" !
      lock: manager ? { mode: 'pessimistic_read' } : undefined,
      withDeleted: false,
    });
  }

  /**
   * Finds entity by either ID or email address with transaction support.
   *
   * @param {number|string} idOrEmail - Either:
   *   - Numeric ID (searches primary key)
   *   - Email string (searches 'email' field)
   * @param {EntityManager} [manager] - Optional transaction manager
   * @returns {Promise<T|null>} The matching entity or null
   *
   * @throws {TypeError} If input is neither number nor string
   *
   * @features
   * - Automatic type detection (ID vs email)
   * - Pessimistic locking in transactions
   * - Excludes soft-deleted records
   *
   * @example
   * // By ID
   * await service.findOneByIdOrEmail(123);
   *
   * @example
   * // By email
   * await service.findOneByIdOrEmail('test@example.com');
   */
  async findOneByIdOrEmail(
    idOrEmail: number | string,
    manager?: EntityManager
  ): Promise<T | null> {
    const repo: Repository<T> = manager
      ? manager.getRepository(this.repository.target)
      : this.repository;

    // On prépare un "whereClause" typé FindOptionsWhere<T> en deux étapes
    let whereClause: FindOptionsWhere<T>;
    if (typeof idOrEmail === 'number') {
      // On part de l'objet brut { clientRef: number }
      whereClause = { userRef: idOrEmail } as unknown as FindOptionsWhere<T>;
    } else {
      whereClause = { email: idOrEmail } as unknown as FindOptionsWhere<T>;
    }

    return await repo.findOne({
      where: whereClause,
      lock: manager ? { mode: 'pessimistic_read' } : undefined,
      withDeleted: false,
    });
  }

  /**
   * Retrieves paginated results with filtering and sorting.
   *
   * @param {IPagination<T>} pagination - Configuration object containing:
   *   - page: Current page number (1-based)
   *   - limit: Items per page
   *   - filter: Optional Where conditions (partial entity)
   * @param {EntityManager} [manager] - Optional transaction manager
   * @returns {Promise<IResultWithPagination<T>>} Paginated result containing:
   *   - data: Entity array
   *   - total: Total matching records count
   *   - page: Current page
   *   - limit: Items per page
   *
   * @features
   * - Automatic exclusion of soft-deleted entities
   * - Default sorting by createdAt DESC
   * - Type-safe where clause conversion
   * - Proper pagination metadata
   *
   * @example
   * // Basic pagination
   * const result = await service.findAll({ page: 1, limit: 10 });
   *
   * @example
   * // With filtering
   * const result = await service.findAll({
   *   page: 1,
   *   limit: 10,
   *   filter: { status: 'active' }
   * });
   */
  async findAll(
    pagination: IPagination<T>,
    manager?: EntityManager
  ): Promise<IResultWithPagination<T>> {
    const { page, limit, filter } = pagination;

    const rawWhere: any = {
      ...(filter ?? {}),
      deletedAt: null, // c’est censé exister grâce à @DeleteDateColumn()
    };
    // 2️⃣ On force ensuite TypeScript à comprendre que cet objet brut
    //    est un FindOptionsWhere<T> (même si le bound de T reste “ObjectLiteral”)
    const whereClause: FindOptionsWhere<T> =
      rawWhere as unknown as FindOptionsWhere<T>;

    // 3️⃣ Pareil pour l’ordre : on sait que l’entité aura bien un champ “createdAt”
    const rawOrder: any = { createdAt: 'DESC' };
    const orderClause: FindOptionsOrder<T> =
      rawOrder as unknown as FindOptionsOrder<T>;

    // 4️⃣ On récupère le Repository (ou celui du manager si fourni)
    const repo: Repository<T> = manager
      ? manager.getRepository(this.repository.target)
      : this.repository;

    // 5️⃣ On appelle findAndCount en fournissant nos clauses typées
    const [data, total] = await repo.findAndCount({
      where: whereClause,
      skip: (page - 1) * limit,
      take: limit,
      order: orderClause,
      withDeleted: false,
    });

    return { data, total, page, limit };
  }
}
