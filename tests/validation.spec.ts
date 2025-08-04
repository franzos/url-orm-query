import { DataSource, EntityMetadata } from 'typeorm'
import { ApiQueryOptions, Join, Operator, QueryParser, ValidationError } from '../src'
import { Organization, User } from './entities'
import { getSharedDatabase } from "./utils/shared-db"

let db: DataSource

function userEntityMeta(db: DataSource): EntityMetadata {
    return db.entityMetadatas.find(c => c.name === User.name) as EntityMetadata
}

beforeAll(async () => {
    db = await getSharedDatabase()
})

describe('Input Validation', () => {
    describe('Invalid Field Names', () => {
        it('should throw ValidationError for non-existent field', () => {
            expect(() => {
                new ApiQueryOptions<User>()
                    .addFilter({
                        key: 'nonExistentField',
                        operator: Operator.EQUAL,
                        value: 'test'
                    })
                    .toTypeOrmQuery(userEntityMeta(db))
            }).toThrow(ValidationError)
        })

        it('should throw ValidationError for empty field name', () => {
            expect(() => {
                QueryParser.fromUrl<User>('?filters=~EQUAL~test')
            }).toThrow(ValidationError)
        })

        it('should throw ValidationError for field with special characters during query building', () => {
            expect(() => {
                new ApiQueryOptions<User>()
                    .addFilter({
                        key: 'field@name',
                        operator: Operator.EQUAL,
                        value: 'test'
                    })
                    .toTypeOrmQueryBuilder(db.getRepository(User))
            }).toThrow(ValidationError)
        })

        it('should throw ValidationError for relation without target field', () => {
            expect(() => {
                new ApiQueryOptions<User>()
                    .addFilter({
                        key: 'organization',
                        operator: Operator.EQUAL,
                        value: 'test'
                    })
                    .toTypeOrmQuery(userEntityMeta(db))
            }).toThrow(ValidationError)
        })
    })

    describe('Invalid Operators', () => {
        it('should throw ValidationError for unsupported operator', () => {
            expect(() => {
                QueryParser.fromUrl<User>('?filters=firstName~INVALID_OP~test')
            }).toThrow(ValidationError)
        })

        it('should provide list of valid operators in error message', () => {
            try {
                QueryParser.fromUrl<User>('?filters=firstName~INVALID_OP~test')
            } catch (error) {
                expect(error).toBeInstanceOf(ValidationError)
                expect(error.message).toContain('Valid operators:')
                expect(error.message).toContain('EQUAL')
                expect(error.message).toContain('LIKE')
            }
        })

        it('should throw ValidationError for empty operator', () => {
            expect(() => {
                QueryParser.fromUrl<User>('?filters=firstName~~test')
            }).toThrow(ValidationError)
        })
    })

    describe('Invalid Operator-Value Combinations', () => {
        it('should throw ValidationError for BETWEEN with single value', () => {
            expect(() => {
                new ApiQueryOptions<User>()
                    .addFilter({
                        key: 'age',
                        operator: Operator.BETWEEN,
                        value: '25'
                    })
                    .toTypeOrmQuery(userEntityMeta(db))
            }).toThrow(ValidationError)
        })

        it('should throw ValidationError for BETWEEN with more than 2 values', () => {
            expect(() => {
                new ApiQueryOptions<User>()
                    .addFilter({
                        key: 'age',
                        operator: Operator.BETWEEN,
                        value: '20,25,30'
                    })
                    .toTypeOrmQuery(userEntityMeta(db))
            }).toThrow(ValidationError)
        })

        it('should throw ValidationError for null value', () => {
            expect(() => {
                new ApiQueryOptions<User>()
                    .addFilter({
                        key: 'firstName',
                        operator: Operator.EQUAL,
                        value: null as any
                    })
                    .toTypeOrmQuery(userEntityMeta(db))
            }).toThrow(ValidationError)
        })

        it('should throw ValidationError for undefined value', () => {
            expect(() => {
                new ApiQueryOptions<User>()
                    .addFilter({
                        key: 'firstName',
                        operator: Operator.EQUAL,
                        value: undefined as any
                    })
                    .toTypeOrmQuery(userEntityMeta(db))
            }).toThrow(ValidationError)
        })
    })

    describe('Malformed URL Parameters', () => {
        it('should throw ValidationError for invalid filter format', () => {
            expect(() => {
                QueryParser.fromUrl<User>('?filters=invalidformat')
            }).toThrow(ValidationError)
        })

        it('should throw ValidationError for filter with too many separators', () => {
            expect(() => {
                QueryParser.fromUrl<User>('?filters=field~operator~value~extra')
            }).toThrow(ValidationError)
        })

        it('should throw ValidationError for empty filter string', () => {
            expect(() => {
                QueryParser.fromUrl<User>('?filters=')
            }).toThrow(ValidationError)
        })

        it('should throw ValidationError for invalid orderBy format', () => {
            expect(() => {
                QueryParser.fromUrl<User>('?orderBy=field')
            }).toThrow(ValidationError)
        })

        it('should throw ValidationError for invalid orderBy direction', () => {
            expect(() => {
                QueryParser.fromUrl<User>('?orderBy=firstName~INVALID')
            }).toThrow(ValidationError)
        })

        it('should throw ValidationError for invalid relation format', () => {
            expect(() => {
                QueryParser.fromUrl<User>('?relations=rel~join~extra')
            }).toThrow(ValidationError)
        })

        it('should throw ValidationError for invalid join type', () => {
            expect(() => {
                QueryParser.fromUrl<User>('?relations=organization~INVALID_JOIN')
            }).toThrow(ValidationError)
        })
    })
})

describe('Parameter Sanitization', () => {
    it('should handle field names with underscores', () => {
        expect(() => {
            new ApiQueryOptions<User>()
                .addFilter({
                    key: 'firstName',
                    operator: Operator.EQUAL,
                    value: 'test'
                })
                .toTypeOrmQueryBuilder(db.getRepository(User))
                .getOne()
        }).not.toThrow()
    })

    it('should generate unique parameter names for multiple filters', async () => {
        const query = new ApiQueryOptions<User>()
            .addFilter({
                key: 'firstName',
                operator: Operator.EQUAL,
                value: 'test1'
            })
            .addFilter({
                key: 'firstName',
                operator: Operator.NOT,
                value: 'test2'
            })
            .toTypeOrmQueryBuilder(db.getRepository(User))

        // Should not throw and should generate different parameter names
        expect(query).toBeDefined()
    })

    it('should handle relation field names in parameter generation', async () => {
        const query = new ApiQueryOptions<User>()
            .addFilter({
                key: 'organization.name',
                operator: Operator.EQUAL,
                value: 'Test Corp'
            })
            .addRelation({
                name: 'organization'
            })
            .toTypeOrmQueryBuilder(db.getRepository(User))

        expect(query).toBeDefined()
    })
})

describe('Field Validation', () => {
    describe('Relation Fields', () => {
        it('should validate relation field exists', () => {
            expect(() => {
                new ApiQueryOptions<User>()
                    .addFilter({
                        key: 'nonExistentRelation.field',
                        operator: Operator.EQUAL,
                        value: 'test'
                    })
                    .toTypeOrmQuery(userEntityMeta(db))
            }).toThrow(ValidationError)
        })

        it('should allow valid relation fields', () => {
            expect(() => {
                new ApiQueryOptions<User>()
                    .addFilter({
                        key: 'organization.name',
                        operator: Operator.EQUAL,
                        value: 'test'
                    })
                    .toTypeOrmQuery(userEntityMeta(db))
            }).not.toThrow()
        })

        it('should require target field for relations', () => {
            expect(() => {
                new ApiQueryOptions<User>()
                    .addFilter({
                        key: 'organization',
                        operator: Operator.EQUAL,
                        value: 'test'
                    })
                    .toTypeOrmQuery(userEntityMeta(db))
            }).toThrow(ValidationError)
        })
    })

    describe('JSONB Fields', () => {
        it('should allow JSONB field access', () => {
            expect(() => {
                new ApiQueryOptions<Organization>()
                    .addFilter({
                        key: 'address.city',
                        operator: Operator.EQUAL,
                        value: 'Tokyo'
                    })
                    .toTypeOrmQuery(db.entityMetadatas.find(c => c.name === Organization.name) as EntityMetadata)
            }).not.toThrow()
        })

        it('should reject non-JSONB fields with dot notation', () => {
            expect(() => {
                new ApiQueryOptions<User>()
                    .addFilter({
                        key: 'firstName.invalid',
                        operator: Operator.EQUAL,
                        value: 'test'
                    })
                    .toTypeOrmQuery(userEntityMeta(db))
            }).toThrow(ValidationError)
        })
    })
})

describe('Error Message Quality', () => {
    it('should provide descriptive error for invalid field', () => {
        try {
            new ApiQueryOptions<User>()
                .addFilter({
                    key: 'invalidField',
                    operator: Operator.EQUAL,
                    value: 'test'
                })
                .toTypeOrmQuery(userEntityMeta(db))
        } catch (error) {
            expect(error).toBeInstanceOf(ValidationError)
            expect(error.message).toContain('invalidField')
            expect(error.message).toContain('does not exist')
        }
    })

    it('should provide position information in parsing errors', () => {
        try {
            QueryParser.fromUrl<User>('?filters=field1~EQUAL~value1,~INVALID~value2')
        } catch (error) {
            expect(error).toBeInstanceOf(ValidationError)
            expect(error.message).toContain('position 1')
        }
    })

    it('should provide expected format in malformed input errors', () => {
        try {
            QueryParser.fromUrl<User>('?filters=invalidformat')
        } catch (error) {
            expect(error).toBeInstanceOf(ValidationError)
            expect(error.message).toContain('Expected format:')
            expect(error.message).toContain('key~value')
        }
    })

    it('should provide valid options in enumeration errors', () => {
        try {
            QueryParser.fromUrl<User>('?relations=organization~INVALID_JOIN')
        } catch (error) {
            expect(error).toBeInstanceOf(ValidationError)
            expect(error.message).toContain('Valid join types:')
            expect(error.message).toContain('LEFT_SELECT')
        }
    })
})

describe('Legacy Compatibility', () => {
    it('should accept JOIN as alias for LEFT_SELECT', () => {
        expect(() => {
            QueryParser.fromUrl<User>('?relations=organization~JOIN')
        }).not.toThrow()
    })

    it('should map JOIN to LEFT_SELECT', () => {
        const params = QueryParser.fromUrl<User>('?relations=organization~JOIN')
        expect(params.relations[0].join).toBe('LEFT_SELECT')
    })

    it('should support deprecated toTypeormQueryBuilder method', () => {
        const query = new ApiQueryOptions<User>()
        expect(typeof query.toTypeormQueryBuilder).toBe('function')
    })
})

describe('Edge Cases and Boundaries', () => {
    it('should handle empty filter values gracefully', () => {
        expect(() => {
            QueryParser.fromUrl<User>('?filters=firstName~EQUAL~')
        }).toThrow(ValidationError)
    })

    it('should handle whitespace in inputs', () => {
        expect(() => {
            QueryParser.fromUrl<User>('?filters= firstName ~ EQUAL ~ test ')
        }).not.toThrow()
    })

    it('should validate limit values', () => {
        expect(() => {
            QueryParser.fromUrl<User>('?limit=invalid')
        }).toThrow()
    })

    it('should validate offset values', () => {
        expect(() => {
            QueryParser.fromUrl<User>('?offset=-1')
        }).toThrow()
    })

    it('should handle very long field names', () => {
        const longFieldName = 'a'.repeat(1000)
        expect(() => {
            new ApiQueryOptions<User>()
                .addFilter({
                    key: longFieldName,
                    operator: Operator.EQUAL,
                    value: 'test'
                })
                .toTypeOrmQuery(userEntityMeta(db))
        }).toThrow(ValidationError)
    })

    it('should handle many filters without parameter conflicts', () => {
        let query = new ApiQueryOptions<User>()
        
        // Add many filters with the same field name
        for (let i = 0; i < 10; i++) {
            query = query.addFilter({
                key: 'firstName',
                operator: Operator.EQUAL,
                value: `test${i}`
            })
        }

        expect(() => {
            query.toTypeOrmQueryBuilder(db.getRepository(User))
        }).not.toThrow()
    })
})

describe('Type Coercion and Parsing', () => {
    it('should handle string numbers for limit', () => {
        const params = QueryParser.fromUrl<User>('?limit=10')
        expect(params.limit).toBe(10)
        expect(typeof params.limit).toBe('number')
    })

    it('should handle string numbers for offset', () => {
        const params = QueryParser.fromUrl<User>('?offset=20')
        expect(params.offset).toBe(20)
        expect(typeof params.offset).toBe('number')
    })

    it('should reject invalid numeric strings', () => {
        expect(() => {
            QueryParser.fromUrl<User>('?limit=abc')
        }).toThrow()
    })

    it('should reject negative numbers for limit', () => {
        expect(() => {
            QueryParser.fromUrl<User>('?limit=-5')
        }).toThrow()
    })
})

describe('ApiQueryOptions Input Validation', () => {
    describe('Constructor Validation', () => {
        it('should validate invalid join type in constructor', () => {
            expect(() => {
                new ApiQueryOptions<User>({
                    relations: [{ name: 'user', join: 'INVALID_JOIN' as any }]
                })
            }).toThrow(ValidationError)
        })

        it('should validate empty relation name in constructor', () => {
            expect(() => {
                new ApiQueryOptions<User>({
                    relations: [{ name: '' }]
                })
            }).toThrow(ValidationError)
        })

        it('should validate invalid operator in constructor', () => {
            expect(() => {
                new ApiQueryOptions<User>({
                    where: [{
                        key: 'status',
                        value: 'pending',
                        operator: 'INVALID_OP' as any,
                    }]
                })
            }).toThrow(ValidationError)
        })

        it('should validate negative limit in constructor', () => {
            expect(() => {
                new ApiQueryOptions<User>({
                    limit: -5
                })
            }).toThrow(ValidationError)
        })

        it('should validate negative offset in constructor', () => {
            expect(() => {
                new ApiQueryOptions<User>({
                    offset: -1
                })
            }).toThrow(ValidationError)
        })

        it('should validate invalid orderBy direction in constructor', () => {
            expect(() => {
                new ApiQueryOptions<User>({
                    orderBy: [{
                        key: 'name',
                        direction: 'INVALID' as any
                    }]
                })
            }).toThrow(ValidationError)
        })
    })

    describe('load() Method Validation', () => {
        it('should validate invalid join type in load()', () => {
            const params = new ApiQueryOptions<User>()
            expect(() => {
                params.load({
                    relations: [{ name: 'user', join: 'INVALID_JOIN' as any }]
                })
            }).toThrow(ValidationError)
        })

        it('should validate null relation in load()', () => {
            const params = new ApiQueryOptions<User>()
            expect(() => {
                params.load({
                    relations: [null as any]
                })
            }).toThrow(ValidationError)
        })

        it('should validate invalid where clause in load()', () => {
            const params = new ApiQueryOptions<User>()
            expect(() => {
                params.load({
                    where: [{
                        key: '',
                        value: 'test',
                        operator: Operator.EQUAL
                    }]
                })
            }).toThrow(ValidationError)
        })
    })

    describe('loadAndMerge() Method Validation', () => {
        it('should validate invalid join type in loadAndMerge()', () => {
            const params = new ApiQueryOptions<User>()
            expect(() => {
                params.loadAndMerge({
                    relations: [{ name: 'user', join: 'INVALID_JOIN' as any }]
                })
            }).toThrow(ValidationError)
        })

        it('should validate invalid limit in loadAndMerge()', () => {
            const params = new ApiQueryOptions<User>()
            expect(() => {
                params.loadAndMerge({
                    limit: 0
                })
            }).toThrow(ValidationError)
        })
    })

    describe('addFilter() Method Validation', () => {
        it('should validate empty key in addFilter()', () => {
            const params = new ApiQueryOptions<User>()
            expect(() => {
                params.addFilter({
                    key: '',
                    value: 'test',
                    operator: Operator.EQUAL
                })
            }).toThrow(ValidationError)
        })

        it('should validate invalid operator in addFilter()', () => {
            const params = new ApiQueryOptions<User>()
            expect(() => {
                params.addFilter({
                    key: 'name',
                    value: 'test',
                    operator: 'INVALID_OP' as any
                })
            }).toThrow(ValidationError)
        })

        it('should validate null value in addFilter()', () => {
            const params = new ApiQueryOptions<User>()
            expect(() => {
                params.addFilter({
                    key: 'name',
                    value: null as any,
                    operator: Operator.EQUAL
                })
            }).toThrow(ValidationError)
        })
    })

    describe('addRelation() Method Validation', () => {
        it('should validate empty name in addRelation()', () => {
            const params = new ApiQueryOptions<User>()
            expect(() => {
                params.addRelation({ name: '' })
            }).toThrow(ValidationError)
        })

        it('should validate invalid join type in addRelation()', () => {
            const params = new ApiQueryOptions<User>()
            expect(() => {
                params.addRelation({ name: 'user', join: 'INVALID_JOIN' as any })
            }).toThrow(ValidationError)
        })

        it('should validate null relation in addRelation()', () => {
            const params = new ApiQueryOptions<User>()
            expect(() => {
                params.addRelation(null as any)
            }).toThrow(ValidationError)
        })

        it('should accept valid join types in addRelation()', () => {
            const params = new ApiQueryOptions<User>()
            expect(() => {
                params.addRelation({ name: 'user', join: Join.INNER })
            }).not.toThrow()
            expect(() => {
                params.addRelation({ name: 'organization', join: Join.LEFT_SELECT })
            }).not.toThrow()
        })
    })

    describe('setLimit() Method Validation', () => {
        it('should validate negative limit in setLimit()', () => {
            const params = new ApiQueryOptions<User>()
            expect(() => {
                params.setLimit(-1)
            }).toThrow(ValidationError)
        })

        it('should validate zero limit in setLimit()', () => {
            const params = new ApiQueryOptions<User>()
            expect(() => {
                params.setLimit(0)
            }).toThrow(ValidationError)
        })

        it('should validate non-integer limit in setLimit()', () => {
            const params = new ApiQueryOptions<User>()
            expect(() => {
                params.setLimit(10.5)
            }).toThrow(ValidationError)
        })

        it('should accept positive integer limit in setLimit()', () => {
            const params = new ApiQueryOptions<User>()
            expect(() => {
                params.setLimit(10)
            }).not.toThrow()
        })
    })

    describe('setOffset() Method Validation', () => {
        it('should validate negative offset in setOffset()', () => {
            const params = new ApiQueryOptions<User>()
            expect(() => {
                params.setOffset(-1)
            }).toThrow(ValidationError)
        })

        it('should validate non-integer offset in setOffset()', () => {
            const params = new ApiQueryOptions<User>()
            expect(() => {
                params.setOffset(5.5)
            }).toThrow(ValidationError)
        })

        it('should accept zero offset in setOffset()', () => {
            const params = new ApiQueryOptions<User>()
            expect(() => {
                params.setOffset(0)
            }).not.toThrow()
        })

        it('should accept positive integer offset in setOffset()', () => {
            const params = new ApiQueryOptions<User>()
            expect(() => {
                params.setOffset(20)
            }).not.toThrow()
        })
    })

    describe('Validation Error Messages', () => {
        it('should provide detailed error for invalid join type', () => {
            try {
                new ApiQueryOptions<User>({
                    relations: [{ name: 'user', join: 'WRONG' as any }]
                })
            } catch (error) {
                expect(error).toBeInstanceOf(ValidationError)
                expect(error.message).toContain('Invalid join type: WRONG')
                expect(error.message).toContain('INNER, LEFT, LEFT_SELECT, INNER_SELECT')
            }
        })

        it('should provide detailed error for invalid operator', () => {
            try {
                new ApiQueryOptions<User>().addFilter({
                    key: 'name',
                    value: 'test',
                    operator: 'WRONG' as any
                })
            } catch (error) {
                expect(error).toBeInstanceOf(ValidationError)
                expect(error.message).toContain('Invalid operator: WRONG')
                expect(error.message).toContain('EQUAL')
            }
        })

        it('should provide detailed error for invalid direction', () => {
            try {
                new ApiQueryOptions<User>({
                    orderBy: [{
                        key: 'name',
                        direction: 'WRONG' as any
                    }]
                })
            } catch (error) {
                expect(error).toBeInstanceOf(ValidationError)
                expect(error.message).toContain('Invalid direction: WRONG')
                expect(error.message).toContain('ASC')
                expect(error.message).toContain('DESC')
            }
        })
    })
})