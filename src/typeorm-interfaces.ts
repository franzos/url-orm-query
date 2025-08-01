// Minimal TypeORM-compatible interfaces to avoid dependency
// These match the essential structure needed for query building

export interface ColumnMetadata {
    propertyName: string;
    type: string | Function;
}

export interface RelationMetadata {
    propertyName: string;
}

export interface EntityMetadata {
    tableName: string;
    columns: ColumnMetadata[];
    ownRelations: RelationMetadata[];
}

export interface FindManyOptions<T> {
    where?: any;
    relations?: any;
    order?: { [P in keyof T]?: "ASC" | "DESC" };
    take?: number;
    skip?: number;
}

export interface Repository<T> {
    metadata: EntityMetadata;
    createQueryBuilder(alias: string): QueryBuilder<T>;
}

export interface QueryBuilder<T> {
    where(condition: string | any, parameters?: any): QueryBuilder<T>;
    andWhere(condition: string | any, parameters?: any): QueryBuilder<T>;
    leftJoin(property: string, alias: string): QueryBuilder<T>;
    leftJoinAndSelect(property: string, alias: string): QueryBuilder<T>;
    innerJoin(property: string, alias: string): QueryBuilder<T>;
    innerJoinAndSelect(property: string, alias: string): QueryBuilder<T>;
    addOrderBy(sort: string, order?: "ASC" | "DESC"): QueryBuilder<T>;
    take(limit: number): QueryBuilder<T>;
    skip(offset: number): QueryBuilder<T>;
    getOne(): Promise<T | null>;
    getOneOrFail(): Promise<T>;
    getMany(): Promise<T[]>;
    getManyAndCount(): Promise<[T[], number]>;
    getCount(): Promise<number>;
}

// TypeORM-compatible FindOperator implementation without importing TypeORM
export class FindOperator<T> {
    readonly '@instanceof' = Symbol.for('FindOperator');
    readonly _type: string;
    readonly _value: T;
    readonly _useParameter: boolean;
    readonly _multipleParameters: boolean;
    readonly _getSql?: (aliasPath: string) => string;
    readonly _objectLiteralParameters?: any;
    
    constructor(
        type: string, 
        value: T, 
        useParameter: boolean = true, 
        multipleParameters?: boolean,
        getSql?: (aliasPath: string) => string,
        objectLiteralParameters?: any
    ) {
        // Use the same symbol TypeORM uses
        (this as any)['@instanceof'] = Symbol.for('FindOperator');
        
        // Set properties to match TypeORM's FindOperator exactly
        (this as any)._type = type;
        (this as any)._value = value;
        (this as any)._useParameter = useParameter;
        (this as any)._multipleParameters = multipleParameters !== undefined ? multipleParameters : Array.isArray(value);
        (this as any)._getSql = getSql;
        (this as any)._objectLiteralParameters = objectLiteralParameters;
    }
    
    // These getters are important for TypeORM compatibility
    get type(): string {
        return this._type;
    }
    
    get value(): T {
        return this._value;
    }
    
    get useParameter(): boolean {
        return this._useParameter;
    }
    
    get multipleParameters(): boolean {
        return this._multipleParameters;
    }
    
    get getSql(): ((aliasPath: string) => string) | undefined {
        return this._getSql;
    }
    
    get objectLiteralParameters(): any {
        return this._objectLiteralParameters;
    }
}

export function Equal<T>(value: T): FindOperator<T> {
    return new FindOperator("equal", value);
}

export function Not<T>(value: T): FindOperator<T> {
    return new FindOperator("not", value);
}

export function Like(value: string): FindOperator<string> {
    return new FindOperator("like", value);
}

export function ILike(value: string): FindOperator<string> {
    return new FindOperator("ilike", value);
}

export function Between<T>(from: T, to: T): FindOperator<T> {
    return new FindOperator("between", [from, to] as any, true, true);
}

export function In<T>(value: T[]): FindOperator<T> {
    return new FindOperator("in", value as any, true, true);
}

export function Any<T>(value: T[]): FindOperator<T> {
    return new FindOperator("any", value as any);
}

export function LessThan<T>(value: T): FindOperator<T> {
    return new FindOperator("lessThan", value);
}

export function LessThanOrEqual<T>(value: T): FindOperator<T> {
    return new FindOperator("lessThanOrEqual", value);
}

export function MoreThan<T>(value: T): FindOperator<T> {
    return new FindOperator("moreThan", value);
}

export function MoreThanOrEqual<T>(value: T): FindOperator<T> {
    return new FindOperator("moreThanOrEqual", value);
}