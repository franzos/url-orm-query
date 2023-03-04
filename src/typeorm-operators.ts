import { Any, Between, Brackets, EntityMetadata, ILike, In, LessThan, LessThanOrEqual, Like, MoreThan, MoreThanOrEqual, Not, ObjectLiteral, Repository } from "typeorm";
import { ColumnMetadata } from "typeorm/metadata/ColumnMetadata";
import { Operator } from "./enums/operator";
import { Where } from "./query-params";

export function isRelation(key: string, entityMeta: EntityMetadata) {
    return entityMeta.ownRelations.find(c => c.propertyName === key) !== undefined
}

export interface ColumnMeta {
    isRelation: boolean;
    isJsonb: boolean;
    meta: ColumnMetadata;
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

/**
 * Operator for find options
 * @param filter 
 * @returns 
 */
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

/**
 * Operator for query builder
 * @param opt 
 * @returns 
 */
export function queryBuilderOperator(opt: Operator) {
    switch(opt) {
        case Operator.EQUAL:
            return '='
        case Operator.NOT:
            return '!='
        case Operator.LIKE:
            return 'LIKE'
        case Operator.ILIKE:
            return 'ILIKE'
        case Operator.BETWEEN:
            return 'BETWEEN'
        case Operator.IN:
            return 'IN'
        case Operator.NOT_IN:
            return 'NOT IN'
        case Operator.LESS_THAN:
            return '<'
        case Operator.LESS_THAN_OR_EQUAL:
            return '<='
        case Operator.MORE_THAN:
            return '>'
        case Operator.MORE_THAN_OR_EQUAL:
            return '>='
        default:
            throw new Error(`Unknown operator: ${opt}`);
    }
}

export function queryBuilderAssembly<T>(repo: Repository<T>, filter: Where<T>): [string | ObjectLiteral | Brackets | ObjectLiteral[], ObjectLiteral] {
    const table = repo.metadata.tableName
    const keys = splitQueryKey(filter.key as string)
    const firstKey = keys[0]
    const columnMetadata = columnMeta(firstKey, repo.metadata)
    
    // for ex. 'user.name'
    let tableColumn: string;
    if (columnMetadata.isRelation) {
        tableColumn = `${firstKey}.${keys[1]}`
    } else if (columnMetadata.isJsonb) {
        tableColumn = `${firstKey}->>'${keys[1]}'`
    } else {
        tableColumn = `${table}.${firstKey}`
    }

    if (filter.operator === Operator.ILIKE) {
        tableColumn = `LOWER(${tableColumn})`
    }

    // for ex. '='
    const queryOperator = queryBuilderOperator(filter.operator)

    let filterValue: T[keyof T] | string[] = filter.value

    switch (filter.operator) {
        case Operator.EQUAL:
            return [`${tableColumn} ${queryOperator} :${firstKey}`, { [firstKey]: filterValue }]
        case Operator.NOT:
            return [`${tableColumn} ${queryOperator} :${firstKey}`, { [firstKey]: filterValue }]
        case Operator.LIKE:
            return [`${tableColumn} ${queryOperator} :${firstKey}`, { [firstKey]: `%${filterValue}%` }]
        case Operator.ILIKE:
            return [`${tableColumn} ${queryOperator} :${firstKey}`, { [firstKey]: `%${(filterValue as string).toLowerCase()}%` }]
        case Operator.BETWEEN:
            filterValue = (filter.value as string).split(',')
            if (filterValue.length !== 2) {
                throw new Error(`Invalid value for BETWEEN operator. Expected 2 values, got ${filter.value}`);
            }
            return [`${tableColumn} ${queryOperator} :FROM${firstKey} AND :TO${firstKey}`, { [`FROM${firstKey}`]: filterValue[0], [`TO${firstKey}`]: filterValue[1] }]
        case Operator.IN:
            filterValue = (filter.value as string).split(',')
            return [`${tableColumn} ${queryOperator} (:...${firstKey}Ids)`, { [`${firstKey}Ids`]: filterValue}]
        case Operator.NOT_IN:
            filterValue = (filter.value as string).split(',')
            return [`${tableColumn} ${queryOperator} (:...${firstKey}Ids)`, { [`${firstKey}Ids`]: filterValue}]
        case Operator.LESS_THAN:
            return [`${tableColumn} ${queryOperator} :${firstKey}`, { [firstKey]: filterValue }]
        case Operator.LESS_THAN_OR_EQUAL:
            return [`${tableColumn} ${queryOperator} :${firstKey}`, { [firstKey]: filterValue }]
        case Operator.MORE_THAN:
            return [`${tableColumn} ${queryOperator} :${firstKey}`, { [firstKey]: filterValue }]
        case Operator.MORE_THAN_OR_EQUAL:
            return [`${tableColumn} ${queryOperator} :${firstKey}`, { [firstKey]: filterValue }]
        default:
            throw new Error(`Operator ${filter.operator} not supported`);
    }   
}