# Quick Start Guide

## Installation & Build

```bash
cd larade
npm install
./build.sh
```

## Test the Tool

### 1. Detect Frameworks

```bash
cd example-project
node ../packages/cli/dist/index.js detect
```

Expected output:
```
Detecting frameworks...

Detected frameworks:
  ✓ php (v8.0)
  ✓ laravel (v10)
```

### 2. Preview Upgrade (Dry Run)

```bash
node ../packages/cli/dist/index.js upgrade laravel 10 11 --dry-run
```

This will show you all changes that would be made without actually applying them.

### 3. Apply Upgrade

```bash
node ../packages/cli/dist/index.js upgrade laravel 10 11
```

This will:
- Create a new git branch
- Update composer.json (Laravel framework + packages)
- Transform PHP code (Str::contains → str_contains, etc.)
- Update model properties ($dates → $casts)
- Commit changes

### 4. View Git Changes

```bash
git log -1 --stat
git diff HEAD~1
```

## Available Commands

### List Available Drivers

```bash
node packages/cli/dist/index.js list-drivers
```

### Upgrade PHP Version

```bash
cd example-project
node ../packages/cli/dist/index.js upgrade php 8.0 8.1 --dry-run
```

### Create Pull Request (Requires GitHub Token)

```bash
export GITHUB_TOKEN=your_token
node ../packages/cli/dist/index.js upgrade laravel 10 11 --pr
```

## Understanding the Output

When you run an upgrade, you'll see:

1. **Upgrade Path**: Shows version steps (e.g., 10 → 11)
2. **Modified Files**: List of all changed files
3. **Changes per File**: Specific transformations applied
4. **Before/After**: Shows old and new code

Example output:
```
Upgrading laravel from 10 to 11...

Upgrade path: 10 -> 11

app/Models/User.php:
  ~ Replace Str::contains() with native str_contains()
    - if (Str::contains($this->roles, $role)) {
    + if (str_contains($this->roles, $role)) {

  ~ Replace $dates with $casts (Laravel 11 deprecation)
    - protected $dates = [
    + protected $casts = [ // Update values to 'datetime' cast

composer.json:
  ~ Update Laravel framework from ^10.0 to ^11.0

✓ Upgrade completed successfully!
```

## Next Steps

1. **Explore the Code**: Check out how drivers are implemented
2. **Add Transformers**: Create new version transformers
3. **Extend Drivers**: Add support for more frameworks
4. **Test Edge Cases**: Try upgrading different Laravel projects

## Common Issues

### Build Errors

If build fails, try:
```bash
cd packages/core && npm install --legacy-peer-deps
cd ../driver-php && npm install --legacy-peer-deps
cd ../driver-laravel && npm install --legacy-peer-deps
cd ../cli && npm install --legacy-peer-deps
```

### Git Errors

If you see "uncommitted changes" error:
```bash
cd example-project
git add .
git commit -m "Save work"
```

### Missing Dependencies

Make sure you're in the correct directory:
```bash
cd larade
./build.sh
```
