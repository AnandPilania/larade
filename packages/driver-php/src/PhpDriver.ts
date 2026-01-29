import { Driver, UpgradeContext, TransformationResult, Change } from '@larade/core';
import { ParserRegistry } from '@larade/core';
import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import { VersionTransformer } from './transformers/VersionTransformer';
import { Php74To80Transformer } from './transformers/Php74To80Transformer';
import { Php80To81Transformer } from './transformers/Php80To81Transformer';
import { Php81To82Transformer } from './transformers/Php81To82Transformer';
import { Php82To83Transformer } from './transformers/Php82To83Transformer';
import { Php83To84Transformer } from './transformers/Php83To84Transformer';

export class PhpDriver extends Driver {
    name = 'php';
    supportedVersions = ['7.4', '8.0', '8.1', '8.2', '8.3', '8.4'];

    private transformers: Map<string, VersionTransformer[]> = new Map();
    private parserRegistry: ParserRegistry;

    constructor(parserRegistry: ParserRegistry) {
        super();
        this.parserRegistry = parserRegistry;
        this.registerTransformers();
    }

    async detect(projectPath: string): Promise<boolean> {
        try {
            const composerPath = path.join(projectPath, 'composer.json');
            await fs.access(composerPath);
            return true;
        } catch {
            return false;
        }
    }

    async getCurrentVersion(projectPath: string): Promise<string> {
        try {
            const composerPath = path.join(projectPath, 'composer.json');
            const content = await fs.readFile(composerPath, 'utf-8');
            const composer = JSON.parse(content);

            const phpVersion = composer.require?.php || composer.config?.platform?.php;

            if (phpVersion) {
                const versionMatch = phpVersion.match(/(\d+\.\d+)/);
                if (versionMatch) {
                    return versionMatch[1];
                }
            }

            return '8.2';
        } catch {
            return '8.2';
        }
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
            console.log(`No transformers found for PHP ${context.fromVersion} -> ${context.toVersion}`);
            return results;
        }

        this.reportProgress('transforming', `Finding PHP files...`, 1, 3);
        const files = await this.findPhpFiles(context.projectPath);

        this.reportProgress('transforming', `Transforming ${files.length} PHP files...`, 2, 3);

        for (let i = 0; i < files.length; i++) {
            const filePath = files[i];
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

            if ((i + 1) % 10 === 0) {
                this.reportProgress('transforming', `Processing files...`, 2, 3, i + 1, files.length);
            }
        }

        const composerResult = await this.updateComposerJson(context);
        if (composerResult) {
            results.push(composerResult);
        }

        return results;
    }

    private registerTransformers(): void {
        this.transformers.set('7.4-8.0', [new Php74To80Transformer()]);
        this.transformers.set('8.0-8.1', [new Php80To81Transformer()]);
        this.transformers.set('8.1-8.2', [new Php81To82Transformer()]);
        this.transformers.set('8.2-8.3', [new Php82To83Transformer()]);
        this.transformers.set('8.3-8.4', [new Php83To84Transformer()]);
    }

    private async findPhpFiles(projectPath: string): Promise<string[]> {
        const patterns = ['**/*.php'];
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

            if (composer.require?.php) {
                const oldVersion = composer.require.php;
                composer.require.php = `^${context.toVersion}`;

                changes.push({
                    type: 'modify',
                    line: 0,
                    description: `Update PHP version requirement from ${oldVersion} to ^${context.toVersion}`,
                    before: `"php": "${oldVersion}"`,
                    after: `"php": "^${context.toVersion}"`
                });
            }

            if (composer.config?.platform?.php) {
                const oldVersion = composer.config.platform.php;
                composer.config.platform.php = context.toVersion;

                changes.push({
                    type: 'modify',
                    line: 0,
                    description: `Update platform PHP version from ${oldVersion} to ${context.toVersion}`,
                    before: `"php": "${oldVersion}"`,
                    after: `"php": "${context.toVersion}"`
                });
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
}
