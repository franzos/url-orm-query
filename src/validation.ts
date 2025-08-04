import { Join } from "./enums/join";
import { Operator } from "./enums/operator";
import { OrderBy, Relation, Where } from "./query-params";
import { EntityMetadata } from "./typeorm-interfaces";

export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

export function sanitizeParameterName(paramName: string): string {
    if (!paramName || typeof paramName !== 'string') {
        throw new ValidationError('Parameter name must be a non-empty string');
    }
    
    // Allow alphanumeric, underscore, dot (for relations), and hyphen
    const sanitized = paramName.replace(/[^a-zA-Z0-9_.]/g, '');
    
    if (sanitized !== paramName) {
        throw new ValidationError(`Invalid parameter name: ${paramName}. Only alphanumeric characters, underscore, and dot are allowed.`);
    }
    
    return sanitized;
}

export function validateOperatorValue(operator: Operator, value: any): void {
    if (value === null || value === undefined) {
        throw new ValidationError(`Value cannot be null or undefined for operator ${operator}`);
    }

    switch (operator) {
        case Operator.BETWEEN:
            if (typeof value !== 'string' || !value.includes(',')) {
                throw new ValidationError('BETWEEN operator requires a comma-separated string value (e.g., "1,10")');
            }
            const parts = value.split(',');
            if (parts.length !== 2) {
                throw new ValidationError('BETWEEN operator requires exactly 2 comma-separated values');
            }
            break;
        case Operator.IN:
        case Operator.NOT_IN:
            if (typeof value !== 'string') {
                throw new ValidationError(`${operator} operator requires a string value`);
            }
            break;
        case Operator.ANY:
            if (typeof value !== 'string') {
                throw new ValidationError('ANY operator requires a string value');
            }
            break;
    }
}

export function validateFieldExists(fieldName: string, entityMeta: EntityMetadata): void {
    const keys = fieldName.split('.');
    const firstKey = keys[0];
    
    // Check if it's a relation first (higher priority)
    const relation = entityMeta.ownRelations.find(r => r.propertyName === firstKey);
    if (relation) {
        if (keys.length < 2) {
            throw new ValidationError(`Relation field ${fieldName} must specify a target field (e.g., "relation.field")`);
        }
        // For relations, we can't validate the target field without the related entity metadata
        // This is acceptable as TypeORM will validate at runtime
        return;
    }
    
    // Check if it's a direct column
    const column = entityMeta.columns.find(c => c.propertyName === firstKey);
    if (column) {
        if (keys.length > 1 && column.type !== 'jsonb') {
            throw new ValidationError(`Field ${fieldName} is not a valid relation or JSONB field`);
        }
        return;
    }
    
    throw new ValidationError(`Field ${firstKey} does not exist on entity ${entityMeta.tableName}`);
}

export function createSafeParameterName(fieldName: string, index?: number): string {
    const sanitized = sanitizeParameterName(fieldName);
    const baseName = sanitized.replace(/\./g, '_');
    return index !== undefined ? `${baseName}_${index}` : baseName;
}

export function validateRelation<T>(relation: Relation<T>): void {
    if (!relation) {
        throw new ValidationError('Relation cannot be null or undefined');
    }
    
    if (!relation.name || typeof relation.name !== 'string') {
        throw new ValidationError('Relation name must be a non-empty string');
    }
    
    if (relation.join !== undefined && !Object.values(Join).includes(relation.join)) {
        throw new ValidationError(`Invalid join type: ${relation.join}. Must be one of: ${Object.values(Join).join(', ')}`);
    }
}

export function validateWhere<T>(where: Where<T>): void {
    if (!where) {
        throw new ValidationError('Where clause cannot be null or undefined');
    }
    
    if (!where.key || typeof where.key !== 'string') {
        throw new ValidationError('Where clause key must be a non-empty string');
    }
    
    if (!Object.values(Operator).includes(where.operator)) {
        throw new ValidationError(`Invalid operator: ${where.operator}. Must be one of: ${Object.values(Operator).join(', ')}`);
    }
    
    validateOperatorValue(where.operator, where.value);
}

export function validateOrderBy<T>(orderBy: OrderBy<T>): void {
    if (!orderBy) {
        throw new ValidationError('OrderBy clause cannot be null or undefined');
    }
    
    if (!orderBy.key || typeof orderBy.key !== 'string') {
        throw new ValidationError('OrderBy key must be a non-empty string');
    }
    
    if (orderBy.direction !== 'ASC' && orderBy.direction !== 'DESC') {
        throw new ValidationError(`Invalid direction: ${orderBy.direction}. Must be 'ASC' or 'DESC'`);
    }
}

export function validateLimit(limit: number): void {
    if (typeof limit !== 'number' || limit <= 0 || !Number.isInteger(limit)) {
        throw new ValidationError('Limit must be a positive integer');
    }
}

export function validateOffset(offset: number): void {
    if (typeof offset !== 'number' || offset < 0 || !Number.isInteger(offset)) {
        throw new ValidationError('Offset must be a non-negative integer');
    }
}