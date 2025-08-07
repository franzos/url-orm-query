import { Join } from "./enums/join";
import { QueryBuilder } from "./query-builder";
import { QueryParams, QueryParamsBuilder, QueryParamsRaw, QueryParamsUpdate, Relation, Where, WhereGroup, WhereWithRequire } from "./query-params";
import { QueryParser } from "./query-parser";
import { QueryRestrictions } from "./query-restrictions";
import { EntityMetadata, Repository } from "./typeorm-interfaces";
import { applyRelationRestrictions, applyWhereGroupRestrictions, applyWhereRestrictions, validateLimit, validateOffset, validateOrderBy, validateRelation, validateWhere, validateAllRestrictions, validateWhereFieldRestrictions, validateRelationRestrictions } from "./validation";

export class ApiQueryOptions<T> {
    public params: QueryParamsBuilder<T>
    private restrictions?: QueryRestrictions

    constructor(params?: QueryParams<T>, restrictions?: QueryRestrictions) {
        this.params = {
            where: [],
            whereGroups: [],
            relations: [],
            limit: 10,
            offset: 0,
            orderBy: []
        }

        this.restrictions = restrictions

        if (params) {
            this.load(params)
        }

    }

    load(params: QueryParams<T>) {
        // Validate input format
        if (params.where) {
            params.where.forEach(where => validateWhere(where));
        }
        if (params.relations) {
            params.relations.forEach(relation => validateRelation(relation));
        }
        if (params.whereGroups) {
            params.whereGroups.forEach(group => {
                group.conditions.forEach(cond => validateWhere(cond));
            });
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

        // Collect all fields for restriction validation
        const allWhereFields: string[] = [];
        const allRelations: string[] = [];

        if (params.where) {
            allWhereFields.push(...params.where.map(w => typeof w.key === 'string' ? w.key : String(w.key)));
        }
        if (params.whereGroups) {
            for (const group of params.whereGroups) {
                allWhereFields.push(...group.conditions.map(c => typeof c.key === 'string' ? c.key : String(c.key)));
            }
        }
        if (params.relations) {
            allRelations.push(...params.relations.map(r => typeof r.name === 'string' ? r.name : String(r.name)));
        }

        // Validate all restrictions at once (throws aggregated error if strict=true)
        validateAllRestrictions(allWhereFields, allRelations, this.restrictions);

        // Apply restrictions
        this.params = {
            where: applyWhereRestrictions(params.where || [], this.restrictions),
            whereGroups: applyWhereGroupRestrictions(params.whereGroups || [], this.restrictions),
            relations: applyRelationRestrictions(params.relations || [], this.restrictions),
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
        // Validate input format
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

        // Collect all fields for restriction validation
        const allWhereFields: string[] = [];
        const allRelations: string[] = [];

        if (params.where) {
            allWhereFields.push(...params.where.map(w => typeof w.key === 'string' ? w.key : String(w.key)));
        }
        if (params.relations) {
            allRelations.push(...params.relations.map(r => typeof r.name === 'string' ? r.name : String(r.name)));
        }

        // Validate all restrictions at once
        validateAllRestrictions(allWhereFields, allRelations, this.restrictions);

        if (params.clearParams) {
            this.clearParams();
        }
        if (params.where) {
            const where: WhereWithRequire<T>[] = this.params.where.filter(filter => filter.require);
            const filteredWhere = applyWhereRestrictions(params.where, this.restrictions) as WhereWithRequire<T>[];
            
            filteredWhere.forEach(filter => {
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
            const filteredRelations = applyRelationRestrictions(params.relations, this.restrictions);
            this.params.relations = filteredRelations.map(relation => {
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
        validateWhereFieldRestrictions(typeof filter.key === 'string' ? filter.key : String(filter.key), this.restrictions);
        
        const filtered = applyWhereRestrictions([filter], this.restrictions);
        if (filtered.length > 0) {
            this.params.where.push(filtered[0]);
        }
        return this
    }

    addRelation(relation: Relation<T>) {
        validateRelation(relation);
        validateRelationRestrictions(typeof relation.name === 'string' ? relation.name : String(relation.name), this.restrictions);
        
        const filtered = applyRelationRestrictions([relation], this.restrictions);
        if (filtered.length > 0) {
            this.params.relations.push(filtered[0]);
        }
        return this
    }

    addWhereGroup(group: WhereGroup<T>) {
        group.conditions.forEach(cond => {
            validateWhere(cond);
            validateWhereFieldRestrictions(typeof cond.key === 'string' ? cond.key : String(cond.key), this.restrictions);
        });
        
        const filtered = applyWhereGroupRestrictions([group], this.restrictions);
        if (filtered.length > 0) {
            this.params.whereGroups.push(filtered[0]);
        }
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
     * @param restrictions Optional query restrictions to apply
     * @returns 
     */
    fromUrl(queryString: string, restrictions?: QueryRestrictions) {
        if (restrictions) {
            this.restrictions = restrictions;
        }
        this.params = QueryParser.fromUrl<T>(queryString, this.restrictions);
        return this
    }

    /**
     * Load query params from controller Query (ParameterDecorator)
     * take the partially parsed query as it comes
     * @param queryData 
     * @param restrictions Optional query restrictions to apply
     */
    fromController(queryData: QueryParamsRaw, restrictions?: QueryRestrictions) {
        if (restrictions) {
            this.restrictions = restrictions;
        }
        this.params = QueryParser.fromController<T>(queryData, this.restrictions);
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