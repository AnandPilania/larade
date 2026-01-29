export interface UpgradeContext {
    projectPath: string;
    fromVersion: string;
    toVersion: string;
    dryRun: boolean;
    files: Map<string, string>;
    metadata: Record<string, any>;
}

export interface TransformationResult {
    filePath: string;
    originalContent: string;
    transformedContent: string;
    changes: Change[];
}

export interface Change {
    type: 'add' | 'remove' | 'modify';
    line: number;
    description: string;
    before?: string;
    after?: string;
}

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

export interface UpgradeOptions {
    dryRun?: boolean;
    createPR?: boolean;
    branchName?: string;
}

export interface PROptions {
    title: string;
    body: string;
    base?: string;
    head?: string;
}

export interface VersionUpgrade {
    from: string;
    to: string;
}

export interface UpgradeProgress {
    stage: 'detecting' | 'preparing' | 'transforming' | 'committing' | 'complete' | 'error';
    currentStep: number;
    totalSteps: number;
    message: string;
    filesProcessed?: number;
    totalFiles?: number;
}

export type ProgressCallback = (progress: UpgradeProgress) => void;
