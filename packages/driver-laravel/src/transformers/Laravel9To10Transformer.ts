import { Change, ParserRegistry } from '@larade/core';
import { LaravelVersionTransformer } from './LaravelVersionTransformer';

export class Laravel9To10Transformer extends LaravelVersionTransformer {
    fromVersion = '9';
    toVersion = '10';
    filePattern = /\.php$/;

    async transform(
        filePath: string,
        content: string,
        parserRegistry: ParserRegistry
    ): Promise<{ content: string; changes: Change[] }> {
        const changes: Change[] = [];
        let transformedContent = content;

        transformedContent = this.updateRouteNamespaces(transformedContent, changes);
        transformedContent = this.updateValidationRules(transformedContent, changes);
        transformedContent = this.updateDatabaseOperations(transformedContent, changes);

        return { content: transformedContent, changes };
    }

    private updateRouteNamespaces(content: string, changes: Change[]): string {
        const lines = content.split('\n');

        lines.forEach((line, index) => {
            if (line.includes('Route::') && line.includes('namespace(')) {
                changes.push(
                    this.createChange(
                        'modify',
                        index + 1,
                        'Route namespacing behavior changed in Laravel 10 - verify namespace usage'
                    )
                );
            }
        });

        return content;
    }

    private updateValidationRules(content: string, changes: Change[]): string {
        const lines = content.split('\n');

        lines.forEach((line, index) => {
            if (line.includes("'required_if:")) {
                changes.push(
                    this.createChange(
                        'modify',
                        index + 1,
                        'required_if validation rule behavior updated in Laravel 10'
                    )
                );
            }
        });

        return content;
    }

    private updateDatabaseOperations(content: string, changes: Change[]): string {
        const lines = content.split('\n');

        lines.forEach((line, index) => {
            if (line.includes('Schema::') && line.includes('dropColumns')) {
                changes.push(
                    this.createChange(
                        'modify',
                        index + 1,
                        'Schema::dropColumns now drops all columns in single statement in Laravel 10'
                    )
                );
            }
        });

        return content;
    }
}
