import { UpgradeContext, TransformationResult, ValidationResult, ProgressCallback } from './types';

export abstract class Driver {
    abstract name: string;
    abstract supportedVersions: string[];

    protected dependencies: Driver[] = [];
    protected progressCallback?: ProgressCallback;

    abstract detect(projectPath: string): Promise<boolean>;
    abstract getCurrentVersion(projectPath: string): Promise<string>;
    abstract getUpgradePath(from: string, to: string): string[];
    abstract transform(context: UpgradeContext): Promise<TransformationResult[]>;

    async beforeUpgrade?(context: UpgradeContext): Promise<void>;
    async afterUpgrade?(context: UpgradeContext): Promise<void>;
    async validate?(context: UpgradeContext): Promise<ValidationResult>;

    addDependency(driver: Driver): void {
        this.dependencies.push(driver);
    }

    getDependencies(): Driver[] {
        return this.dependencies;
    }

    hasDependency(driverName: string): boolean {
        return this.dependencies.some(d => d.name === driverName);
    }

    setProgressCallback(callback: ProgressCallback): void {
        this.progressCallback = callback;
    }

    protected reportProgress(
        stage: 'detecting' | 'preparing' | 'transforming' | 'committing' | 'complete' | 'error',
        message: string,
        currentStep: number,
        totalSteps: number,
        filesProcessed?: number,
        totalFiles?: number
    ): void {
        if (this.progressCallback) {
            this.progressCallback({
                stage,
                currentStep,
                totalSteps,
                message,
                filesProcessed,
                totalFiles
            });
        }
    }

    async executeDependencyUpgradesWithContext(
        projectPath: string,
        createContext: (driver: Driver, fromVersion: string, toVersion: string) => UpgradeContext
    ): Promise<TransformationResult[]> {
        const allResults: TransformationResult[] = [];

        for (const driver of this.dependencies) {
            const currentVersion = await driver.getCurrentVersion(projectPath);
            const targetVersion = this.getRequiredDependencyVersion(driver.name, currentVersion);

            if (targetVersion && currentVersion !== targetVersion) {
                const context = createContext(driver, currentVersion, targetVersion);
                const results = await driver.transform(context);
                allResults.push(...results);
            }
        }

        return allResults;
    }

    protected getRequiredDependencyVersion(driverName: string, currentVersion: string): string | null {
        return null;
    }
}
