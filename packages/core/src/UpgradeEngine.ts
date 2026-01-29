import { Driver } from './Driver';
import { GitService } from './services/GitService';
import { ParserRegistry } from './parsers/ParserRegistry';
import { UpgradeContext, TransformationResult, UpgradeOptions, ProgressCallback } from './types';
import * as fs from 'fs/promises';

export class UpgradeEngine {
    private drivers: Map<string, Driver> = new Map();
    private parserRegistry: ParserRegistry;
    private githubToken?: string;
    private progressCallback?: ProgressCallback;

    constructor(githubToken?: string) {
        this.parserRegistry = new ParserRegistry();
        this.githubToken = githubToken;
    }

    registerDriver(driver: Driver): void {
        this.drivers.set(driver.name, driver);
    }

    getDriver(name: string): Driver | undefined {
        return this.drivers.get(name);
    }

    getParserRegistry(): ParserRegistry {
        return this.parserRegistry;
    }

    setProgressCallback(callback: ProgressCallback): void {
        this.progressCallback = callback;
        this.drivers.forEach(driver => driver.setProgressCallback(callback));
    }

    async detectDrivers(projectPath: string): Promise<Driver[]> {
        const detectedDrivers: Driver[] = [];

        for (const [_, driver] of this.drivers) {
            const detected = await driver.detect(projectPath);
            if (detected) {
                detectedDrivers.push(driver);
            }
        }

        return detectedDrivers;
    }

    async upgrade(
        projectPath: string,
        driverName: string,
        fromVersion: string,
        toVersion: string,
        options: UpgradeOptions = {}
    ): Promise<TransformationResult[]> {
        const driver = this.drivers.get(driverName);
        if (!driver) {
            throw new Error(`Driver ${driverName} not found`);
        }

        this.reportProgress('detecting', `Initializing ${driverName} upgrade...`, 0, 5);

        const gitService = new GitService(projectPath, this.githubToken);

        if (!options.dryRun) {
            const hasChanges = await gitService.hasUncommittedChanges();
            if (hasChanges) {
                throw new Error('Repository has uncommitted changes. Please commit or stash them first.');
            }
        }

        const upgradePath = driver.getUpgradePath(fromVersion, toVersion);
        console.log(`Upgrade path: ${upgradePath.join(' -> ')}`);

        const allResults: TransformationResult[] = [];
        const totalVersions = upgradePath.length - 1;

        for (let i = 0; i < upgradePath.length - 1; i++) {
            const from = upgradePath[i];
            const to = upgradePath[i + 1];

            this.reportProgress(
                'preparing',
                `Upgrading ${driverName} from ${from} to ${to}...`,
                i + 1,
                totalVersions
            );

            const context: UpgradeContext = {
                projectPath,
                fromVersion: from,
                toVersion: to,
                dryRun: options.dryRun || false,
                files: new Map(),
                metadata: {}
            };

            if (!options.dryRun) {
                const branchName = options.branchName || `upgrade-${driverName}-${from}-to-${to}`;
                await gitService.createBranch(branchName);
            }

            if (driver.beforeUpgrade) {
                await driver.beforeUpgrade(context);
            }

            this.reportProgress('transforming', `Applying transformations...`, i + 1, totalVersions);

            const results = await driver.transform(context);
            allResults.push(...results);

            if (!options.dryRun) {
                this.reportProgress('committing', `Committing changes...`, i + 1, totalVersions);

                await this.applyTransformations(results);
                await gitService.stageAll();
                await gitService.commit(`Upgrade ${driverName} from ${from} to ${to}`);
            }

            if (driver.afterUpgrade) {
                await driver.afterUpgrade(context);
            }
        }

        if (options.createPR && !options.dryRun) {
            this.reportProgress('committing', 'Creating pull request...', totalVersions, totalVersions);

            await gitService.push();
            await gitService.createPullRequest({
                title: `Upgrade ${driverName} from ${fromVersion} to ${toVersion}`,
                body: this.generatePRDescription(driverName, fromVersion, toVersion, allResults)
            });
        }

        this.reportProgress('complete', 'Upgrade completed!', totalVersions, totalVersions);

        return allResults;
    }

    private async applyTransformations(results: TransformationResult[]): Promise<void> {
        for (const result of results) {
            await fs.writeFile(result.filePath, result.transformedContent, 'utf-8');
        }
    }

    private generatePRDescription(
        driverName: string,
        fromVersion: string,
        toVersion: string,
        results: TransformationResult[]
    ): string {
        const sections = [`# Upgrade ${driverName} from ${fromVersion} to ${toVersion}`, ''];

        sections.push('## Summary');
        sections.push(`This PR upgrades ${driverName} from version ${fromVersion} to ${toVersion}.`);
        sections.push(`Total files modified: ${results.length}`);
        sections.push('');

        sections.push('## Changes');
        for (const result of results) {
            sections.push(`### ${result.filePath}`);
            for (const change of result.changes) {
                sections.push(`- ${change.description}`);
            }
            sections.push('');
        }

        sections.push('## Next Steps');
        sections.push('1. Review the changes carefully');
        sections.push('2. Run tests to ensure nothing is broken');
        sections.push('3. Update any custom code that may be affected');
        sections.push('4. Merge when ready');

        return sections.join('\n');
    }

    private reportProgress(
        stage: 'detecting' | 'preparing' | 'transforming' | 'committing' | 'complete' | 'error',
        message: string,
        currentStep: number,
        totalSteps: number
    ): void {
        if (this.progressCallback) {
            this.progressCallback({
                stage,
                currentStep,
                totalSteps,
                message
            });
        }
    }
}
