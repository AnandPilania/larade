# Larade - Educational Framework Upgrade Tool

An educational project demonstrating how to build a Laravel Shift alternative with support for PHP and Laravel framework upgrades.

## Architecture

This project uses a driver-based architecture where each framework/library has its own driver that can be registered with the core upgrade engine.

### Key Features

1. **Driver-Based Architecture**: Easily extensible system where drivers can depend on other drivers
2. **Version Transformers**: Each version upgrade is handled by dedicated transformer classes
3. **Git Integration**: Automatic branch creation, commits, and PR generation
4. **Package Dependency Management**: Automatically updates related packages when upgrading Laravel
5. **Dry Run Mode**: Preview changes before applying them

### Project Structure

```
larade/
├── packages/
│   ├── core/                      # Core upgrade engine
│   │   ├── src/
│   │   │   ├── Driver.ts          # Abstract driver class
│   │   │   ├── UpgradeEngine.ts   # Main orchestrator
│   │   │   ├── services/
│   │   │   │   └── GitService.ts  # Git operations
│   │   │   └── parsers/
│   │   │       └── ParserRegistry.ts
│   │   └── package.json
│   │
│   ├── driver-php/                # PHP driver
│   │   ├── src/
│   │   │   ├── PhpDriver.ts
│   │   │   └── transformers/
│   │   │       ├── Php74To80Transformer.ts
│   │   │       ├── Php80To81Transformer.ts
│   │   │       └── Php81To82Transformer.ts
│   │   └── package.json
│   │
│   ├── driver-laravel/            # Laravel driver (depends on PHP driver)
│   │   ├── src/
│   │   │   ├── LaravelDriver.ts
│   │   │   ├── transformers/
│   │   │   │   ├── Laravel9To10Transformer.ts
│   │   │   │   └── Laravel10To11Transformer.ts
│   │   │   └── utils/
│   │   │       └── PackageDependencyHandler.ts
│   │   └── package.json
│   │
│   └── cli/                       # CLI interface
│       ├── src/
│       │   └── index.ts
│       └── package.json
│
└── example-project/               # Example Laravel project for testing
```

## How It Works

### 1. Driver Dependencies

Laravel driver depends on PHP driver. When upgrading Laravel, it automatically triggers PHP upgrades first:

```typescript
const phpDriver = new PhpDriver(parserRegistry);
const laravelDriver = new LaravelDriver(parserRegistry, phpDriver);

laravelDriver.addDependency(phpDriver);
```

### 2. Version Transformers

Each version upgrade (e.g., Laravel 10 → 11) is handled by a dedicated transformer class:

```typescript
class Laravel10To11Transformer extends LaravelVersionTransformer {
  fromVersion = '10';
  toVersion = '11';
  filePattern = /\.php$/;

  async transform(filePath, content, parserRegistry) {
    // Apply transformations specific to this upgrade
  }
}
```

### 3. Package Dependency Management

The `PackageDependencyHandler` manages package upgrades that need to happen alongside framework upgrades:

```typescript
// When upgrading to Laravel 11, these packages are also upgraded:
{ name: 'laravel/sanctum', from: '^3.0', to: '^4.0' }
{ name: 'laravel/tinker', from: '^2.7', to: '^2.9' }
```

### 4. Git Workflow

```
1. Detect uncommitted changes → Abort if found
2. Create feature branch (e.g., upgrade-laravel-10-to-11)
3. Apply transformations
4. Commit changes with descriptive message
5. Optionally push and create PR
```

## Installation

```bash
cd larade
npm install
npm run build
```

## Usage

### Detect Frameworks

```bash
cd example-project
node ../packages/cli/dist/index.js detect
```

Output:
```
Detected frameworks:
  ✓ php (v8.0)
  ✓ laravel (v10)
```

### Dry Run (Preview Changes)

```bash
node ../packages/cli/dist/index.js upgrade laravel 10 11 --dry-run
```

### Apply Upgrade

```bash
node ../packages/cli/dist/index.js upgrade laravel 10 11
```

### Upgrade with PR Creation

```bash
export GITHUB_TOKEN=your_token_here
node ../packages/cli/dist/index.js upgrade laravel 10 11 --pr
```

### Custom Branch Name

```bash
node ../packages/cli/dist/index.js upgrade laravel 10 11 -b feature/upgrade-to-laravel-11
```

## What Gets Upgraded

### Laravel 10 → 11

1. **Helper Functions**: `Str::contains()` → `str_contains()`
2. **Model Properties**: `$dates` → `$casts`
3. **Kernel File**: Flags removal (moved to bootstrap/app.php)
4. **Package Dependencies**: Updates Sanctum, Tinker, etc.
5. **Composer**: Updates laravel/framework version

### PHP 7.4 → 8.0

1. **String Functions**: `strpos() === 0` → `str_starts_with()`
2. **Array Functions**: `array_key_exists($key, $this)` → proper property check
3. **Composer**: Updates PHP version requirement

## Example Transformations

### Before (Laravel 10)

```php
class User extends Model
{
    protected $dates = ['created_at', 'updated_at'];

    public function hasRole($role)
    {
        if (Str::contains($this->roles, $role)) {
            return true;
        }
        return Str::startsWith($role, 'admin');
    }
}
```

### After (Laravel 11)

```php
class User extends Model
{
    protected $casts = ['created_at' => 'datetime', 'updated_at' => 'datetime'];

    public function hasRole($role)
    {
        if (str_contains($this->roles, $role)) {
            return true;
        }
        return str_starts_with($role, 'admin');
    }
}
```

## Extending with New Drivers

### 1. Create Driver Package

```bash
mkdir -p packages/driver-tailwind/src
```

### 2. Implement Driver Class

```typescript
export class TailwindDriver extends Driver {
  name = 'tailwind';
  supportedVersions = ['2.0', '3.0', '4.0'];

  async detect(projectPath: string): Promise<boolean> {
    // Check for tailwind.config.js
  }

  async transform(context: UpgradeContext): Promise<TransformationResult[]> {
    // Apply tailwind-specific transformations
  }
}
```

### 3. Register with Engine

```typescript
const tailwindDriver = new TailwindDriver(parserRegistry);
engine.registerDriver(tailwindDriver);
```

## Limitations (Educational Project)

This is an educational project demonstrating the concepts. Production-ready improvements would include:

1. **Better AST Parsing**: Use proper PHP/JS parsers instead of regex
2. **More Transformers**: Cover all breaking changes in each version
3. **Test Suite**: Comprehensive tests for all transformations
4. **Error Recovery**: Better error handling and rollback mechanisms
5. **Configuration**: Allow users to customize transformation rules
6. **Validation**: Pre and post-upgrade validation checks

## Key Concepts Demonstrated

1. ✅ **Driver Pattern**: Pluggable architecture for different frameworks
2. ✅ **Dependency Management**: Drivers can depend on other drivers
3. ✅ **Version Transformers**: Separate classes for each version upgrade
4. ✅ **Git Integration**: Automated branching and PR creation
5. ✅ **Package Dependencies**: Automatic related package updates
6. ✅ **Dry Run**: Preview changes before applying
7. ✅ **Centralized Logic**: Core engine handles orchestration

## License

MIT - Educational purposes only
