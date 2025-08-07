# Changelog

## [0.2.1] - 2025-08-07

### Added
- OR/AND query groups support with `filterGroups` parameter for complex conditions

## [0.2.0] - 2025-08-01

### Added
- Input validation with ValidationError class
- Field validation against entity metadata

### Changed
- **BREAKING**: Improved type safety for query parameters
- Refactored into modular architecture (QueryParser, QueryBuilder, validation)
- Standardized API naming: `toTypeOrmQueryBuilder`

### Fixed
- Parameter name conflicts in complex queries
- Issue where `toUrl()` with relations would result in queries like `relations=user~undefined`
- Type compatibility issues

## [0.1.2] - 2025-08-01
### Fixed
- Dependencies lock

## [0.1.1] - 2025-08-01

### Changed
- Add CI automation

## [0.1.0] - 2025-08-01

### Changed
- Make TypeORM dependency optional
- Bump dependencies
- Clean up tests: Bump node to v22, remove network_mode 'host'

### Fixed
- ESM Module export
- Fix type exports