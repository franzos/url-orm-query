# Api Query Library (URL to ORM)

This library makes it easy to pass query params from front-end, via URL params, to a TypeORM backend.

It's hardly complete and only useful for basic needs.

## Supported Operators

Depends on whether you use find options (fo) or query builder (qb).

- EQUAL (fo, qb)
- NOT (fo, qb)
- LIKE (fo, qb)
- ILIKE (fo, qb)
- BETWEEN (fo, qb)
- IN (fo, qb)
- NOT_IN (qb)
- ANY (fo)
- LESS_THAN (fo, qb)
- LESS_THAN_OR_EQUAL (fo, qb)
- MORE_THAN (fo, qb)
- MORE_THAN_OR_EQUAL (fo, qb)

## TODO

- Support for more operators
- Type safety
- Validation

# Usage

Typeorm supports two approaches:

1. Find options: https://typeorm.io/find-options
2. Query builder: https://typeorm.io/select-query-builder

Option 1 is more convinient but does not support querying JSONB: https://github.com/typeorm/typeorm/issues/2256. I generally recommend to use 2 - the Query builder.

Frontent:

```typescript
const query = new ApiQueryOptions<User>({
    where: [
        {
            key: 'firstName',
            operator: Operator.EQUAL,
            value: 'Some'
        }
    ],
    relations: ['organization'],
    limit: 10
    offset: 0
}).toUrl()
```

## Find options

Backend:

```typescript
const url = '?filters=firstName~EQUAL~Some'
const query = new ApiQueryOptions<User>().fromUrl(url).toTypeOrmQuery()
const userRepository = db.getRepository(User)
const user = await userRepository.findOne(query)
```

## Query builder

Backend:

```typescript
const url = '?filters=firstName~EQUAL~Some'
const query = new ApiQueryOptions<User>().fromUrl(url).toTypeormQueryBuilder(db.getRepository(Organization))
const user = await query.getOne()
```

All filter options:

```bash
?filters=firstName~EQUAL~Some
&relations=organization~JOIN
&orderBy=age~ASC
&limit=10
&offset=0
```

Multiple filter:

```bash
?filters=organization.name~EQUAL~Truper Corp.,
age~EQUAL~48
&relations=organization~JOIN
```

# Tests

Run tests:

```bash
docker-compose up --abort-on-container-exit
```

Cleanup:

```bash
docker-compose down
```

# Development

## Tests

Run tests in watch mode:

```bash
docker-compose run app pnpm run test:watch
```

## Migrations

Create a new migration (replace 'initial' with the name of the migration):

```bash
docker-compose run app pnpm run typeorm migration:generate tests/migrations/initial
```