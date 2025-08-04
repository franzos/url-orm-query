import { DataSource } from "typeorm"
import { Organization, User } from '../entities'

const connection = () => {
    return new DataSource({
        type: 'postgres',
        url: 'postgres://postgres:postgres@url_orm_query_postgres:5432/dev',
        dropSchema: true,
        synchronize: true,
        migrationsRun: false,  // Disable migrations for tests
        entities: [User, Organization],
    })
}

export default connection()