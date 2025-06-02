import { FindOptionsWhere } from 'typeorm';

export interface IResultWithPagination<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Pagination configuration object
 *
 * @interface
 * @template T - Entity type
 *
 * @property {number} page - 1-based page number
 * @property {number} limit - Items per page
 * @property {Partial<T>} [filter] - Optional filtering conditions
 */
export interface IPagination<T> {
  page: number;
  limit: number;
  filter?: FindOptionsWhere<T>;
}
