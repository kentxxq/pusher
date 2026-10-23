import type { Entities, NewEntity, Page, TableName } from '../../shared/domain';
import type { StatisticsReader } from './statistics';

export type EntityFilter<T> = { [K in keyof T]?: T[K] | readonly T[K][] };
export interface ListOptions { limit?: number; offset?: number }

export interface EntityRepository<T extends { id: number }> {
  list(filter?: EntityFilter<T>, options?: ListOptions): Promise<T[]>;
  count(filter?: EntityFilter<T>): Promise<number>;
  insert(value: Omit<T, 'id'>): Promise<number>;
  update(id: number, value: Partial<Omit<T, 'id'>>): Promise<void>;
  remove(id: number): Promise<void>;
}
export type Repositories = { [K in TableName]: EntityRepository<Entities[K]> };

export class Repository {
  constructor(private readonly tables: Repositories, readonly close: () => Promise<void>, readonly statistics: StatisticsReader) {}
  private table<K extends TableName>(name: K): EntityRepository<Entities[K]> { return this.tables[name]; }
  all<K extends TableName>(name: K, filter?: EntityFilter<Entities[K]>, options?: ListOptions) { return this.table(name).list(filter, options); }
  async one<K extends TableName>(name: K, filter: EntityFilter<Entities[K]>) { return (await this.all(name, filter, { limit: 1 }))[0]; }
  async page<K extends TableName>(name: K, filter: EntityFilter<Entities[K]>, page = 1, pageSize = 20): Promise<Page<Entities[K]>> {
    page = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
    pageSize = Math.min(100, Math.max(1, Math.floor(pageSize)));
    const total = await this.table(name).count(filter);
    const offset = (page - 1) * pageSize;
    const items = offset < total ? await this.all(name, filter, { limit: pageSize, offset }) : [];
    return { items, total, page, pageSize };
  }
  insert<K extends TableName>(name: K, value: NewEntity<K>) { return this.table(name).insert(value); }
  update<K extends TableName>(name: K, id: number, value: Partial<NewEntity<K>>) { return this.table(name).update(id, value); }
  remove<K extends TableName>(name: K, id: number) { return this.table(name).remove(id); }
}

