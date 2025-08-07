import { Join } from "./enums/join";
import { Operator } from "./enums/operator";
import { OrderBy, Relation, Where, WhereGroup } from "./query-params";
import { QueryRestrictions, RestrictionError, RestrictionErrorDetail } from "./query-restrictions";
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

export function collectWhereFieldRestrictionErrors(fields: string[], restrictions?: QueryRestrictions): RestrictionErrorDetail[] {
    if (!restrictions || !restrictions.whereFields) {
        return [];
    }

    const errors: RestrictionErrorDetail[] = [];
    
    for (const field of fields) {
        const isAllowed = restrictions.mode === 'whitelist' 
            ? restrictions.whereFields.includes(field)
            : !restrictions.whereFields.includes(field);

        if (!isAllowed) {
            errors.push(RestrictionError.createFieldError(field, 'whereField', restrictions.mode));
        }
    }

    return errors;
}

export function collectRelationRestrictionErrors(relationNames: string[], restrictions?: QueryRestrictions): RestrictionErrorDetail[] {
    if (!restrictions || !restrictions.relations) {
        return [];
    }

    const errors: RestrictionErrorDetail[] = [];
    
    for (const relationName of relationNames) {
        const isAllowed = restrictions.mode === 'whitelist'
            ? restrictions.relations.includes(relationName)
            : !restrictions.relations.includes(relationName);

        if (!isAllowed) {
            errors.push(RestrictionError.createFieldError(relationName, 'relation', restrictions.mode));
        }
    }

    return errors;
}

export function validateWhereFieldRestrictions(field: string, restrictions?: QueryRestrictions): void {
    const errors = collectWhereFieldRestrictionErrors([field], restrictions);
    if (errors.length > 0 && restrictions?.strict) {
        throw RestrictionError.fromErrors(errors);
    }
}

export function validateRelationRestrictions(relationName: string, restrictions?: QueryRestrictions): void {
    const errors = collectRelationRestrictionErrors([relationName], restrictions);
    if (errors.length > 0 && restrictions?.strict) {
        throw RestrictionError.fromErrors(errors);
    }
}

export function isWhereFieldAllowed(field: string, restrictions?: QueryRestrictions): boolean {
    if (!restrictions || !restrictions.whereFields) {
        return true;
    }

    return restrictions.mode === 'whitelist'
        ? restrictions.whereFields.includes(field)
        : !restrictions.whereFields.includes(field);
}

export function isRelationAllowed(relationName: string, restrictions?: QueryRestrictions): boolean {
    if (!restrictions || !restrictions.relations) {
        return true;
    }

    return restrictions.mode === 'whitelist'
        ? restrictions.relations.includes(relationName)
        : !restrictions.relations.includes(relationName);
}

export function applyWhereRestrictions<T>(where: Where<T>[], restrictions?: QueryRestrictions): Where<T>[] {
    if (!restrictions) {
        return where;
    }

    return where.filter(filter => isWhereFieldAllowed(safeStringConversion(filter.key), restrictions));
}

export function applyRelationRestrictions<T>(relations: Relation<T>[], restrictions?: QueryRestrictions): Relation<T>[] {
    if (!restrictions) {
        return relations;
    }

    return relations.filter(relation => isRelationAllowed(safeStringConversion(relation.name), restrictions));
}

export function applyWhereGroupRestrictions<T>(whereGroups: WhereGroup<T>[], restrictions?: QueryRestrictions): WhereGroup<T>[] {
    if (!restrictions) {
        return whereGroups;
    }

    return whereGroups.map(group => ({
        ...group,
        conditions: applyWhereRestrictions(group.conditions, restrictions)
    })).filter(group => group.conditions.length > 0);
}

export function validateAllRestrictions<T>(
    whereFields: string[],
    relations: string[], 
    restrictions?: QueryRestrictions
): void {
    if (!restrictions || !restrictions.strict) {
        return;
    }

    const allErrors: RestrictionErrorDetail[] = [];
    
    // Collect WHERE field errors
    const whereErrors = collectWhereFieldRestrictionErrors(whereFields, restrictions);
    allErrors.push(...whereErrors);
    
    // Collect relation errors
    const relationErrors = collectRelationRestrictionErrors(relations, restrictions);
    allErrors.push(...relationErrors);
    
    // Throw aggregated error if any violations found
    if (allErrors.length > 0) {
        throw RestrictionError.fromErrors(allErrors);
    }
}

function safeStringConversion(value: any): string {
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    if (typeof value === 'symbol') {
        return value.toString();
    }
    if (value === null || value === undefined) {
        return String(value);
    }
    // For objects, try to get a reasonable string representation
    if (typeof value === 'object') {
        if (value.toString && typeof value.toString === 'function') {
            const result = value.toString();
            if (result !== '[object Object]') {
                return result;
            }
        }
        // Fallback to JSON stringification
        try {
            return JSON.stringify(value);
        } catch {
            return '[object Object]';
        }
    }
    return String(value);
}

export function validateAndApplyRestrictions<T>(
    where: Where<T>[],
    whereGroups: WhereGroup<T>[],
    relations: Relation<T>[],
    restrictions?: QueryRestrictions
): {
    where: Where<T>[];
    whereGroups: WhereGroup<T>[];
    relations: Relation<T>[];
} {
    if (!restrictions) {
        return { where, whereGroups, relations };
    }

    // Collect all fields in single pass with safe conversion
    const allWhereFields: string[] = [];
    where.forEach(w => allWhereFields.push(safeStringConversion(w.key)));
    whereGroups.forEach(group => 
        group.conditions.forEach(c => allWhereFields.push(safeStringConversion(c.key)))
    );
    const allRelations = relations.map(r => safeStringConversion(r.name));

    // Validate if strict mode
    if (restrictions.strict) {
        validateAllRestrictions(allWhereFields, allRelations, restrictions);
    }

    // Apply filtering
    return {
        where: applyWhereRestrictions(where, restrictions),
        whereGroups: applyWhereGroupRestrictions(whereGroups, restrictions),
        relations: applyRelationRestrictions(relations, restrictions)
    };
}