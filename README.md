# TypeORM Frontend Query Library (URL to ORM)

This library makes it easy to pass query params from front-end, via URL params, to a TypeORM backend. Tested with TypeORM `^0.3.25`.

**Version:** 0.2.0

**Important: This is just an old toy-project that shouldn't be used in production.**

## Installation

with pnpm:

```bash
pnpm install url-orm-query
```

with npm:

```bash
npm install url-orm-query
```

## Supported Operators

### Filters

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

### Relations

- INNER (qb)
- LEFT (qb)
- LEFT_SELECT (qb)
- INNER_SELECT (qb)

## TODO

- Support for more operators
- Type safety
- Validation

## Features

- **Basic Filtering**: Standard WHERE conditions with various operators
- **OR/AND Groups**: Complex queries with grouped conditions using OR/AND logic
- **Relations**: Join tables with different join types
- **Sorting**: Order by multiple fields
- **Pagination**: Limit/offset support
- **URL Serialization**: Convert queries to/from URL parameters
- **TypeORM Integration**: Works with both FindOptions and QueryBuilder

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
    relations: [{
        name: 'organization',
        type: Join.LEFT_SELECT
    }],
    limit: 10
    offset: 0
}).toUrl()
```

## Find options

Backend:

```typescript
const url = '?filters=firstName~EQUAL~Some'
const query = new ApiQueryOptions<User>()
    .fromUrl(url)
    .toTypeOrmQuery()
const userRepository = db.getRepository(User)
const user = await userRepository.findOne(query)
```

## Query builder

Backend:

```typescript
const url = '?filters=firstName~EQUAL~Some'
const query = new ApiQueryOptions<User>()
    .fromUrl(url)
    .toTypeormQueryBuilder(db.getRepository(Organization))
const user = await query.getOne()
```

Chaining:

```typescript
const url = '?filters=firstName~EQUAL~Some'
const query = new ApiQueryOptions<User>()
    .fromUrl(url)
    .addFilter({
        key: 'id',
        operator: Operator.EQUAL,
        value: '4831020f-57f6-4258-8ee2-39c4766727e8'
    })
    .addRelation({
        name: 'organization',
        type: Join.LEFT_SELECT
    })
    .toTypeormQueryBuilder(db.getRepository(Organization))
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

Simple filters (default EQUAL) and relations (default LEFT_SELECT)

```bash
?filters=firstName~Some
&relations=organization
```

## OR/AND Query Groups

Complex queries with OR logic using `filterGroups`:

```typescript
// Programmatic usage
const query = new ApiQueryOptions<User>()
    .addWhereGroup({
        logic: 'OR',
        conditions: [
            { key: 'role', operator: Operator.EQUAL, value: 'admin' },
            { key: 'role', operator: Operator.EQUAL, value: 'moderator' }
        ]
    });

// Generates: WHERE (role = 'admin' OR role = 'moderator')
```

URL format for OR groups:

```bash
# Single OR group
?filterGroups=OR~role~EQUAL~admin,role~EQUAL~moderator

# Multiple groups (separated by |)
?filterGroups=OR~role~EQUAL~admin,role~EQUAL~moderator|AND~status~EQUAL~active,verified~EQUAL~true

# Combined with regular filters
?filters=age~MORE_THAN~18&filterGroups=OR~department~EQUAL~IT,department~EQUAL~HR
```

This generates SQL like:
```sql
WHERE age > 18 AND (department = 'IT' OR department = 'HR')
```

**Important**: OR/AND groups only work with the **Query Builder** approach (`toTypeOrmQueryBuilder()`). They are not supported with Find Options (`toTypeOrmQuery()`) due to TypeORM API limitations. Use Query Builder for complex queries with OR logic.

## Pagination

1. Create pagination object
2. Set total number of results
3. Use url() to get url for first page
4. Use changePage() to get url for next page

```typescript
const query = new ApiQueryOptions<User>({
    where: [
        {
            key: 'organization.name',
            operator: Operator.EQUAL,
            value: 'Truper Corp.'
        },
    ],
    limit: 10,
})
const pagination = new ApiPagination(query)
pagination.setTotal(100)

const url = pagination.url()
// '?filters=organization.name~EQUAL~Truper Corp.&limit=10'

const urlAfter = pagination.changePage(2)
// '?filters=organization.name~EQUAL~Truper Corp.&limit=10&offset=10'

const page3 = pagination.changePage(3)
// '?filters=organization.name~EQUAL~Truper Corp.&limit=10&offset=20'
```

## Frontend usage example

```typescript
// Set a default query param with 'require: true'. This will when updating or removing other filter.
const query: QueryParamsUpdate<User> = {
    where: [
        {
            key: 'organization.name',
            operator: Operator.EQUAL,
            value: 'Truper Corp.',
            require: true
        },
        {
            key: 'age',
            operator: Operator.EQUAL,
            value: '48'
        }
    ],
    relations: {[
        {
            name: 'organization',
        }
    ]}
    limit: 10,
}

// Store in state
const queryParams = new ApiPagination<User>()
queryParams.loadAndMerge(query)

// Get URL query params for api call
let url = queryParams.url()

// Set total count from backend response
queryParams.setTotal(100)

// Update query params / change page
queryParams.loadAndMerge({
    where: [
        {
            key: 'age',
            operator: Operator.EQUAL,
            value: '50'
        }
    ],
    page: 2
})

// Get new URL query params
url = queryParams.url()
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