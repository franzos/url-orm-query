import { Organization, User } from "../entities"
import { USER_ROLE } from "../entities/user-roles"

export const oranizationsSeed: Partial<Organization>[] = [
    {
        name: 'Truper Corp.',
        type: 'Limited',
        address: {
            city: 'New York',
            country: 'USA',
        }
    },
    {
        name: 'Krogith Inc.',
        type: 'Public',
        address: {
            city: 'Lisbon',
            country: 'Portugal',
        }
    },
    {
        name: 'Pence Corp.',
        type: 'Limited',
        address: {
            city: 'Tokyo',
            country: 'Japan',
        }
    }
]

export const usersSeed: Partial<User>[]  = [
    {
        firstName: 'Amias',
        lastName: 'Fito',
        age: 21,
        email: 'amias.fito@gmail.com',
        role: USER_ROLE.EMPLOYEE,
        organization: undefined,
    },
    {
        firstName: 'Perce',
        lastName: 'Fito',
        age: 48,
        email: 'perce.fito@gmail.com',
        role: USER_ROLE.EMPLOYEE,
        organization: undefined,
    },
    {
        firstName: 'Stine',
        lastName: 'Aarti',
        age: 28,
        email: 'stine.aarti@gmail.com',
        role: USER_ROLE.MANAGER,
        organization: undefined,
    },
]