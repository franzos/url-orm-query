import { parseFilters, parseOrderBy, parseRelations } from "./extract";
import { QueryParamsBuilder, QueryParamsRaw } from "./query-params";
import { QueryRestrictions } from "./query-restrictions";
import { validateAndApplyRestrictions } from "./validation";

export class QueryParser<T> {
    static fromUrl<T>(queryString: string, restrictions?: QueryRestrictions): QueryParamsBuilder<T> {
        const params: QueryParamsBuilder<T> = {
            where: [],
            whereGroups: [],
            relations: [],
            limit: 10,
            offset: 0,
            orderBy: []
        };

        const urlParams = new URLSearchParams(queryString);
        for (const [key, value] of urlParams) {
            switch (key) {
                case 'filters':
                    params.where = parseFilters<T>(value);
                    break
                case 'filterGroups':
                    // Parse group format: OR~key~op~value,key~op~value|AND~key~op~value
                    const groups = value.split('|');
                    params.whereGroups = groups.map(groupStr => {
                        const parts = groupStr.split('~', 2);
                        const logic = parts[0] as 'AND' | 'OR';
                        const conditionsStr = groupStr.substring(parts[0].length + 1);
                        const conditions = parseFilters<T>(conditionsStr);
                        return { logic, conditions };
                    });
                    break
                case 'relations':
                    params.relations = parseRelations<T>(value);
                    break
                case 'orderBy':
                    params.orderBy = parseOrderBy<T>(value)
                    break
                case 'limit':
                    const parsedLimit = parseInt(value);
                    if (isNaN(parsedLimit) || parsedLimit < 0) {
                        throw new Error(`Invalid limit value: ${value}. Must be a positive integer.`);
                    }
                    params.limit = parsedLimit;
                    break
                case 'offset':
                    const parsedOffset = parseInt(value);
                    if (isNaN(parsedOffset) || parsedOffset < 0) {
                        throw new Error(`Invalid offset value: ${value}. Must be a non-negative integer.`);
                    }
                    params.offset = parsedOffset;
                    break
            }
        }
        
        // Apply restrictions after parsing (optimized single pass)
        if (restrictions) {
            const filtered = validateAndApplyRestrictions(
                params.where,
                params.whereGroups,
                params.relations,
                restrictions
            );
            params.where = filtered.where;
            params.whereGroups = filtered.whereGroups;
            params.relations = filtered.relations;
        }
        
        return params;
    }

    static fromController<T>(queryData: QueryParamsRaw, restrictions?: QueryRestrictions): QueryParamsBuilder<T> {
        const params: QueryParamsBuilder<T> = {
            where: [],
            whereGroups: [],
            relations: [],
            limit: 10,
            offset: 0,
            orderBy: []
        };

        if (!queryData) {
            return params;
        }

        if (queryData.filters) {
            params.where = parseFilters<T>(queryData.filters);
        }
        if (queryData.filterGroups) {
            const groups = queryData.filterGroups.split('|');
            params.whereGroups = groups.map(groupStr => {
                const parts = groupStr.split('~', 2);
                const logic = parts[0] as 'AND' | 'OR';
                const conditionsStr = groupStr.substring(parts[0].length + 1);
                const conditions = parseFilters<T>(conditionsStr);
                return { logic, conditions };
            });
        }
        if (queryData.relations) {
            params.relations = parseRelations<T>(queryData.relations);
        }
        if (queryData.orderBy) {
            params.orderBy = parseOrderBy<T>(queryData.orderBy)
        }
        if (queryData.limit) {
            const parsedLimit = Number(queryData.limit);
            if (isNaN(parsedLimit) || parsedLimit < 0) {
                throw new Error(`Invalid limit value: ${queryData.limit}. Must be a positive integer.`);
            }
            params.limit = parsedLimit;
        }
        if (queryData.offset) {
            const parsedOffset = Number(queryData.offset);
            if (isNaN(parsedOffset) || parsedOffset < 0) {
                throw new Error(`Invalid offset value: ${queryData.offset}. Must be a non-negative integer.`);
            }
            params.offset = parsedOffset;
        }
        
        // Apply restrictions after parsing (optimized single pass)
        if (restrictions) {
            const filtered = validateAndApplyRestrictions(
                params.where,
                params.whereGroups,
                params.relations,
                restrictions
            );
            params.where = filtered.where;
            params.whereGroups = filtered.whereGroups;
            params.relations = filtered.relations;
        }
        
        return params;
    }
}