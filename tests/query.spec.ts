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
        const url = '?filters=firstName~EQUAL~Some&limit=10'
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
                    value: 'Some'
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
                    value: 'Some'
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
                    value: 'Some'
                }
            ],
        })
        const userRepository = db.getRepository(User)
        const users = await userRepository.find(query.toTypeOrmQuery())
        for (const user of users) {
            expect(user.firstName).not.toBe('Some')
        }
    })

    it('filter by username LIKE', async () => {
        const query = new ApiQueryOptions<User>({
            where: [
                {
                    key: 'firstName',
                    operator: Operator.LIKE,
                    value: 'Som'
                }
            ],
        })
        const userRepository = db.getRepository(User)
        const users = await userRepository.find(query.toTypeOrmQuery())
        for (const user of users) {
            expect(user.firstName).toBe('Some')
        }
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