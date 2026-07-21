/** Shared CRUD operations for entities stored by their string identifier. */
export interface Repository<TEntity> {
  get(id: string): Promise<TEntity | undefined>;
  list(): Promise<readonly TEntity[]>;
  save(entity: TEntity): Promise<void>;
  delete(id: string): Promise<void>;
}
