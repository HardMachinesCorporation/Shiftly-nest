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
  protected constructor(protected readonly repository: Repository<T>) {
    super(repository);
  }

  private async createEntityWithManager(
    data: DeepPartial<T>,
    manager: EntityManager
  ): Promise<T> {
    const repo = manager.getRepository(this.repository.target);
    const entity = repo.create(data);
    return await repo.save(entity);
  }

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
