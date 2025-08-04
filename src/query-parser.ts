import { parseFilters, parseOrderBy, parseRelations } from "./extract";
import { QueryParamsBuilder, QueryParamsRaw } from "./query-params";

export class QueryParser<T> {
    static fromUrl<T>(queryString: string): QueryParamsBuilder<T> {
        const params: QueryParamsBuilder<T> = {
            where: [],
            relations: [],
            limit: 10,
            offset: 0,
            orderBy: []
        };

        const urlParams = new URLSearchParams(queryString);
        for (const [key, value] of urlParams) {
            switch (key) {
                case 'filters':
                    params.where = parseFilters<T>(value)
                    break
                case 'relations':
                    params.relations = parseRelations<T>(value)
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
        return params;
    }

    static fromController<T>(queryData: QueryParamsRaw): QueryParamsBuilder<T> {
        const params: QueryParamsBuilder<T> = {
            where: [],
            relations: [],
            limit: 10,
            offset: 0,
            orderBy: []
        };

        if (!queryData) {
            return params;
        }

        if (queryData.filters) {
            params.where = parseFilters<T>(queryData.filters)
        }
        if (queryData.relations) {
            params.relations = parseRelations<T>(queryData.relations)
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
        return params;
    }
}