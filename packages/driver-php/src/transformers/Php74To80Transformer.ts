import { Change, ParserRegistry } from '@larade/core';
import { VersionTransformer } from './VersionTransformer';

export class Php74To80Transformer extends VersionTransformer {
    fromVersion = '7.4';
    toVersion = '8.0';
    filePattern = /\.php$/;

    async transform(
        filePath: string,
        content: string,
        parserRegistry: ParserRegistry
    ): Promise<{ content: string; changes: Change[] }> {
        const changes: Change[] = [];
        let transformedContent = content;

        transformedContent = this.updateStringFunctions(transformedContent, changes);
        transformedContent = this.updateArrayFunctions(transformedContent, changes);
        transformedContent = this.checkNamedParameters(transformedContent, changes);

        return { content: transformedContent, changes };
    }

    private updateStringFunctions(content: string, changes: Change[]): string {
        let transformed = content;
        const lines = content.split('\n');

        lines.forEach((line, index) => {
            if (line.includes('strpos') && line.includes('=== 0')) {
                const newLine = line.replace(
                    /strpos\s*\((.*?)\)\s*===\s*0/g,
                    'str_starts_with($1)'
                );

                if (newLine !== line) {
                    transformed = transformed.replace(line, newLine);
                    changes.push(
                        this.createChange(
                            'modify',
                            index + 1,
                            'Replace strpos === 0 with str_starts_with (PHP 8.0)',
                            line.trim(),
                            newLine.trim()
                        )
                    );
                }
            }

            if (line.includes('stripos') && line.includes('=== 0')) {
                const newLine = line.replace(
                    /stripos\s*\((.*?)\)\s*===\s*0/g,
                    'str_starts_with($1)'
                );

                if (newLine !== line) {
                    transformed = transformed.replace(line, newLine);
                    changes.push(
                        this.createChange(
                            'modify',
                            index + 1,
                            'Replace stripos === 0 with str_starts_with (PHP 8.0)',
                            line.trim(),
                            newLine.trim()
                        )
                    );
                }
            }

            const endsWithPattern = /str(i)?pos\s*\([^)]+\)\s*===\s*\(strlen\([^)]+\)\s*-\s*strlen\([^)]+\)\)/;
            if (endsWithPattern.test(line)) {
                changes.push(
                    this.createChange(
                        'modify',
                        index + 1,
                        'Consider using str_ends_with() for end-of-string checks (PHP 8.0)'
                    )
                );
            }
        });

        return transformed;
    }

    private updateArrayFunctions(content: string, changes: Change[]): string {
        let transformed = content;
        const lines = content.split('\n');

        lines.forEach((line, index) => {
            if (line.includes('array_key_exists') && line.includes('$this')) {
                const newLine = line.replace(
                    /array_key_exists\s*\(\s*(['"].*?['"]),\s*\$this\s*\)/g,
                    'property_exists($this, $1) || isset($this->$1)'
                );

                if (newLine !== line) {
                    transformed = transformed.replace(line, newLine);
                    changes.push(
                        this.createChange(
                            'modify',
                            index + 1,
                            'Update array_key_exists usage with $this (deprecated in PHP 8.0)',
                            line.trim(),
                            newLine.trim()
                        )
                    );
                }
            }
        });

        return transformed;
    }

    private checkNamedParameters(content: string, changes: Change[]): string {
        const lines = content.split('\n');

        lines.forEach((line, index) => {
            if (line.match(/function\s+\w+\s*\([^)]*\$/)) {
                changes.push(
                    this.createChange(
                        'modify',
                        index + 1,
                        'PHP 8.0 supports named parameters - consider using them for better readability'
                    )
                );
            }
        });

        return content;
    }
}
