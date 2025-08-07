export interface QueryRestrictions {
    mode: 'whitelist' | 'blacklist';
    whereFields?: string[];
    relations?: string[];
    strict?: boolean;
}

export interface RestrictionErrorDetail {
    field: string;
    type: 'whereField' | 'relation';
    code: 'blacklisted' | 'not_whitelisted';
    message: string;
}

export class RestrictionError extends Error {
    public readonly code: string;
    public readonly errors: RestrictionErrorDetail[];

    constructor(code: string, message: string, errors: RestrictionErrorDetail[]) {
        super(message);
        this.name = 'RestrictionError';
        this.code = code;
        this.errors = errors;
    }

    static createFieldError(field: string, type: 'whereField' | 'relation', mode: 'whitelist' | 'blacklist'): RestrictionErrorDetail {
        const code = mode === 'blacklist' ? 'blacklisted' : 'not_whitelisted';
        const action = mode === 'blacklist' ? 'is blacklisted' : 'is not whitelisted';
        const fieldType = type === 'whereField' ? 'Field' : 'Relation';
        
        return {
            field,
            type,
            code,
            message: `${fieldType} '${field}' ${action}`
        };
    }

    static fromErrors(errors: RestrictionErrorDetail[]): RestrictionError {
        if (errors.length === 0) {
            throw new Error('Cannot create RestrictionError without errors');
        }

        // Group errors by code to handle mixed scenarios
        const blacklisted = errors.filter(e => e.code === 'blacklisted');
        const notWhitelisted = errors.filter(e => e.code === 'not_whitelisted');

        let message: string;
        let code: string;

        if (blacklisted.length > 0 && notWhitelisted.length > 0) {
            // Mixed restrictions - create comprehensive message
            const blacklistedFields = blacklisted.map(e => e.field).join(', ');
            const notWhitelistedFields = notWhitelisted.map(e => e.field).join(', ');
            message = `Restriction violations: blacklisted fields (${blacklistedFields}), not whitelisted fields (${notWhitelistedFields})`;
            code = 'mixed_restrictions';
        } else if (blacklisted.length > 0) {
            const fields = blacklisted.map(e => e.field).join(', ');
            message = `The following fields are blacklisted: ${fields}`;
            code = 'blacklisted';
        } else {
            const fields = notWhitelisted.map(e => e.field).join(', ');
            message = `The following fields are not whitelisted: ${fields}`;
            code = 'not_whitelisted';
        }
        
        return new RestrictionError(code, message, errors);
    }
}