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
                    name: 'organizations'
                }
            ]
        })
        console.log(query)
        console.log(query.toTypeOrmQuery())
        const userRepository = db.getRepository(User)
        const user = await userRepository.findOne(query.toTypeOrmQuery())

        expect(user.firstName).toBe(usersSeed[0].firstName)
        expect(user.organization).toBeDefined()
    })
})