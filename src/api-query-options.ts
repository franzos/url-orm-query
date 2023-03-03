import { EntityMetadata, FindManyOptions, Repository } from "typeorm";
import { Operator, Join } from "./enums";
import { Where, Relation, QueryParams } from "./query-params";
import { columnMeta, operatorValue, queryBuilderAssembly, splitQueryKey } from "./typeorm-operators";

export class ApiQueryOptions<T> {
    public params: QueryParams<T>

    constructor(params?: QueryParams<T>) {
        if (params) {
            this.load(params)
        } else {
            this.params = {
                where: [],
                relations: [],
                limit: 10,
                offset: 0,
                orderBy: []
            }
        }
    }

    load(params: QueryParams<T>) {
        this.params = {
            where: params.where || [],
            relations: params.relations || [],
            limit: params.limit || 10,
            offset: params.offset || 0,
            orderBy: params.orderBy || []
        };
    }

    addFilter(filter: Where<T>) {
        this.params.where.push(filter);
    }

    addRelation(relation: Relation<T>) {
        this.params.relations.push(relation);
    }

    setLimit(limit: number) {
        this.params.limit = limit;
    }

    setOffset(offset: number) {
        this.params.offset = offset;
    }

    toUrl() {
        let params = []
        if (this.params.where.length > 0) {
            params.push(`filters=${this.params.where.map(filter => `${filter.key}~${filter.operator}~${filter.value}`).join(',')}`)
        }
        if (this.params.relations.length > 0) {
            params.push(`relations=${this.params.relations.map(relation => `${relation.name}~${relation.join}`).join(',')}`);
        }
        if (this.params.orderBy.length > 0) {
            params.push(`orderBy=${this.params.orderBy.map(orderBy => `${orderBy.key}~${orderBy.direction}`).join(',')}`);
        }
        if (this.params.limit) {
            params.push(`limit=${this.params.limit}`);
        }
        if (this.params.offset) {
            params.push(`offset=${this.params.offset}`);
        }
        return '?' + params.join('&');
    }

    fromUrl(queryString: string) {
        const params = new URLSearchParams(queryString);
        for (const [key, value] of params) {
            switch (key) {
                case 'filters':
                    this.params.where = value.split(',').map(filter => {
                        const filters = filter.split('~')
                        if (filters.length === 2) {
                            const [key, value] = filters
                            return {
                                key: key as T[keyof T],
                                operator: Operator.EQUAL,
                                value: value as T[keyof T]
                            }
                        } else {
                            const [key, operator, value] = filters
                            return {
                                key: key as T[keyof T],
                                operator: operator as Operator,
                                value: value as T[keyof T]
                            }
                        }
                    })
                    break
                case 'relations':
                    this.params.relations = value.split(',').map(relation => {
                        const relations = relation.split('~')
                        // If no join type is specified, default to LEFT_SELECT
                        if (relations.length === 1) {
                            return {
                                name: relations[0],
                                join: Join.LEFT_SELECT
                            }
                        } else {
                            const [name, join] = relations
                            return {
                                name,
                                join: join as Join
                                // TODO: add type
                            } as any
                        }
                    })
                    break
                case 'orderBy':
                    this.params.orderBy = value.split(',').map(orderBy => {
                        const [key, direction] = orderBy.split('~')
                        return {
                            key,
                            direction
                        } as any
                    })
                    break
                case 'limit':
                    this.params.limit = parseInt(value)
                    break
                case 'offset':
                    this.params.offset = parseInt(value)
                    break
            }
        }
        return this
    }

    /**
     * Typeorm find query (not using query builder)
     * - supports a depth of 2; for ex. (organization.)address.street
     * - Does not support jsonb
     * @param entityMeta 
     * @returns 
     */
    toTypeOrmQuery(entityMeta: EntityMetadata) {
        let query: FindManyOptions<T> = {};
        if (this.params.where.length > 0) {
            for (const filter of this.params.where) {
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
        if (this.params.relations.length > 0) {
            for (const relation of this.params.relations) {
                if (!query.relations) {
                    query.relations = {};
                }
                const name = relation.name as string
                query.relations[name] = true
            }
        }
        if (this.params.orderBy) {
            query.order = {};
            for (const orderBy of this.params.orderBy) {
                query.order[orderBy.key as string] = orderBy.direction;
            }
        }
        if (this.params.limit) {
            query.take = this.params.limit;
        }
        if (this.params.offset) {
            query.skip = this.params.offset;
        }
        return query;
    }

    toTypeormQueryBuilder(repo: Repository<T>) {
        const table = repo.metadata.tableName
        let query = repo.createQueryBuilder(table)
        if (this.params.where.length > 0) {
            for (let i = 0; i < this.params.where.length; i++) {

                const queryFunction = i === 0 ? 'where' : 'andWhere'

                const queryParam = queryBuilderAssembly(
                    repo,
                    this.params.where[i],
                )

                query[queryFunction](queryParam[0], queryParam[1])
            }
        }
        if (this.params.relations.length > 0) {
            for (const relation of this.params.relations) {
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
                        throw new Error(`Join type ${relation.join} not supported`)
                }

            }
        }
        if (this.params.orderBy.length > 0) {
            for (const orderBy of this.params.orderBy) {
                query.addOrderBy(`${table}.${orderBy.key as string}`, orderBy.direction)
            }
        }
        if (this.params.limit) {
            query.take(this.params.limit);
        }
        if (this.params.offset) {
            query.skip(this.params.offset);
        }
        return query
    }
}