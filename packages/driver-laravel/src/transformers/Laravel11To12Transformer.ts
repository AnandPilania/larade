import { Change, ParserRegistry } from '@larade/core';
import { LaravelVersionTransformer } from './LaravelVersionTransformer';

export class Laravel11To12Transformer extends LaravelVersionTransformer {
    fromVersion = '11';
    toVersion = '12';
    filePattern = /\.php$/;

    async transform(
        filePath: string,
        content: string,
        parserRegistry: ParserRegistry
    ): Promise<{ content: string; changes: Change[] }> {
        const changes: Change[] = [];
        let transformedContent = content;

        transformedContent = this.updateCarbonUsage(transformedContent, changes);
        transformedContent = this.updateUuidBehavior(transformedContent, changes);
        transformedContent = this.updateImageValidation(transformedContent, changes);
        transformedContent = this.updateSchemaMethodCalls(transformedContent, changes);
        transformedContent = this.checkInertiaUsage(transformedContent, changes);

        return { content: transformedContent, changes };
    }

    private updateCarbonUsage(content: string, changes: Change[]): string {
        const lines = content.split('\n');

        lines.forEach((line, index) => {
            if (line.includes('Carbon\\Carbon') || line.includes('use Carbon')) {
                changes.push(
                    this.createChange(
                        'modify',
                        index + 1,
                        'Laravel 12 requires Carbon 3.x - check for breaking changes in date handling'
                    )
                );
            }

            if (line.includes('->diffForHumans') || line.includes('->format')) {
                changes.push(
                    this.createChange(
                        'modify',
                        index + 1,
                        'Carbon 3.x has stricter type checking - verify date operations'
                    )
                );
            }
        });

        return content;
    }

    private updateUuidBehavior(content: string, changes: Change[]): string {
        const lines = content.split('\n');

        lines.forEach((line, index) => {
            if (line.includes('HasUuids') && !line.includes('// UUID v7')) {
                changes.push(
                    this.createChange(
                        'modify',
                        index + 1,
                        'Laravel 12 uses UUID v7 by default (time-based) - verify if this impacts your application'
                    )
                );
            }
        });

        return content;
    }

    private updateImageValidation(content: string, changes: Change[]): string {
        const lines = content.split('\n');

        lines.forEach((line, index) => {
            if (line.includes("'image'") && !line.includes('allow_svg')) {
                changes.push(
                    this.createChange(
                        'modify',
                        index + 1,
                        'Image validation now excludes SVG by default in Laravel 12. Add image:allow_svg if needed',
                        line.trim(),
                        line.trim() + " // Add 'image:allow_svg' if SVG uploads required"
                    )
                );
            }
        });

        return content;
    }

    private updateSchemaMethodCalls(content: string, changes: Change[]): string {
        const lines = content.split('\n');

        lines.forEach((line, index) => {
            if (line.includes('Schema::getTables') || line.includes('Schema::getViews')) {
                changes.push(
                    this.createChange(
                        'modify',
                        index + 1,
                        'Schema methods now include all schemas by default in Laravel 12'
                    )
                );
            }
        });

        return content;
    }

    private checkInertiaUsage(content: string, changes: Change[]): string {
        const lines = content.split('\n');

        lines.forEach((line, index) => {
            if (line.includes('inertia(') || line.includes('Inertia::')) {
                changes.push(
                    this.createChange(
                        'modify',
                        index + 1,
                        'Laravel 12 often pairs with Inertia 1.0 - verify compatibility'
                    )
                );
            }
        });

        return content;
    }
}
