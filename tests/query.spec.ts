import { DataSource } from 'typeorm'
import TestDataSource from "./utils/ormconfig"
import { seed } from "./utils/seed"
import { User } from './entities'
import { ApiQueryOptions, Operator } from '../src'
import { usersSeed } from './utils/seed-data'

describe('Query', () => {
    let db: DataSource

    beforeAll(async () => {
        db = TestDataSource
        await db.initialize()
        await seed(db)
    })

    it('filter by username (url)', async () => {
        const url = '?filters=firstName~EQUAL~Amias&limit=10'
        const query = new ApiQueryOptions<User>().fromUrl(url).toTypeOrmQuery()
        
        const userRepository = db.getRepository(User)
        const user = await userRepository.findOne(query)

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
        }).toTypeOrmQuery()
        
        const userRepository = db.getRepository(User)
        const user = await userRepository.findOne(query)

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
        })
        const userRepository = db.getRepository(User)
        const user = await userRepository.findOne(query.toTypeOrmQuery())
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
        })
        const userRepository = db.getRepository(User)
        const users = await userRepository.find(query.toTypeOrmQuery())
        for (const user of users) {
            expect(user.firstName).not.toBe('Amias')
        }
    })

    it('filter by username LIKE', async () => {
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
        const users = await userRepository.find(query.toTypeOrmQuery())
        for (const user of users) {
            expect(user.firstName).toBe('Amias')
        }
    })

    it('filter by age BETWEEN', async () => {
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
        const users = await userRepository.find(query.toTypeOrmQuery())
        for (const user of users) {
            expect(user.firstName).toBe('Amias')
        }
    })

    it('filter by age IN', async () => {
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
        const users = await userRepository.find(query.toTypeOrmQuery())
        expect(users.length).toBe(1)
    })

    it('filter by firstName IN', async () => {
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
        const users = await userRepository.find(query.toTypeOrmQuery())
        expect(users.length).toBe(2)
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
        })
        const userRepository = db.getRepository(User)
        const users = await userRepository.find(query.toTypeOrmQuery())
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
        })
        const userRepository = db.getRepository(User)
        const users = await userRepository.find(query.toTypeOrmQuery())
        expect(users.length).toBe(1)
        expect(users[0].firstName).toBe('Amias')
    })

    it('filter by age LESS_THAN_OR_EQUAL - no result', async () => {
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
        const users = await userRepository.find(query.toTypeOrmQuery())
        expect(users.length).toBe(0)
    })

    it('list users, limit to 1', async () => {
        const query = new ApiQueryOptions<User>({
            limit: 1,
            relations: [
                {
                    name: 'organization'
                }
            ]
        })
        const userRepository = db.getRepository(User)
        const user = await userRepository.find(query.toTypeOrmQuery())
        expect(user.length).toBe(1)
        expect(user[0].organization).toBeDefined()
    })
})