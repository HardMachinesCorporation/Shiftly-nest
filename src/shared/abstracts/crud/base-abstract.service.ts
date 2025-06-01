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

export abstract class BaseAbstractService<T extends ObjectLiteral> {
  private readonly logger: Logger = new Logger(BaseAbstractService.name);
  protected constructor(protected readonly repository: Repository<T>) {
    this.logger.log('🎯 Abstract Base service is Initialized');
  }

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
      whereClause = { clientRef: idOrEmail } as unknown as FindOptionsWhere<T>;
    } else {
      whereClause = { email: idOrEmail } as unknown as FindOptionsWhere<T>;
    }

    return await repo.findOne({
      where: whereClause,
      lock: manager ? { mode: 'pessimistic_read' } : undefined,
      withDeleted: false,
    });
  }

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
