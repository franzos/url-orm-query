import { Any, Between, EntityMetadata, FindManyOptions, ILike, In, LessThan, LessThanOrEqual, Like, MoreThan, MoreThanOrEqual, Not } from "typeorm";
import { Operator } from "./enums";
import { Where } from "./query-params";

export function isRelation(key: string, entityMeta: EntityMetadata) {
    return entityMeta.ownRelations.find(c => c.propertyName === key) !== undefined
}

export function columnMeta(key: string, entityMeta: EntityMetadata) {
    return {
        isRelation: isRelation(key, entityMeta),
        isJsonb: entityMeta.columns.find(c => c.propertyName === key).type === 'jsonb',
        meta: entityMeta.columns.find(c => c.propertyName === key)
    }
}

export function splitQueryKey(key: string) {
    return key.split('.')
}

export function operatorValue<T>(filter: Where<T>) {
    switch (filter.operator) {
        case Operator.EQUAL:
            return filter.value;
        case Operator.NOT:
            return Not(filter.value);
        case Operator.LIKE:
            return Like(`%${filter.value}%`);
        case Operator.ILIKE:
            return ILike(`%${filter.value}%`);
        case Operator.BETWEEN:
            const value = (filter.value as string).split(',')
            if (value.length !== 2) {
                throw new Error(`Invalid value for BETWEEN operator. Expected 2 values, got ${filter.value}`);
            }
            return Between(value[0], value[1]);
        case Operator.IN:
            return In((filter.value as string).split(','));
        case Operator.ANY:
            return Any((filter.value as string).split(','));
        case Operator.LESS_THAN:
            return LessThan(filter.value);
        case Operator.LESS_THAN_OR_EQUAL:
            return LessThanOrEqual(filter.value);
        case Operator.MORE_THAN:
            return MoreThan(filter.value);
        case Operator.MORE_THAN_OR_EQUAL:
            return MoreThanOrEqual(filter.value);
        default:
            throw new Error(`Unknown operator: ${filter.operator}`);
    }
}