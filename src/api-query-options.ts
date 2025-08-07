import { Join } from "./enums/join";
import { QueryBuilder } from "./query-builder";
import { QueryParams, QueryParamsBuilder, QueryParamsRaw, QueryParamsUpdate, Relation, Where, WhereWithRequire, WhereGroup } from "./query-params";
import { QueryParser } from "./query-parser";
import { EntityMetadata, Repository } from "./typeorm-interfaces";
import { validateRelation, validateWhere, validateOrderBy, validateLimit, validateOffset } from "./validation";

export class ApiQueryOptions<T> {
    public params: QueryParamsBuilder<T>

    constructor(params?: QueryParams<T>) {
        this.params = {
            where: [],
            whereGroups: [],
            relations: [],
            limit: 10,
            offset: 0,
            orderBy: []
        }

        if (params) {
            this.load(params)
        }

    }

    load(params: QueryParams<T>) {
        // Validate input parameters
        if (params.where) {
            params.where.forEach(where => validateWhere(where));
        }
        if (params.relations) {
            params.relations.forEach(relation => validateRelation(relation));
        }
        if (params.orderBy) {
            params.orderBy.forEach(orderBy => validateOrderBy(orderBy));
        }
        if (params.limit !== undefined) {
            validateLimit(params.limit);
        }
        if (params.offset !== undefined) {
            validateOffset(params.offset);
        }

        this.params = {
            where: params.where || [],
            whereGroups: params.whereGroups || [],
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
        // Validate input parameters
        if (params.where) {
            params.where.forEach(where => validateWhere(where));
        }
        if (params.relations) {
            params.relations.forEach(relation => validateRelation(relation));
        }
        if (params.orderBy) {
            params.orderBy.forEach(orderBy => validateOrderBy(orderBy));
        }
        if (params.limit !== undefined) {
            validateLimit(params.limit);
        }
        if (params.offset !== undefined) {
            validateOffset(params.offset);
        }

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
        if (params.orderBy) {
            this.params.orderBy = params.orderBy;
        }
        if (params.limit) {
            this.params.limit = params.limit;
        }
        if (params.offset) {
            this.params.offset = params.offset;
        }
    }

    addFilter(filter: Where<T> | WhereWithRequire<T>) {
        validateWhere(filter);
        this.params.where.push(filter);
        return this
    }

    addRelation(relation: Relation<T>) {
        validateRelation(relation);
        this.params.relations.push(relation);
        return this
    }

    addWhereGroup(group: WhereGroup<T>) {
        group.conditions.forEach(cond => validateWhere(cond));
        this.params.whereGroups.push(group);
        return this
    }

    setLimit(limit: number) {
        validateLimit(limit);
        this.params.limit = limit;
        return this
    }

    setOffset(offset: number) {
        validateOffset(offset);
        this.params.offset = offset;
        return this
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
            params.push(`filters=${this.params.where.map(filter => `${String(filter.key)}~${filter.operator}~${filter.value}`).join(',')}`)
        }
        if (this.params.whereGroups.length > 0) {
            params.push(`filterGroups=${this.params.whereGroups.map(group => 
                `${group.logic}~${group.conditions.map(cond => `${String(cond.key)}~${cond.operator}~${cond.value}`).join(',')}`
            ).join('|')}`)
        }
        if (this.params.relations.length > 0) {
            params.push(`relations=${this.params.relations.map(relation => `${String(relation.name)}~${relation.join ?? Join.LEFT_SELECT}`).join(',')}`);
        }
        if (this.params.orderBy.length > 0) {
            params.push(`orderBy=${this.params.orderBy.map(orderBy => `${String(orderBy.key)}~${orderBy.direction}`).join(',')}`);
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
        this.params = QueryParser.fromUrl<T>(queryString);
        return this
    }

    /**
     * Load query params from controller Query (ParameterDecorator)
     * take the partially parsed query as it comes
     */
    fromController(queryData: QueryParamsRaw) {
        this.params = QueryParser.fromController<T>(queryData);
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
        return QueryBuilder.toFindOptions<T>(this.params, entityMeta);
    }

    toTypeOrmQueryBuilder(repo: Repository<T>) {
        return QueryBuilder.toQueryBuilder<T>(this.params, repo);
    }

    /**
     * @deprecated Use toTypeOrmQueryBuilder instead
     */
    toTypeormQueryBuilder(repo: Repository<T>) {
        return this.toTypeOrmQueryBuilder(repo);
    }
}