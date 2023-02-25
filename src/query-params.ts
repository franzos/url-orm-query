import { Join, Operator } from "./enums";

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

export class QueryParams<T> {
    where?: Where<T>[];
    relations?: Relation<T>[];
    limit?: number;
    offset?: number;
}