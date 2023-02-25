import { DataSource } from 'typeorm'
import { Organization, User } from '../entities'
import { oranizationsSeed, usersSeed } from './seed-data'

export const seed = async (connection: DataSource) => {
    const organizationRepository = connection.getRepository(Organization)
    const userRepository = connection.getRepository(User)

    const organizations = await organizationRepository.save(oranizationsSeed)
    await userRepository.save(usersSeed.map(user => ({ ...user, organizations: organizations[0] })))
}