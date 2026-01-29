import { Driver, UpgradeContext, TransformationResult, Change } from '@larade/core';
import { ParserRegistry } from '@larade/core';
import { PhpDriver } from '@larade/driver-php';
import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import { LaravelVersionTransformer } from './transformers/LaravelVersionTransformer';
import { Laravel9To10Transformer } from './transformers/Laravel9To10Transformer';
import { Laravel10To11Transformer } from './transformers/Laravel10To11Transformer';
import { PackageDependencyHandler } from './utils/PackageDependencyHandler';

export class LaravelDriver extends Driver {
    name = 'laravel';
    supportedVersions = ['9', '10', '11'];

    private transformers: Map<string, LaravelVersionTransformer[]> = new Map();
    private parserRegistry: ParserRegistry;
    private packageHandler: PackageDependencyHandler;

    constructor(parserRegistry: ParserRegistry, phpDriver?: PhpDriver) {
        super();
        this.parserRegistry = parserRegistry;
        this.packageHandler = new PackageDependencyHandler();
        this.registerTransformers();

        if (phpDriver) {
            this.addDependency(phpDriver);
        }
    }

    async detect(projectPath: string): Promise<boolean> {
        try {
            const composerPath = path.join(projectPath, 'composer.json');
            const content = await fs.readFile(composerPath, 'utf-8');
            const composer = JSON.parse(content);

            return composer.require?.['laravel/framework'] !== undefined;
        } catch {
            return false;
        }
    }

    async getCurrentVersion(projectPath: string): Promise<string> {
        const composerPath = path.join(projectPath, 'composer.json');
        const content = await fs.readFile(composerPath, 'utf-8');
        const composer = JSON.parse(content);

        const version = composer.require['laravel/framework'];
        const versionMatch = version.match(/(\d+)\./);

        if (versionMatch) {
            return versionMatch[1];
        }

        return '10';
    }

    getUpgradePath(from: string, to: string): string[] {
        const versions = this.supportedVersions;
        const fromIndex = versions.indexOf(from);
        const toIndex = versions.indexOf(to);

        if (fromIndex === -1 || toIndex === -1) {
            throw new Error(`Invalid version range: ${from} -> ${to}`);
        }

        if (fromIndex > toIndex) {
            throw new Error(`Cannot downgrade from ${from} to ${to}`);
        }

        return versions.slice(fromIndex, toIndex + 1);
    }

    async transform(context: UpgradeContext): Promise<TransformationResult[]> {
        const results: TransformationResult[] = [];

        const key = `${context.fromVersion}-${context.toVersion}`;
        const transformers = this.transformers.get(key) || [];

        if (transformers.length === 0) {
            console.log(`No transformers found for Laravel ${context.fromVersion} -> ${context.toVersion}`);
            return results;
        }

        const files = await this.findLaravelFiles(context.projectPath);

        for (const filePath of files) {
            const content = await fs.readFile(filePath, 'utf-8');
            let transformedContent = content;
            const changes: Change[] = [];

            for (const transformer of transformers) {
                if (transformer.filePattern.test(filePath)) {
                    const result = await transformer.transform(filePath, transformedContent, this.parserRegistry);
                    transformedContent = result.content;
                    changes.push(...result.changes);
                }
            }

            if (changes.length > 0) {
                results.push({
                    filePath,
                    originalContent: content,
                    transformedContent,
                    changes
                });
            }
        }

        const composerResult = await this.updateComposerJson(context);
        if (composerResult) {
            results.push(composerResult);
        }

        return results;
    }

    private registerTransformers(): void {
        this.transformers.set('9-10', [new Laravel9To10Transformer()]);
        this.transformers.set('10-11', [new Laravel10To11Transformer()]);
    }

    private async findLaravelFiles(projectPath: string): Promise<string[]> {
        const patterns = [
            'app/**/*.php',
            'routes/**/*.php',
            'config/**/*.php',
            'database/**/*.php',
            '!vendor/**',
            '!node_modules/**'
        ];

        const files: string[] = [];

        for (const pattern of patterns) {
            const matches = await glob(pattern, {
                cwd: projectPath,
                absolute: true,
                ignore: ['**/vendor/**', '**/node_modules/**']
            });
            files.push(...matches);
        }

        return files;
    }

    private async updateComposerJson(context: UpgradeContext): Promise<TransformationResult | null> {
        const composerPath = path.join(context.projectPath, 'composer.json');

        try {
            const content = await fs.readFile(composerPath, 'utf-8');
            const composer = JSON.parse(content);
            const changes: Change[] = [];

            if (composer.require?.['laravel/framework']) {
                const oldVersion = composer.require['laravel/framework'];
                composer.require['laravel/framework'] = `^${context.toVersion}.0`;

                changes.push({
                    type: 'modify',
                    line: 0,
                    description: `Update Laravel framework from ${oldVersion} to ^${context.toVersion}.0`,
                    before: `"laravel/framework": "${oldVersion}"`,
                    after: `"laravel/framework": "^${context.toVersion}.0"`
                });
            }

            const packageUpgrades = this.packageHandler.getRequiredPackageUpgrades(context.toVersion);

            for (const upgrade of packageUpgrades) {
                if (composer.require?.[upgrade.name]) {
                    const oldVersion = composer.require[upgrade.name];
                    composer.require[upgrade.name] = upgrade.to;

                    changes.push({
                        type: 'modify',
                        line: 0,
                        description: `Update ${upgrade.name} from ${oldVersion} to ${upgrade.to}`,
                        before: `"${upgrade.name}": "${oldVersion}"`,
                        after: `"${upgrade.name}": "${upgrade.to}"`
                    });
                }
            }

            if (changes.length > 0) {
                return {
                    filePath: composerPath,
                    originalContent: content,
                    transformedContent: JSON.stringify(composer, null, 2) + '\n',
                    changes
                };
            }
        } catch (error) {
            console.error('Error updating composer.json:', error);
        }

        return null;
    }

    async beforeUpgrade(context: UpgradeContext): Promise<void> {
        console.log(`\nPreparing Laravel upgrade from ${context.fromVersion} to ${context.toVersion}...`);

        const upgrades = this.packageHandler.getRequiredPackageUpgrades(context.toVersion);
        if (upgrades.length > 0) {
            console.log('\nPackage dependencies that will be upgraded:');
            upgrades.forEach(upgrade => {
                console.log(`  - ${upgrade.name}: ${upgrade.from} -> ${upgrade.to}`);
            });
        }
    }

    async afterUpgrade(context: UpgradeContext): Promise<void> {
        console.log(`\n✓ Laravel upgrade from ${context.fromVersion} to ${context.toVersion} completed!`);
        console.log('\nNext steps:');
        console.log('  1. Run: composer update');
        console.log('  2. Run: php artisan migrate');
        console.log('  3. Clear cache: php artisan cache:clear');
        console.log('  4. Test your application thoroughly');
    }
}
