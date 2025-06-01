import { FindOptionsWhere } from 'typeorm';

export interface IResultWithPagination<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface IPagination<T> {
  page: number;
  limit: number;
  filter?: FindOptionsWhere<T>;
}
