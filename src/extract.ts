import { Join, Operator } from "./enums"

export function parseFilters<T>(input: string) {
    return input.split(',').map(filter => {
        const filters = filter.split('~')
        if (filters.length === 2) {
            const [key, value] = filters
            return {
                key: key as T[keyof T],
                operator: Operator.EQUAL,
                value: value as T[keyof T]
            }
        } else {
            const [key, operator, value] = filters
            return {
                key: key as T[keyof T],
                operator: operator as Operator,
                value: value as T[keyof T]
            }
        }
    })
}

export function parseRelations<T>(input: string) {
    return input.split(',').map(relation => {
        const relations = relation.split('~')
        // If no join type is specified, default to LEFT_SELECT
        if (relations.length === 1) {
            return {
                name: relations[0],
                join: Join.LEFT_SELECT
            }
        } else {
            const [name, join] = relations
            return {
                name,
                join: join as Join
                // TODO: add type
            } as any
        }
    })
}

export function parseOrderBy<T>(input: string) {
    return input.split(',').map(orderBy => {
        const [key, direction] = orderBy.split('~')
        return {
            key,
            direction
        } as any
    })
}