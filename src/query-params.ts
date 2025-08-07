import { Operator } from "./enums/operator";
import { Join } from "./enums/join";

export interface Where<T> {
    key: keyof T | string;
    value: T[keyof T] | string | string[];
    operator: Operator;
}

export interface WhereGroup<T> {
    logic: 'AND' | 'OR';
    conditions: Where<T>[];
}

/**
 * This exists primarily for front-end usage
 * - You might want to make a couple of filters required on load
 * - and subsequently, add or modify them, keeping required filters in place
 */
export interface WhereWithRequire<T> extends Where<T> {
    require?: boolean;
}

export interface Relation<T> {
    name: keyof T | string;
    join?: Join;
}

export interface OrderBy<T> {
    key: keyof T | string;
    direction: 'ASC' | 'DESC';
}

export interface QueryParams<T> {
    where?: WhereWithRequire<T>[];
    whereGroups?: WhereGroup<T>[];
    relations?: Relation<T>[];
    limit?: number;
    offset?: number;
    orderBy?: OrderBy<T>[];
}

export interface QueryParamsBuilder<T> extends QueryParams<T> {
    where: WhereWithRequire<T>[];
    whereGroups: WhereGroup<T>[];
    relations: Relation<T>[];
    limit: number;
    offset: number;
    orderBy: OrderBy<T>[];
}

export interface QueryParamsUpdate<T> extends QueryParams<T> {
    /**
     * Clear filters, offset and orderBy
     */
    clearParams?: boolean;
    /** 
     * To be used with ApiPagination, instead of changePage()
     */
    page?: number;
}

/**
 * Raw query params
 * For ex. for NestJS route handler parameter decorator
 */
export interface QueryParamsRaw {
    filters?: string;
    filterGroups?: string;
    relations?: string;
    orderBy?: string;
    limit?: string;
    offset?: string;
}