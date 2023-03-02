import { DataSource } from 'typeorm'
import TestDataSource from "./utils/ormconfig"
import { seed } from "./utils/seed"
import { Organization, User } from './entities'
import { ApiQueryOptions, Operator } from '../src'
import { usersSeed } from './utils/seed-data'

describe('Query', () => {
    let db: DataSource

    beforeAll(async () => {
        db = TestDataSource
        await db.initialize()
        await seed(db)
    })

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
            expect(user.firstName).toBe('Amias')
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

    // TODO: Not supported by typeorm https://github.com/typeorm/typeorm/issues/2256
    // it('filter by jsonb', async () => {
    //     const entityMeta = db.entityMetadatas.find(c => c.name === Organization.name)
    //     const query = new ApiQueryOptions<Organization>({
    //         where: [
    //             {
    //                 key: 'address.city',
    //                 operator: Operator.EQUAL,
    //                 value: 'Tokyo'
    //             }
    //         ],
    //     })
    //     const orgRepository = db.getRepository(Organization)
    //     const orgs = await orgRepository.find(query.toTypeOrmQuery(entityMeta))
    //     console.log(orgs)
    //     expect(orgs.length).toBe(1)
    //     expect(orgs[0].address.city).toBe('Tokyo')
    // })

    /**
     * Typeorm Query Builder
     */

    it('builder: filter by username (url)', async () => {
        const url = '?filters=firstName~EQUAL~Amias&limit=10'
        const query = new ApiQueryOptions<User>().fromUrl(url).toTypeormQueryBuilder(db.getRepository(User))
        const user = await query.getOne()

        expect(user.firstName).toBe(usersSeed[0].firstName)
    })

    it('builder: filter by username', async () => {
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

    it('builder: filter by username and join relation', async () => {
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

    it('builder: filter by username NOT', async () => {
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

    it('builder: filter by age IN', async () => {
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

    it('builder: filter by firstName IN', async () => {
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

    // TODO: Less than, Less than or equal



    it('builder: list users, limit to 1', async () => {
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

    it('builder: list users by organization name', async () => {
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

    it('builder: list users by organization name - no result', async () => {
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

    it('builder: filter by jsonb', async () => {
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
        console.log(orgs)
        expect(orgs.length).toBe(1)
        expect(orgs[0].address.city).toBe('Tokyo')
    })
})