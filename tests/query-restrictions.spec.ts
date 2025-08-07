import { DataSource, EntityMetadata } from 'typeorm'
import { getSharedDatabase } from "./utils/shared-db"
import { Organization, User } from './entities'
import { ApiQueryOptions, Operator, QueryRestrictions, RestrictionError } from '../src'

let db: DataSource

function userEntityMeta(db: DataSource): EntityMetadata {
    return db.entityMetadatas.find(c => c.name === User.name) as EntityMetadata
}

beforeAll(async () => {
    db = await getSharedDatabase()
})

describe('Query Restrictions', () => {
    describe('Whitelist mode', () => {
        it('should allow only whitelisted fields in WHERE conditions', () => {
            const restrictions: QueryRestrictions = {
                mode: 'whitelist',
                whereFields: ['firstName', 'age'],
                strict: true
            }

            expect(() => {
                new ApiQueryOptions<User>({
                    where: [{
                        key: 'firstName',
                        operator: Operator.EQUAL,
                        value: 'John'
                    }]
                }, restrictions)
            }).not.toThrow()

            expect(() => {
                new ApiQueryOptions<User>({
                    where: [{
                        key: 'password',
                        operator: Operator.EQUAL,
                        value: 'secret'
                    }]
                }, restrictions)
            }).toThrow(RestrictionError)
        })

        it('should aggregate multiple restriction errors', () => {
            const restrictions: QueryRestrictions = {
                mode: 'whitelist',
                whereFields: ['firstName'],
                relations: ['organization'],
                strict: true
            }

            try {
                new ApiQueryOptions<User>({
                    where: [
                        { key: 'password', operator: Operator.EQUAL, value: 'secret' },
                        { key: 'ssn', operator: Operator.EQUAL, value: '123' }
                    ],
                    relations: [
                        { name: 'auditLogs' },
                        { name: 'privateData' }
                    ]
                }, restrictions)
                fail('Expected RestrictionError to be thrown')
            } catch (error) {
                expect(error).toBeInstanceOf(RestrictionError)
                const restrictionError = error as RestrictionError
                expect(restrictionError.errors).toHaveLength(4)
                expect(restrictionError.errors.map(e => e.field)).toEqual(['password', 'ssn', 'auditLogs', 'privateData'])
                expect(restrictionError.code).toBe('not_whitelisted')
                expect(restrictionError.message).toContain('password, ssn, auditLogs, privateData')
            }
        })

        it('should allow only whitelisted relations', () => {
            const restrictions: QueryRestrictions = {
                mode: 'whitelist',
                relations: ['organization'],
                strict: true
            }

            expect(() => {
                new ApiQueryOptions<User>({
                    relations: [{
                        name: 'organization'
                    }]
                }, restrictions)
            }).not.toThrow()

            expect(() => {
                new ApiQueryOptions<User>({
                    relations: [{
                        name: 'auditLogs'
                    }]
                }, restrictions)
            }).toThrow(RestrictionError)
        })

        it('should silently filter disallowed fields when strict=false', () => {
            const restrictions: QueryRestrictions = {
                mode: 'whitelist',
                whereFields: ['firstName'],
                relations: ['organization'],
                strict: false
            }

            const query = new ApiQueryOptions<User>({
                where: [
                    { key: 'firstName', operator: Operator.EQUAL, value: 'John' },
                    { key: 'password', operator: Operator.EQUAL, value: 'secret' }
                ],
                relations: [
                    { name: 'organization' },
                    { name: 'auditLogs' }
                ]
            }, restrictions)

            expect(query.params.where).toHaveLength(1)
            expect(query.params.where[0].key).toBe('firstName')
            expect(query.params.relations).toHaveLength(1)
            expect(query.params.relations[0].name).toBe('organization')
        })

        it('should filter URL parameters based on restrictions', () => {
            const restrictions: QueryRestrictions = {
                mode: 'whitelist',
                whereFields: ['firstName', 'organization.name'],
                relations: ['organization'],
                strict: false
            }

            const url = '?filters=firstName~EQUAL~John,password~EQUAL~secret,organization.name~EQUAL~ACME&relations=organization,auditLogs'
            const query = new ApiQueryOptions<User>().fromUrl(url, restrictions)

            expect(query.params.where).toHaveLength(2)
            expect(query.params.where.find(w => w.key === 'firstName')).toBeDefined()
            expect(query.params.where.find(w => w.key === 'organization.name')).toBeDefined()
            expect(query.params.where.find(w => w.key === 'password')).toBeUndefined()
            
            expect(query.params.relations).toHaveLength(1)
            expect(query.params.relations[0].name).toBe('organization')
        })
    })

    describe('Blacklist mode', () => {
        it('should block blacklisted fields in WHERE conditions', () => {
            const restrictions: QueryRestrictions = {
                mode: 'blacklist',
                whereFields: ['password', 'ssn'],
                strict: true
            }

            expect(() => {
                new ApiQueryOptions<User>({
                    where: [{
                        key: 'firstName',
                        operator: Operator.EQUAL,
                        value: 'John'
                    }]
                }, restrictions)
            }).not.toThrow()

            expect(() => {
                new ApiQueryOptions<User>({
                    where: [{
                        key: 'password',
                        operator: Operator.EQUAL,
                        value: 'secret'
                    }]
                }, restrictions)
            }).toThrow(RestrictionError)
        })

        it('should aggregate blacklisted fields error', () => {
            const restrictions: QueryRestrictions = {
                mode: 'blacklist',
                whereFields: ['password', 'ssn'],
                relations: ['auditLogs'],
                strict: true
            }

            try {
                new ApiQueryOptions<User>({
                    where: [
                        { key: 'firstName', operator: Operator.EQUAL, value: 'John' },
                        { key: 'password', operator: Operator.EQUAL, value: 'secret' },
                        { key: 'ssn', operator: Operator.EQUAL, value: '123' }
                    ],
                    relations: [
                        { name: 'organization' },
                        { name: 'auditLogs' }
                    ]
                }, restrictions)
                fail('Expected RestrictionError to be thrown')
            } catch (error) {
                expect(error).toBeInstanceOf(RestrictionError)
                const restrictionError = error as RestrictionError
                expect(restrictionError.errors).toHaveLength(3)
                expect(restrictionError.errors.map(e => e.field)).toEqual(['password', 'ssn', 'auditLogs'])
                expect(restrictionError.code).toBe('blacklisted')
                expect(restrictionError.message).toContain('password, ssn, auditLogs')
            }
        })

        it('should block blacklisted relations', () => {
            const restrictions: QueryRestrictions = {
                mode: 'blacklist',
                relations: ['auditLogs', 'privateData'],
                strict: true
            }

            expect(() => {
                new ApiQueryOptions<User>({
                    relations: [{
                        name: 'organization'
                    }]
                }, restrictions)
            }).not.toThrow()

            expect(() => {
                new ApiQueryOptions<User>({
                    relations: [{
                        name: 'auditLogs'
                    }]
                }, restrictions)
            }).toThrow(RestrictionError)
        })

        it('should silently filter blacklisted fields when strict=false', () => {
            const restrictions: QueryRestrictions = {
                mode: 'blacklist',
                whereFields: ['password'],
                relations: ['auditLogs'],
                strict: false
            }

            const query = new ApiQueryOptions<User>({
                where: [
                    { key: 'firstName', operator: Operator.EQUAL, value: 'John' },
                    { key: 'password', operator: Operator.EQUAL, value: 'secret' }
                ],
                relations: [
                    { name: 'organization' },
                    { name: 'auditLogs' }
                ]
            }, restrictions)

            expect(query.params.where).toHaveLength(1)
            expect(query.params.where[0].key).toBe('firstName')
            expect(query.params.relations).toHaveLength(1)
            expect(query.params.relations[0].name).toBe('organization')
        })
    })

    describe('Filter Groups', () => {
        it('should apply restrictions to filter groups', () => {
            const restrictions: QueryRestrictions = {
                mode: 'whitelist',
                whereFields: ['firstName', 'age'],
                strict: false
            }

            const query = new ApiQueryOptions<User>()
                .addWhereGroup({
                    logic: 'OR',
                    conditions: [
                        { key: 'firstName', operator: Operator.EQUAL, value: 'John' },
                        { key: 'password', operator: Operator.EQUAL, value: 'secret' },
                        { key: 'age', operator: Operator.EQUAL, value: '25' }
                    ]
                })

            const restrictedQuery = new ApiQueryOptions<User>(undefined, restrictions)
                .addWhereGroup({
                    logic: 'OR',
                    conditions: [
                        { key: 'firstName', operator: Operator.EQUAL, value: 'John' },
                        { key: 'password', operator: Operator.EQUAL, value: 'secret' },
                        { key: 'age', operator: Operator.EQUAL, value: '25' }
                    ]
                })

            expect(query.params.whereGroups[0].conditions).toHaveLength(3)
            expect(restrictedQuery.params.whereGroups[0].conditions).toHaveLength(2)
            expect(restrictedQuery.params.whereGroups[0].conditions.find(c => c.key === 'password')).toBeUndefined()
        })

        it('should filter groups from URL with restrictions', () => {
            const restrictions: QueryRestrictions = {
                mode: 'whitelist',
                whereFields: ['firstName', 'age'],
                strict: false
            }

            const url = '?filterGroups=OR~firstName~EQUAL~John,password~EQUAL~secret,age~EQUAL~25'
            const query = new ApiQueryOptions<User>().fromUrl(url, restrictions)

            expect(query.params.whereGroups).toHaveLength(1)
            expect(query.params.whereGroups[0].conditions).toHaveLength(2)
            expect(query.params.whereGroups[0].conditions.find(c => c.key === 'firstName')).toBeDefined()
            expect(query.params.whereGroups[0].conditions.find(c => c.key === 'age')).toBeDefined()
            expect(query.params.whereGroups[0].conditions.find(c => c.key === 'password')).toBeUndefined()
        })
    })
})