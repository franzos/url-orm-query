import { Join, Operator } from "./enums/index.js";

// keyof T: works for actual name detection (firstName, lastName, etc.)
// T[keyof T]: works for type detection (string, number, etc.)
export interface Where<T> {
    key: T[keyof T];
    value: T[keyof T];
    operator: Operator;
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
    where?: Where<T>[];
    relations?: Relation<T>[];
    limit?: number;
    offset?: number;
    orderBy?: OrderBy<T>[];
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