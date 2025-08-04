import { Join } from "./enums/join";
import { Operator } from "./enums/operator";
import { ValidationError } from "./validation";

export function parseFilters<T>(input: string) {
    if (!input || typeof input !== 'string') {
        throw new ValidationError('Filter input must be a non-empty string');
    }

    return input.split(',').map((filter, index) => {
        const filters = filter.trim().split('~')
        
        if (filters.length < 2 || filters.length > 3) {
            throw new ValidationError(`Invalid filter format at position ${index}: "${filter}". Expected format: "key~value" or "key~operator~value"`);
        }
        
        if (filters.length === 2) {
            const [key, value] = filters
            if (!key.trim() || !value.trim()) {
                throw new ValidationError(`Empty key or value in filter at position ${index}: "${filter}"`);
            }
            return {
                key: key.trim() as keyof T | string,
                operator: Operator.EQUAL,
                value: value.trim() as T[keyof T] | string | string[]
            }
        } else {
            const [key, operator, value] = filters
            if (!key.trim() || !operator.trim() || !value.trim()) {
                throw new ValidationError(`Empty key, operator, or value in filter at position ${index}: "${filter}"`);
            }

            if (!Object.values(Operator).includes(operator.trim() as Operator)) {
                throw new ValidationError(`Invalid operator "${operator}" in filter at position ${index}. Valid operators: ${Object.values(Operator).join(', ')}`);
            }
            
            return {
                key: key.trim() as keyof T | string,
                operator: operator.trim() as Operator,
                value: value.trim() as T[keyof T] | string | string[]
            }
        }
    })
}

export function parseRelations<T>(input: string) {
    if (!input || typeof input !== 'string') {
        throw new ValidationError('Relations input must be a non-empty string');
    }

    return input.split(',').map((relation, index) => {
        const relations = relation.trim().split('~')
        
        if (relations.length < 1 || relations.length > 2) {
            throw new ValidationError(`Invalid relation format at position ${index}: "${relation}". Expected format: "relationName" or "relationName~joinType"`);
        }
        
        const name = relations[0].trim();
        if (!name) {
            throw new ValidationError(`Empty relation name at position ${index}: "${relation}"`);
        }
        
        // If no join type is specified, default to LEFT_SELECT
        if (relations.length === 1) {
            return {
                name: name as keyof T | string,
                join: Join.LEFT_SELECT
            }
        } else {
            let joinType = relations[1].trim();

            if (joinType === 'JOIN') {
                joinType = Join.LEFT_SELECT;
            }
            
            if (!Object.values(Join).includes(joinType as Join)) {
                throw new ValidationError(`Invalid join type "${relations[1].trim()}" in relation at position ${index}. Valid join types: ${Object.values(Join).join(', ')}, JOIN (legacy alias for LEFT_SELECT)`);
            }
            
            return {
                name: name as keyof T | string,
                join: joinType as Join
            }
        }
    })
}

export function parseOrderBy<T>(input: string) {
    if (!input || typeof input !== 'string') {
        throw new ValidationError('OrderBy input must be a non-empty string');
    }

    return input.split(',').map((orderBy, index) => {
        const parts = orderBy.trim().split('~')
        
        if (parts.length !== 2) {
            throw new ValidationError(`Invalid orderBy format at position ${index}: "${orderBy}". Expected format: "field~direction"`);
        }
        
        const [key, direction] = parts;
        const trimmedKey = key.trim();
        const trimmedDirection = direction.trim().toUpperCase();
        
        if (!trimmedKey) {
            throw new ValidationError(`Empty field name in orderBy at position ${index}: "${orderBy}"`);
        }
        
        if (!['ASC', 'DESC'].includes(trimmedDirection)) {
            throw new ValidationError(`Invalid direction "${direction}" in orderBy at position ${index}. Valid directions: ASC, DESC`);
        }
        
        return {
            key: trimmedKey as keyof T | string,
            direction: trimmedDirection as 'ASC' | 'DESC'
        }
    })
}