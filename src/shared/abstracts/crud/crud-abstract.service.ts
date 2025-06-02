import {
  DeepPartial,
  DeleteResult,
  EntityManager,
  ObjectLiteral,
  Repository,
  UpdateResult,
} from 'typeorm';
import { BaseAbstractService } from './base-abstract.service';
import { HttpException, HttpStatus } from '@nestjs/common';

export interface DeleteResponse {
  message: string;
  success: boolean;
  date: Date;
}

export abstract class CrudAbstractService<
  T extends ObjectLiteral,
> extends BaseAbstractService<T> {
  protected constructor(
    protected readonly repository: Repository<T>,
    context: string
  ) {
    super(repository, context);
  }

  /**
   * Creates an entity within a specific EntityManager transaction context.
   *
   * @private
   * @param {DeepPartial<T>} data - Partial entity data including required fields
   * @param {EntityManager} manager - The EntityManager instance to use for the operation
   * @returns {Promise<T>} The newly created and saved entity
   * @throws {Error} If entity creation or saving fails
   */
  private async createEntityWithManager(
    data: DeepPartial<T>,
    manager: EntityManager
  ): Promise<T> {
    const repo = manager.getRepository(this.repository.target);
    const entity = repo.create(data);
    return await repo.save(entity);
  }

  /**
   * Creates an entity either within an existing transaction or a new transaction.
   *
   * @param {DeepPartial<T>} data - Partial entity data including required fields
   * @param {EntityManager} [manager] - Optional EntityManager for existing transaction
   * @returns {Promise<T>} The newly created and saved entity
   * @throws {Error} If entity creation or saving fails
   * @example
   * // With new transaction
   * const entity = await service.createEntity({ name: 'New' });
   *
   * @example
   * // Within existing transaction
   * await manager.transaction(async (tx) => {
   *   const entity = await service.createEntity({ name: 'New' }, tx);
   * });
   */
  async createEntity(
    data: DeepPartial<T>,
    manager?: EntityManager
  ): Promise<T> {
    return manager
      ? await this.createEntityWithManager(data, manager)
      : await this.repository.manager.transaction((trxManager) =>
          this.createEntityWithManager(data, trxManager)
        );
  }

  /**
   * Updates an entity within a specific EntityManager transaction context.
   *
   * @private
   * @param {number} id - ID of the entity to update
   * @param {Partial<T>} data - Partial entity data with fields to update
   * @param {EntityManager} manager - The EntityManager instance to use
   * @returns {Promise<T|null>} The updated entity or null if not found
   * @throws {HttpException} 404 if entity doesn't exist
   * @throws {Error} If update operation fails
   */
  private async updateEntityWithManager(
    id: number,
    data: Partial<T>,
    manager: EntityManager
  ): Promise<T | null> {
    const repo: Repository<T> = manager.getRepository(this.repository.target);
    const entity: T | null = await this.findOneByID(id, manager);
    if (!entity) {
      throw new HttpException(
        {
          message: `⚠️ Failed to update Entity with id ${id}. Entity was updated or was deleted`,
        },
        HttpStatus.NOT_FOUND
      );
    }
    const result: UpdateResult = await repo.update(id, data);
    this.assertAffected(result, id);
    return await this.findOneByID(id);
  }

  /**
   * Validates that an update/delete operation affected the expected number of rows.
   *
   * @private
   * @param {UpdateResult | DeleteResult} result - The TypeORM operation result
   * @param {number} id - ID of the affected entity
   * @returns {void}
   * @throws {HttpException}
   *   - 404 if no rows were affected during update
   *   - 409 if no rows were affected during delete
   */
  private assertAffected(
    result: UpdateResult | DeleteResult,
    id: number
  ): void {
    // Normalise le nombre de lignes affectées.
    const affectedCount = result.affected ?? 0;

    if (result instanceof UpdateResult) {
      if (affectedCount === 0) {
        throw new HttpException(
          {
            message: `⚠️ Impossible de mettre à jour l’entité (id ${id}). L’entité est introuvable ou a déjà été supprimée.`,
          },
          HttpStatus.NOT_FOUND
        );
      }
    } else {
      // On considère que c’est un DeleteResult (ou un autre type similaire).
      if (affectedCount === 0) {
        throw new HttpException(
          {
            message: `⚠️ Impossible de supprimer l’entité (id ${id}). L’entité est introuvable ou en cours d’utilisation (contraintes).`,
          },
          HttpStatus.CONFLICT
        );
      }
    }
  }

  /**
   * Updates an entity either within an existing transaction or a new transaction.
   *
   * @param {number} id - ID of the entity to update
   * @param {Partial<T>} data - Partial entity data with fields to update
   * @param {EntityManager} [manager] - Optional EntityManager for existing transaction
   * @returns {Promise<T|null>} The updated entity or null if not found
   * @throws {HttpException}
   *   - 404 if entity doesn't exist
   *   - 409 if delete constraints prevent operation
   * @example
   * // With new transaction
   * const updated = await service.updateEntity(1, { name: 'Updated' });
   *
   * @example
   * // Within existing transaction
   * await manager.transaction(async (tx) => {
   *   const updated = await service.updateEntity(1, { name: 'Updated' }, tx);
   * });
   */
  async updateEntity(
    id: number,
    data: Partial<T>,
    manager?: EntityManager
  ): Promise<T | null> {
    return manager
      ? await this.updateEntityWithManager(id, data, manager)
      : this.repository.manager.transaction((trxManager) =>
          this.updateEntityWithManager(id, data, trxManager)
        );
  }

  /**
   * Deletes an entity within a specific EntityManager transaction context.
   *
   * @private
   * @param {number} id - ID of the entity to delete
   * @param {EntityManager} manager - The EntityManager instance to use
   * @returns {Promise<DeleteResponse>} Operation success confirmation
   * @throws {HttpException}
   *   - 404 if entity doesn't exist
   *   - 409 if delete constraints prevent operation
   */
  async deleteEntityWithManager(
    id: number,
    manager: EntityManager
  ): Promise<DeleteResponse> {
    const repo = manager.getRepository<T>(this.repository.target);
    const result: DeleteResult = await repo.delete(id);
    this.assertAffected(result, id);
    return {
      message: `Entity with ID ${id} was successfully deleted.`,
      success: true,
      date: new Date(),
    };
  }

  /**
   * Deletes an entity either within an existing transaction or a new transaction.
   *
   * @param {number} id - ID of the entity to delete
   * @param {EntityManager} [manager] - Optional EntityManager for existing transaction
   * @returns {Promise<DeleteResponse>} Operation success confirmation
   * @throws {HttpException}
   *   - 404 if entity doesn't exist
   *   - 409 if delete constraints prevent operation
   * @example
   * // With new transaction
   * const result = await service.deleteEntity(1);
   *
   * @example
   * // Within existing transaction
   * await manager.transaction(async (tx) => {
   *   const result = await service.deleteEntity(1, tx);
   * });
   */
  async deleteEntity(
    id: number,
    manager?: EntityManager
  ): Promise<DeleteResponse> {
    return manager
      ? await this.deleteEntityWithManager(id, manager)
      : await this.repository.manager.transaction((trxManager) =>
          this.deleteEntityWithManager(id, trxManager)
        );
  }
}
