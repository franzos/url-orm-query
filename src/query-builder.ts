import { Join } from "./enums/join";
import { columnMeta, operatorValue, queryBuilderAssembly, splitQueryKey } from "./operators";
import { QueryParamsBuilder } from "./query-params";
import { EntityMetadata, FindManyOptions, Repository } from "./typeorm-interfaces";
import { validateFieldExists, ValidationError } from "./validation";

export class QueryBuilder<T> {
    /**
     * Convert query parameters to TypeORM find options
     * - supports a depth of 2; for ex. (organization.)address.street
     * - Does not support jsonb
     * @param params Query parameters
     * @param entityMeta Entity metadata
     * @returns TypeORM find options
     */
    static toFindOptions<T>(params: QueryParamsBuilder<T>, entityMeta: EntityMetadata): FindManyOptions<T> {
        let query: FindManyOptions<T> = {};
        
        if (params.where.length > 0) {
            for (const filter of params.where) {
                try {
                    validateFieldExists(filter.key as string, entityMeta);
                } catch (error) {
                    if (error instanceof ValidationError) {
                        throw error;
                    }
                    throw new ValidationError(`Invalid field: ${String(filter.key)}`);
                }
                
                if (!query.where) {
                    query.where = {};
                }
                const keys = splitQueryKey(filter.key as string)
                const firstKey = keys[0]
                const meta = columnMeta(firstKey, entityMeta)
                if (meta.isRelation) {
                    query.where[firstKey] = {
                        [keys[1]]: operatorValue<T>(filter)
                    }
                } else if (meta.isJsonb) {
                    query.where[firstKey] = {
                        [keys[1]]: operatorValue<T>(filter)
                    }
                } else {
                    query.where[firstKey] = operatorValue<T>(filter)
                }
            }
        }
        
        if (params.relations.length > 0) {
            for (const relation of params.relations) {
                if (!query.relations) {
                    query.relations = {};
                }
                const name = relation.name as string
                query.relations[name] = true
            }
        }
        
        if (params.orderBy) {
            query.order = {};
            for (const orderBy of params.orderBy) {
                query.order[orderBy.key as string] = orderBy.direction;
            }
        }
        
        if (params.limit) {
            query.take = params.limit;
        }
        
        if (params.offset) {
            query.skip = params.offset;
        }
        
        return query;
    }

    /**
     * Convert query parameters to TypeORM query builder
     * @param params Query parameters
     * @param repo Repository instance
     * @returns TypeORM query builder
     */
    static toQueryBuilder<T>(params: QueryParamsBuilder<T>, repo: Repository<T>) {
        const table = repo.metadata.tableName
        let query = repo.createQueryBuilder(table)
        
        if (params.where.length > 0) {
            for (let i = 0; i < params.where.length; i++) {
                const queryFunction = i === 0 ? 'where' : 'andWhere'

                const queryParam = queryBuilderAssembly(
                    repo,
                    params.where[i],
                    i
                )

                query[queryFunction](queryParam[0], queryParam[1])
            }
        }
        
        if (params.relations.length > 0) {
            for (const relation of params.relations) {
                const name = relation.name as string
                switch (relation.join) {
                    case Join.LEFT_SELECT:
                        query.leftJoinAndSelect(`${table}.${name}`, name)
                        break
                    case Join.LEFT:
                        query.leftJoin(`${table}.${name}`, name)
                        break
                    case Join.INNER_SELECT:
                        query.innerJoinAndSelect(`${table}.${name}`, name)
                        break
                    case Join.INNER:
                        query.innerJoin(`${table}.${name}`, name)
                        break
                    default:
                        query.leftJoinAndSelect(`${table}.${name}`, name)
                        break
                }
            }
        }
        
        if (params.orderBy.length > 0) {
            for (const orderBy of params.orderBy) {
                query.addOrderBy(`${table}.${orderBy.key as string}`, orderBy.direction)
            }
        }
        
        if (params.limit) {
            query.take(params.limit);
        }
        
        if (params.offset) {
            query.skip(params.offset);
        }
        
        return query
    }
}