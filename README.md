# Api Query Library (URL to ORM)

This library makes it easy to pass query params from front-end, via URL query params, to a TypeORM backend.

**WIP**: There are still a bunch of issues including:

- Support for more operators
- More type safety
- Validation

# Usage

Frontent:

```typescript
const query = new ApiQueryOptions<User>({
    where: [
        {
            key: 'firstName',
            operator: Operator.EQUAL,
            value: 'Some'
        }
    ]
}).toUrl()
```

Backend:

```typescript
const url = '?filters=firstName~EQUAL~Some'
const query = new ApiQueryOptions<User>().fromUrl(url).toTypeOrmQuery()
const userRepository = db.getRepository(User)
const user = await userRepository.findOne(query)
```


# Tests

Run tests:

```bash
docker-compose up
```

Cleanup:

```bash
docker-compose down
```


# Migrations

Create a new migration (replace 'initial' with the name of the migration):

```bash
pnpm run typeorm migration:generate tests/migrations/initial
```