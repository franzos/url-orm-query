import { EntityMetadata, FindManyOptions, Repository } from "typeorm";
import { parseFilters, parseOrderBy, parseRelations } from "./extract";
import { Join } from "./enums/join";
import { Where, Relation, QueryParams, QueryParamsRaw, WhereWithRequire, QueryParamsUpdate } from "./query-params";
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

    /**
     * This is load but for subsequent calls, but can also load the first time
     * @param params 
     */
    loadAndMerge(params: QueryParamsUpdate<T>) {
        if (params.clearParams) {
            this.clearParams();
        }
        if (params.where) {
            const where: WhereWithRequire<T>[] = this.params.where.filter(filter => filter.require);
            params.where.forEach(filter => {
                if (filter.value !== '') {
                    const index = where.findIndex(f => f.key === filter.key);
                    if (index > -1 && !filter.require) {
                        where[index] = filter;
                    } else {
                        where.push(filter);
                    }
                }
            })
            this.params.where = where;
        }
        if (params.relations) {
            this.params.relations = params.relations.map(relation => {
                return {
                    name: relation.name,
                    join: relation.join || Join.LEFT_SELECT
                };
            })
        }
        if (params.limit) {
            this.params.limit = params.limit;
        }
        if (params.offset) {
            this.params.offset = params.offset;
        }
    }

    addFilter(filter: Where<T> | WhereWithRequire<T>) {
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

    clearParams() {
        this.params.where = [];
        this.params.offset = 0;
        this.params.orderBy = [];
    }

    /**
     * Dump query params to URL query string
     */
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

    /**
     * Load query params from URL query string
     * takes the URL as it comes
     * @param queryString 
     * @returns 
     */
    fromUrl(queryString: string) {
        const params = new URLSearchParams(queryString);
        for (const [key, value] of params) {
            switch (key) {
                case 'filters':
                    this.params.where = parseFilters<T>(value)
                    break
                case 'relations':
                    this.params.relations = parseRelations<T>(value)
                    break
                case 'orderBy':
                    this.params.orderBy = parseOrderBy<T>(value)
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
     * Load query params from controller Query (ParameterDecorator)
     * take the partially parsed query as it comes
     */
    fromController(queryData: QueryParamsRaw) {
        if (queryData.filters) {
            this.params.where = parseFilters<T>(queryData.filters)
        }
        if (queryData.relations) {
            this.params.relations = parseRelations<T>(queryData.relations)
        }
        if (queryData.orderBy) {
            this.params.orderBy = parseOrderBy<T>(queryData.orderBy)
        }
        if (queryData.limit) {
            this.params.limit = Number(queryData.limit)
        }
        if (queryData.offset) {
            this.params.offset = Number(queryData.offset)
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
                        query.leftJoinAndSelect(`${table}.${name}`, name)
                        break
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