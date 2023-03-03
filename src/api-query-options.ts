import { EntityMetadata, FindManyOptions, Repository } from "typeorm";
import { Operator, Join } from "./enums";
import { Where, Relation, QueryParams } from "./query-params";
import { columnMeta, operatorValue, splitQueryKey } from "./typeorm-operators";

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
                        const [key, operator, value] = filter.split('~')
                        return {
                            key,
                            operator: operator as Operator,
                            value
                            // TODO: add type
                        } as any
                    })
                    break
                case 'relations':
                    this.params.relations = value.split(',').map(relation => {
                        const [name, join] = relation.split('~')
                        return {
                            name,
                            join: join as Join
                            // TODO: add type
                        } as any
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
            for (const filter of this.params.where) {
                const keys = splitQueryKey(filter.key as string)
                const firstKey = keys[0]
                const meta = columnMeta(firstKey, repo.metadata)
                // TODO: Support multiple queries
                if (meta.isRelation) {
                    query.where(`${firstKey}.${keys[1]} = :${keys[1]}`, { [keys[1]]: filter.value })
                } else if (meta.isJsonb) {
                    query.where(`${table}.${firstKey}->>'${keys[1]}' = :${keys[1]}`, { [keys[1]]: filter.value })
                } else {
                    switch(filter.operator) {
                        case Operator.EQUAL:
                            query.where(`${table}.${firstKey} = :${firstKey}`, { [firstKey]: filter.value })
                            break
                        case Operator.NOT:
                            query.where(`${table}.${firstKey} != :${firstKey}`, { [firstKey]: filter.value })
                            break
                        case Operator.LIKE:
                            query.where(`${table}.${firstKey} LIKE :${firstKey}`, { [firstKey]: `%${filter.value}%` })
                            break
                        case Operator.ILIKE:
                            query.where(`LOWER(${table}.${firstKey}) LIKE :${firstKey}`, { [firstKey]: `%${filter.value}%` })
                            break
                        case Operator.BETWEEN:
                            const betweenValue = (filter.value as string).split(',')
                            if (betweenValue.length !== 2) {
                                throw new Error(`Invalid value for BETWEEN operator. Expected 2 values, got ${filter.value}`)
                            }
                            query.where(`${table}.${firstKey} BETWEEN :FROM${firstKey} AND :TO${firstKey}`, { 
                                [`FROM${firstKey}`]: betweenValue[0], [`TO${firstKey}`]: betweenValue[1] 
                            })
                            break
                        // TODO: Like, ILike, etc
                        case Operator.IN:
                            const inValue = (filter.value as string).split(',')
                            query.where(`${table}.${firstKey} IN (:...${`${firstKey}Ids`})`, { [`${firstKey}Ids`]: inValue })
                            break
                        case Operator.NOT_IN:
                            const notInValue = (filter.value as string).split(',')
                            query.where(`${table}.${firstKey} NOT IN (:...${`${firstKey}Ids`})`, { [`${firstKey}Ids`]: notInValue })
                            break
                        case Operator.LESS_THAN:
                            query.where(`${table}.${firstKey} < :${firstKey}`, { [firstKey]: filter.value })
                            break
                        case Operator.LESS_THAN_OR_EQUAL:
                            query.where(`${table}.${firstKey} <= :${firstKey}`, { [firstKey]: filter.value })
                            break
                        case Operator.MORE_THAN:
                            query.where(`${table}.${firstKey} > :${firstKey}`, { [firstKey]: filter.value })
                            break
                        case Operator.MORE_THAN_OR_EQUAL:
                            query.where(`${table}.${firstKey} >= :${firstKey}`, { [firstKey]: filter.value })
                            break
                        default:
                            throw new Error(`Operator ${filter.operator} not supported`)
                    }
                }
            }
        }
        if (this.params.relations.length > 0) {
            for (const relation of this.params.relations) {
                const name = relation.name as string
                query.leftJoinAndSelect(`${table}.${name}`, name)
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