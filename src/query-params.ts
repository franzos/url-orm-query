import { Operator } from "./enums/operator";
import { Join } from "./enums/join";

// keyof T: works for actual name detection (firstName, lastName, etc.)
// T[keyof T]: works for type detection (string, number, etc.)
export interface Where<T> {
    key: T[keyof T];
    value: T[keyof T];
    operator: Operator;
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
    name: T[keyof T];
    join?: Join;
}

export interface OrderBy<T> {
    key: T[keyof T];
    direction: 'ASC' | 'DESC';
}

export class QueryParams<T> {
    where?: WhereWithRequire<T>[];
    relations?: Relation<T>[];
    limit?: number;
    offset?: number;
    orderBy?: OrderBy<T>[];
}

export class QueryParamsUpdate<T> extends QueryParams<T> {
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
    relations?: string;
    orderBy?: string;
    limit?: string;
    offset?: string;
}