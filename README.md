# Api Query Library (URL to ORM)

This library makes it easy to pass query params from front-end, via URL query params, to a TypeORM backend.

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
- LESS_THAN (fo)
- LESS_THAN_OR_EQUAL (fo)
- MORE_THAN (fo)
- MORE_THAN_OR_EQUAL (fo)

## TODO

- Support for more operators
- Support multiple filters
- Type safety
- Validation

# Usage

Typeorm supports two approaches:

1. Find options: https://typeorm.io/find-options
2. Query builder: https://typeorm.io/select-query-builder

Option 1 is more convinient but does not support querying JSONB: https://github.com/typeorm/typeorm/issues/2256

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

```
?filters=firstName~EQUAL~Some
&relations=organization~JOIN
&orderBy=age~ASC
&limit=10
&offset=0
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


# Migrations

Create a new migration (replace 'initial' with the name of the migration):

```bash
docker-compose run app pnpm run typeorm migration:generate tests/migrations/initial
```