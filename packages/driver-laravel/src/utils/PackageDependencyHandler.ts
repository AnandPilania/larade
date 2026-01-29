import * as fs from 'fs/promises';
import * as path from 'path';
import { Change } from '@larade/core';

interface PackageUpgrade {
    name: string;
    from: string;
    to: string;
}

export class PackageDependencyHandler {
    private packageUpgrades: Map<string, PackageUpgrade[]> = new Map();

    constructor() {
        this.registerPackageUpgrades();
    }

    async updatePackageDependencies(
        projectPath: string,
        laravelVersion: string
    ): Promise<{ content: string; changes: Change[] } | null> {
        const composerPath = path.join(projectPath, 'composer.json');

        try {
            const content = await fs.readFile(composerPath, 'utf-8');
            const composer = JSON.parse(content);
            const changes: Change[] = [];

            const upgrades = this.packageUpgrades.get(laravelVersion) || [];

            for (const upgrade of upgrades) {
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
                    content: JSON.stringify(composer, null, 2) + '\n',
                    changes
                };
            }
        } catch (error) {
            console.error('Error updating package dependencies:', error);
        }

        return null;
    }

    private registerPackageUpgrades(): void {
        this.packageUpgrades.set('12', [
            { name: 'php', from: '^8.0', to: '^8.2' },
            { name: 'laravel/sanctum', from: '^3.0', to: '^4.0' },
            { name: 'laravel/tinker', from: '^2.7', to: '^2.9' },
            { name: 'laravel/scout', from: '^10.0', to: '^10.1' },
            { name: 'spatie/laravel-permission', from: '^5.0', to: '^6.0' },
            { name: 'spatie/laravel-multitenancy', from: '^3.0', to: '^3.2' },
            { name: 'spatie/laravel-query-builder', from: '^5.0', to: '^6.0' },
            { name: 'inertiajs/inertia-laravel', from: '^0.6', to: '^1.0' },
            { name: 'nesbot/carbon', from: '^2.0', to: '^3.0' }
        ]);

        this.packageUpgrades.set('11', [
            { name: 'php', from: '^8.0', to: '^8.2' },
            { name: 'laravel/sanctum', from: '^2.0|^3.0', to: '^3.3' },
            { name: 'laravel/tinker', from: '^2.7', to: '^2.9' },
            { name: 'laravel/scout', from: '^9.0', to: '^10.0' },
            { name: 'spatie/laravel-permission', from: '^5.0', to: '^5.11' },
            { name: 'spatie/laravel-multitenancy', from: '^2.0', to: '^3.0' }
        ]);

        this.packageUpgrades.set('10', [
            { name: 'php', from: '^7.0', to: '^8.1' },
            { name: 'laravel/sanctum', from: '^2.0', to: '^3.0' },
            { name: 'laravel/breeze', from: '^1.0', to: '^1.9' },
            { name: 'laravel/scout', from: '^9.0', to: '^9.8' }
        ]);

        this.packageUpgrades.set('9', [
            { name: 'php', from: '^7.0', to: '^8.1' },
            { name: 'laravel/sanctum', from: '^2.15', to: '^2.15' },
            { name: 'laravel/scout', from: '^9.0', to: '^9.4' }
        ]);
    }

    getRequiredPackageUpgrades(laravelVersion: string): PackageUpgrade[] {
        return this.packageUpgrades.get(laravelVersion) || [];
    }
}
