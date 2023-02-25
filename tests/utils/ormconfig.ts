import { DataSource } from "typeorm"
import { Organization, User } from '../entities'

const connection = () => {
    return new DataSource({
        type: 'postgres',
        url: 'postgres://postgres:postgres@127.0.0.1:5432/dev',
        dropSchema: true,
        synchronize: true,
        migrationsRun: true,
        entities: [User, Organization],
        migrations: [__dirname + '../migrations/*.ts'],
    })
}

export default connection()