import { FindManyOptions } from "typeorm";
import { Operator, Join } from "./enums";
import { Where, Relation, QueryParams } from "./query-params";

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
            }
        }
    }

    load(params: QueryParams<T>) {
        this.params = {
            where: params.where || [],
            relations: params.relations || [],
            limit: params.limit || 10,
            offset: params.offset || 0,
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
        if (this.params.limit) {
            params.push(`limit=${this.params.limit}`);
        }
        if (this.params.offset) {
            params.push(`offset=${this.params.offset}`);
        }
        return '?' + params.join('&');
    }

    fromUrl(string) {
        const params = new URLSearchParams(string);
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

    toTypeOrmQuery() {
        let query: FindManyOptions<T> = {};
        if (this.params.where.length > 0) {
            for (const filter of this.params.where) {
                if (!query.where) {
                    query.where = {};
                }
                const key = filter.key as string
                query.where[key] = filter.value
            }
        }
        if (this.params.relations.length > 0) {
            for (const relation of this.params.relations) {
                if (!query.relations) {
                    query.relations = [];
                }
                const name = relation.name as string
                query.relations[name] = true
            }
        }
        return query;
    }
}