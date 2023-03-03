import { DataSource } from 'typeorm'
import TestDataSource from "./utils/ormconfig"
import { seed } from "./utils/seed"
import { Organization, User } from './entities'
import { ApiQueryOptions, Operator } from '../src'
import { usersSeed } from './utils/seed-data'

let db: DataSource

beforeAll(async () => {
    db = TestDataSource
    await db.initialize()
    await seed(db)
})

describe('Typeorm find options', () => {
    /**
     * Typeorm find
     */

    it('filter by username (url)', async () => {
        const url = '?filters=firstName~EQUAL~Amias&limit=10'
        const entityMeta = db.entityMetadatas.find(c => c.name === User.name)
        const query = new ApiQueryOptions<User>().fromUrl(url).toTypeOrmQuery(entityMeta)
        
        const userRepository = db.getRepository(User)
        const user = await userRepository.findOne(query)

        expect(user.firstName).toBe(usersSeed[0].firstName)
    })

    it('filter by username and join relation (url)', async () => {
        const url = '?filters=firstName~EQUAL~Amias&limit=10&relations=organization~JOIN'
        const entityMeta = db.entityMetadatas.find(c => c.name === User.name)
        const query = new ApiQueryOptions<User>().fromUrl(url).toTypeOrmQuery(entityMeta)
        const userRepository = db.getRepository(User)
        const user = await userRepository.findOne(query)

        expect(user.firstName).toBe(usersSeed[0].firstName)
        expect(user.organization.id).toBeDefined()
    })

    it('order by (url)', async () => {
        const url = '?orderBy=age~ASC'
        const entityMeta = db.entityMetadatas.find(c => c.name === User.name)
        const query = new ApiQueryOptions<User>().fromUrl(url)
        const userRepository = db.getRepository(User)
        const users = await userRepository.find(query.toTypeOrmQuery(entityMeta))
        expect(users.length).toBe(3)
        expect(users[0].age).toBe(21)
        expect(users[1].age).toBe(28)
        expect(users[2].age).toBe(48)
    })

    it('filter by username', async () => {
        const entityMeta = db.entityMetadatas.find(c => c.name === User.name)
        const query = new ApiQueryOptions<User>({
            where: [
                {
                    key: 'firstName',
                    operator: Operator.EQUAL,
                    value: 'Amias'
                }
            ]
        }).toTypeOrmQuery(entityMeta)
        
        const userRepository = db.getRepository(User)
        const user = await userRepository.findOne(query)

        expect(user.firstName).toBe(usersSeed[0].firstName)
    })

    it('filter by username and join relation', async () => {
        const entityMeta = db.entityMetadatas.find(c => c.name === User.name)
        const query = new ApiQueryOptions<User>({
            where: [
                {
                    key: 'firstName',
                    operator: Operator.EQUAL,
                    value: 'Amias'
                }
            ],
            relations: [
                {
                    name: 'organization'
                }
            ]
        })
        const userRepository = db.getRepository(User)
        const user = await userRepository.findOne(query.toTypeOrmQuery(entityMeta))
        expect(user.firstName).toBe(usersSeed[0].firstName)
        expect(user.organization).toBeDefined()
    })

    it('filter by username NOT', async () => {
        const entityMeta = db.entityMetadatas.find(c => c.name === User.name)
        const query = new ApiQueryOptions<User>({
            where: [
                {
                    key: 'firstName',
                    operator: Operator.NOT,
                    value: 'Amias'
                }
            ],
        })
        const userRepository = db.getRepository(User)
        const users = await userRepository.find(query.toTypeOrmQuery(entityMeta))
        for (const user of users) {
            expect(user.firstName).not.toBe('Amias')
        }
    })

    it('filter by username LIKE', async () => {
        const entityMeta = db.entityMetadatas.find(c => c.name === User.name)
        const query = new ApiQueryOptions<User>({
            where: [
                {
                    key: 'firstName',
                    operator: Operator.LIKE,
                    value: 'Ami'
                }
            ],
        })
        const userRepository = db.getRepository(User)
        const users = await userRepository.find(query.toTypeOrmQuery(entityMeta))
        for (const user of users) {
            expect(user.firstName).toBe('Amias')
        }
    })

    it('filter by age BETWEEN', async () => {
        const entityMeta = db.entityMetadatas.find(c => c.name === User.name)
        const query = new ApiQueryOptions<User>({
            where: [
                {
                    key: 'age',
                    operator: Operator.BETWEEN,
                    value: '20,22'
                }
            ],
        })
        const userRepository = db.getRepository(User)
        const users = await userRepository.find(query.toTypeOrmQuery(entityMeta))
        for (const user of users) {
            expect(user.age).toBeGreaterThanOrEqual(20)
            expect(user.age).toBeLessThanOrEqual(22)
        }
    })

    it('filter by age IN', async () => {
        const entityMeta = db.entityMetadatas.find(c => c.name === User.name)
        const query = new ApiQueryOptions<User>({
            where: [
                {
                    key: 'firstName',
                    operator: Operator.IN,
                    value: 'Amias'
                }
            ],
        })
        const userRepository = db.getRepository(User)
        const users = await userRepository.find(query.toTypeOrmQuery(entityMeta))
        expect(users.length).toBe(1)
    })

    it('filter by firstName IN', async () => {
        const entityMeta = db.entityMetadatas.find(c => c.name === User.name)
        const query = new ApiQueryOptions<User>({
            where: [
                {
                    key: 'firstName',
                    operator: Operator.IN,
                    value: 'Amias,Perce'
                }
            ],
        })
        const userRepository = db.getRepository(User)
        const users = await userRepository.find(query.toTypeOrmQuery(entityMeta))
        expect(users.length).toBe(2)
    })

    it('filter by age LESS_THAN', async () => {
        const entityMeta = db.entityMetadatas.find(c => c.name === User.name)
        const query = new ApiQueryOptions<User>({
            where: [
                {
                    key: 'age',
                    operator: Operator.LESS_THAN,
                    value: '22'
                }
            ],
        })
        const userRepository = db.getRepository(User)
        const users = await userRepository.find(query.toTypeOrmQuery(entityMeta))
        expect(users.length).toBe(1)
        expect(users[0].firstName).toBe('Amias')
    })

    it('filter by age LESS_THAN_OR_EQUAL', async () => {
        const entityMeta = db.entityMetadatas.find(c => c.name === User.name)
        const query = new ApiQueryOptions<User>({
            where: [
                {
                    key: 'age',
                    operator: Operator.LESS_THAN_OR_EQUAL,
                    value: '21'
                }
            ],
        })
        const userRepository = db.getRepository(User)
        const users = await userRepository.find(query.toTypeOrmQuery(entityMeta))
        expect(users.length).toBe(1)
        expect(users[0].firstName).toBe('Amias')
    })

    it('filter by age LESS_THAN_OR_EQUAL - no result', async () => {
        const entityMeta = db.entityMetadatas.find(c => c.name === User.name)
        const query = new ApiQueryOptions<User>({
            where: [
                {
                    key: 'age',
                    operator: Operator.LESS_THAN_OR_EQUAL,
                    value: '20'
                }
            ],
        })
        const userRepository = db.getRepository(User)
        const users = await userRepository.find(query.toTypeOrmQuery(entityMeta))
        expect(users.length).toBe(0)
    })

    it('list users, limit to 1', async () => {
        const entityMeta = db.entityMetadatas.find(c => c.name === User.name)
        const query = new ApiQueryOptions<User>({
            limit: 1,
            relations: [
                {
                    name: 'organization'
                }
            ]
        })
        const userRepository = db.getRepository(User)
        const user = await userRepository.find(query.toTypeOrmQuery(entityMeta))
        expect(user.length).toBe(1)
        expect(user[0].organization).toBeDefined()
    })

    it('list users by organization name', async () => {
        const entityMeta = db.entityMetadatas.find(c => c.name === User.name)
        const query = new ApiQueryOptions<User>({
            where: [
                {
                    key: 'organization.name',
                    operator: Operator.EQUAL,
                    value: 'Truper Corp.'
                }
            ],
            relations: [
                {
                    name: 'organization'
                }
            ]
        })
        const userRepository = db.getRepository(User)
        const user = await userRepository.find(query.toTypeOrmQuery(entityMeta))
        expect(user.length).toBe(3)
        expect(user[0].organization).toBeDefined()
    })

    it('list users by organization name - no result', async () => {
        const entityMeta = db.entityMetadatas.find(c => c.name === User.name)
        const query = new ApiQueryOptions<User>({
            where: [
                {
                    key: 'organization.name',
                    operator: Operator.EQUAL,
                    value: 'Krogith Inc.'
                }
            ],
            relations: [
                {
                    name: 'organization'
                }
            ]
        })
        const userRepository = db.getRepository(User)
        const user = await userRepository.find(query.toTypeOrmQuery(entityMeta))
        expect(user.length).toBe(0)
    })

    it('order by', async () => {
        const entityMeta = db.entityMetadatas.find(c => c.name === User.name)
        const query = new ApiQueryOptions<User>({
            orderBy: [
                {
                    key: 'age',
                    direction: 'ASC'
                }
            ],
        })
        const userRepository = db.getRepository(User)
        const users = await userRepository.find(query.toTypeOrmQuery(entityMeta))
        expect(users.length).toBe(3)
        expect(users[0].age).toBe(21)
        expect(users[1].age).toBe(28)
        expect(users[2].age).toBe(48)
    })
})

describe('Typeorm query builder', () => {

    /**
     * Typeorm Query Builder
     */

    it('filter by username (url)', async () => {
        const url = '?filters=firstName~EQUAL~Amias&limit=10'
        const query = new ApiQueryOptions<User>().fromUrl(url).toTypeormQueryBuilder(db.getRepository(User))
        const user = await query.getOne()

        expect(user.firstName).toBe(usersSeed[0].firstName)
    })

    it('filter by username', async () => {
        const query = new ApiQueryOptions<User>({
            where: [
                {
                    key: 'firstName',
                    operator: Operator.EQUAL,
                    value: 'Amias'
                }
            ]
        }).toTypeormQueryBuilder(db.getRepository(User))
        const user = await query.getOne()

        expect(user.firstName).toBe(usersSeed[0].firstName)
    })

    it('filter by username and join relation', async () => {
        const query = new ApiQueryOptions<User>({
            where: [
                {
                    key: 'firstName',
                    operator: Operator.EQUAL,
                    value: 'Amias'
                }
            ],
            relations: [
                {
                    name: 'organization'
                }
            ]
        }).toTypeormQueryBuilder(db.getRepository(User))
        const user = await query.getOne()
        expect(user.firstName).toBe(usersSeed[0].firstName)
        expect(user.organization).toBeDefined()
    })

    it('filter by username NOT', async () => {
        const query = new ApiQueryOptions<User>({
            where: [
                {
                    key: 'firstName',
                    operator: Operator.NOT,
                    value: 'Amias'
                }
            ],
        }).toTypeormQueryBuilder(db.getRepository(User))
        const users = await query.getMany()
        for (const user of users) {
            expect(user.firstName).not.toBe('Amias')
        }
    })

    // TODO: Like, Between

    it('filter by firstName LIKE', async () => {
        const query = new ApiQueryOptions<User>({
            where: [
                {
                    key: 'firstName',
                    operator: Operator.LIKE,
                    value: 'Ami'
                }
            ],
        }).toTypeormQueryBuilder(db.getRepository(User))
        const users = await query.getMany()
        expect(users.length).toBe(1)
    })

    it('filter by firstName BETWEEN', async () => {
        const query = new ApiQueryOptions<User>({
            where: [
                {
                    key: 'age',
                    operator: Operator.BETWEEN,
                    value: '20,22'
                }
            ],
        }).toTypeormQueryBuilder(db.getRepository(User))
        const users = await query.getMany()
        for (const user of users) {
            expect(user.age).toBeGreaterThanOrEqual(20)
            expect(user.age).toBeLessThanOrEqual(22)
        }
    })

    it('filter by firstName IN', async () => {
        const query = new ApiQueryOptions<User>({
            where: [
                {
                    key: 'firstName',
                    operator: Operator.IN,
                    value: 'Amias'
                }
            ],
        }).toTypeormQueryBuilder(db.getRepository(User))
        const users = await query.getMany()
        expect(users.length).toBe(1)
    })

    it('filter by multiple firstName IN', async () => {
        const query = new ApiQueryOptions<User>({
            where: [
                {
                    key: 'firstName',
                    operator: Operator.IN,
                    value: 'Amias,Perce'
                }
            ],
        }).toTypeormQueryBuilder(db.getRepository(User))
        const users = await query.getMany()
        expect(users.length).toBe(2)
    })

    it('filter by mulitple firstName NOT_IN', async () => {
        const query = new ApiQueryOptions<User>({
            where: [
                {
                    key: 'firstName',
                    operator: Operator.NOT_IN,
                    value: 'Amias,Perce'
                }
            ],
        }).toTypeormQueryBuilder(db.getRepository(User))
        const users = await query.getMany()
        expect(users.length).toBe(1)
    })

    it('filter by age LESS_THAN', async () => {
        const query = new ApiQueryOptions<User>({
            where: [
                {
                    key: 'age',
                    operator: Operator.LESS_THAN,
                    value: '22'
                }
            ],
        }).toTypeormQueryBuilder(db.getRepository(User))
        const users = await query.getMany()
        expect(users.length).toBe(1)
        expect(users[0].firstName).toBe('Amias')
    })

    it('filter by age LESS_THAN_OR_EQUAL', async () => {
        const query = new ApiQueryOptions<User>({
            where: [
                {
                    key: 'age',
                    operator: Operator.LESS_THAN_OR_EQUAL,
                    value: '21'
                }
            ],
        }).toTypeormQueryBuilder(db.getRepository(User))
        const users = await query.getMany()
        expect(users.length).toBe(1)
        expect(users[0].firstName).toBe('Amias')
    })


    it('filter by age LESS_THAN_OR_EQUAL', async () => {
        const query = new ApiQueryOptions<User>({
            where: [
                {
                    key: 'age',
                    operator: Operator.LESS_THAN_OR_EQUAL,
                    value: '20'
                }
            ],
        }).toTypeormQueryBuilder(db.getRepository(User))
        const users = await query.getMany()
        expect(users.length).toBe(0)
    })


    it('filter by age MORE_THAN', async () => {
        const query = new ApiQueryOptions<User>({
            where: [
                {
                    key: 'age',
                    operator: Operator.MORE_THAN,
                    value: '22'
                }
            ],
        }).toTypeormQueryBuilder(db.getRepository(User))
        const users = await query.getMany()
        expect(users.length).toBe(2)
    })
    // TODO: Less than, Less than or equal

    it('list users, limit to 1', async () => {
        const query = new ApiQueryOptions<User>({
            limit: 1,
            relations: [
                {
                    name: 'organization'
                }
            ]
        }).toTypeormQueryBuilder(db.getRepository(User))
        const user = await query.getMany()
        expect(user.length).toBe(1)
        expect(user[0].organization).toBeDefined()
    })

    it('list users by organization name', async () => {
        const query = new ApiQueryOptions<User>({
            where: [
                {
                    key: 'organization.name',
                    operator: Operator.EQUAL,
                    value: 'Truper Corp.'
                }
            ],
            relations: [
                {
                    name: 'organization'
                }
            ]
        }).toTypeormQueryBuilder(db.getRepository(User))
        const user = await query.getMany()
        expect(user.length).toBe(3)
        expect(user[0].organization).toBeDefined()
    })

    it('list users by organization name - no result', async () => {
        const query = new ApiQueryOptions<User>({
            where: [
                {
                    key: 'organization.name',
                    operator: Operator.EQUAL,
                    value: 'Krogith Inc.'
                }
            ],
            relations: [
                {
                    name: 'organization'
                }
            ]
        }).toTypeormQueryBuilder(db.getRepository(User))
        const user = await query.getMany()
        expect(user.length).toBe(0)
    })

    it('filter by jsonb', async () => {
        const query = new ApiQueryOptions<Organization>({
            where: [
                {
                    key: 'address.city',
                    operator: Operator.EQUAL,
                    value: 'Tokyo'
                }
            ],
        }).toTypeormQueryBuilder(db.getRepository(Organization))
        const orgs = await query.getMany()
        expect(orgs.length).toBe(1)
        expect(orgs[0].address.city).toBe('Tokyo')
    })

    it('order by', async () => {
        const query = new ApiQueryOptions<User>({
            orderBy: [
                {
                    key: 'age',
                    direction: 'ASC'
                }
            ],
        }).toTypeormQueryBuilder(db.getRepository(User))
        const users = await query.getMany()
        expect(users.length).toBe(3)
        expect(users[0].age).toBe(21)
        expect(users[1].age).toBe(28)
        expect(users[2].age).toBe(48)
    })

    it('multiple filter', async () => {
        const query = new ApiQueryOptions<User>({
            where: [
                {
                    key: 'lastName',
                    operator: Operator.EQUAL,
                    value: 'Fito'
                },
                {
                    key: 'age',
                    operator: Operator.EQUAL,
                    value: '48'
                }
            ],
        }).toTypeormQueryBuilder(db.getRepository(User))
        const users = await query.getMany()
        expect(users[0].firstName).toBe('Perce')
    })

    it('multiple filter (with relation)', async () => {
        const query = new ApiQueryOptions<User>({
            where: [
                {
                    key: 'organization.name',
                    operator: Operator.EQUAL,
                    value: 'Truper Corp.'
                },
                {
                    key: 'age',
                    operator: Operator.EQUAL,
                    value: '48'
                }
            ],
            relations: [{
                name: 'organization'
            }]
        }).toTypeormQueryBuilder(db.getRepository(User))
        const users = await query.getMany()
        expect(users[0].firstName).toBe('Perce')
    })

    it('multiple filter (with relation, url)', async () => {
        const url = '?filters=organization.name~EQUAL~Truper Corp.,age~EQUAL~48&relations=organization~JOIN'
        const query = new ApiQueryOptions<User>().fromUrl(url).toTypeormQueryBuilder(db.getRepository(User))
        const users = await query.getMany()
        expect(users[0].firstName).toBe('Perce')
    })
})