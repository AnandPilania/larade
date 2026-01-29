import { Change, ParserRegistry } from '@larade/core';
import { LaravelVersionTransformer } from './LaravelVersionTransformer';

export class Laravel10To11Transformer extends LaravelVersionTransformer {
    fromVersion = '10';
    toVersion = '11';
    filePattern = /\.php$/;

    async transform(
        filePath: string,
        content: string,
        parserRegistry: ParserRegistry
    ): Promise<{ content: string; changes: Change[] }> {
        const changes: Change[] = [];
        let transformedContent = content;

        if (filePath.includes('app/Http/Kernel.php')) {
            transformedContent = this.removeKernelFile(transformedContent, changes, filePath);
        }

        transformedContent = this.updateHelperFunctions(transformedContent, changes);
        transformedContent = this.updateStringHelpers(transformedContent, changes);
        transformedContent = this.updateDates(transformedContent, changes);
        transformedContent = this.updateMiddleware(transformedContent, changes);

        return { content: transformedContent, changes };
    }

    private removeKernelFile(content: string, changes: Change[], filePath: string): string {
        changes.push(
            this.createChange(
                'remove',
                0,
                'Laravel 11 removes app/Http/Kernel.php - Middleware now configured in bootstrap/app.php'
            )
        );

        return content;
    }

    private updateHelperFunctions(content: string, changes: Change[]): string {
        let transformed = content;
        const lines = content.split('\n');

        const helperReplacements = [
            { old: 'Str::contains(', new: 'str_contains(', desc: 'str_contains()' },
            { old: 'Str::startsWith(', new: 'str_starts_with(', desc: 'str_starts_with()' },
            { old: 'Str::endsWith(', new: 'str_ends_with(', desc: 'str_ends_with()' }
        ];

        lines.forEach((line, index) => {
            helperReplacements.forEach(({ old, new: newFunc, desc }) => {
                if (line.includes(old)) {
                    const newLine = line.replace(new RegExp(old.replace('(', '\\('), 'g'), newFunc);

                    if (newLine !== line) {
                        transformed = transformed.replace(line, newLine);
                        changes.push(
                            this.createChange(
                                'modify',
                                index + 1,
                                `Replace ${old} with native ${desc}`,
                                line.trim(),
                                newLine.trim()
                            )
                        );
                    }
                }
            });
        });

        return transformed;
    }

    private updateStringHelpers(content: string, changes: Change[]): string {
        const lines = content.split('\n');

        lines.forEach((line, index) => {
            if (line.includes('str_replace_array')) {
                changes.push(
                    this.createChange(
                        'modify',
                        index + 1,
                        'str_replace_array() behavior may have changed - verify usage'
                    )
                );
            }
        });

        return content;
    }

    private updateDates(content: string, changes: Change[]): string {
        let transformed = content;
        const lines = content.split('\n');

        lines.forEach((line, index) => {
            if (line.includes('$dates') && line.includes('protected')) {
                const newLine = line.replace(/protected\s+\$dates/, 'protected $casts');

                if (newLine !== line) {
                    transformed = transformed.replace(line, newLine);
                    changes.push(
                        this.createChange(
                            'modify',
                            index + 1,
                            'Replace $dates with $casts (Laravel 11 deprecation)',
                            line.trim(),
                            newLine.trim() + " // Update array values to 'datetime' cast"
                        )
                    );
                }
            }
        });

        return transformed;
    }

    private updateMiddleware(content: string, changes: Change[]): string {
        const lines = content.split('\n');

        lines.forEach((line, index) => {
            if (line.includes('$middleware') || line.includes('$middlewareGroups')) {
                changes.push(
                    this.createChange(
                        'modify',
                        index + 1,
                        'Middleware configuration moved to bootstrap/app.php in Laravel 11'
                    )
                );
            }
        });

        return content;
    }
}
