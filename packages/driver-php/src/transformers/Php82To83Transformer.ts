import { Change, ParserRegistry } from '@larade/core';
import { VersionTransformer } from './VersionTransformer';

export class Php82To83Transformer extends VersionTransformer {
    fromVersion = '8.2';
    toVersion = '8.3';
    filePattern = /\.php$/;

    async transform(
        filePath: string,
        content: string,
        parserRegistry: ParserRegistry
    ): Promise<{ content: string; changes: Change[] }> {
        const changes: Change[] = [];
        let transformedContent = content;

        transformedContent = this.suggestTypedConstants(transformedContent, changes);
        transformedContent = this.updateJsonValidation(transformedContent, changes);
        transformedContent = this.checkOverrideAttribute(transformedContent, changes);

        return { content: transformedContent, changes };
    }

    private suggestTypedConstants(content: string, changes: Change[]): string {
        const lines = content.split('\n');
        let inClass = false;

        lines.forEach((line, index) => {
            if (line.match(/class\s+\w+/)) {
                inClass = true;
            }

            if (inClass && line.match(/const\s+\w+\s*=/) && !line.includes(':')) {
                changes.push(
                    this.createChange(
                        'modify',
                        index + 1,
                        'PHP 8.3 supports typed class constants. Consider adding type hints for better type safety.'
                    )
                );
            }

            if (line.includes('}') && inClass) {
                inClass = false;
            }
        });

        return content;
    }

    private updateJsonValidation(content: string, changes: Change[]): string {
        let transformed = content;
        const lines = content.split('\n');

        lines.forEach((line, index) => {
            if (line.includes('json_decode') && line.includes('json_last_error')) {
                const newLine = line.replace(
                    /json_decode\s*\((.*?)\)/,
                    'json_validate($1) ? json_decode($1) : null'
                );

                changes.push(
                    this.createChange(
                        'modify',
                        index + 1,
                        'Consider using json_validate() function (PHP 8.3) for better performance',
                        line.trim(),
                        'Use json_validate() before json_decode()'
                    )
                );
            }
        });

        return transformed;
    }

    private checkOverrideAttribute(content: string, changes: Change[]): string {
        const lines = content.split('\n');
        let inClass = false;
        let hasParent = false;

        lines.forEach((line, index) => {
            if (line.match(/class\s+\w+\s+extends/)) {
                inClass = true;
                hasParent = true;
            }

            if (inClass && hasParent && line.match(/(public|protected)\s+function\s+\w+/) && !line.includes('#[Override]')) {
                changes.push(
                    this.createChange(
                        'modify',
                        index + 1,
                        'PHP 8.3 introduces #[Override] attribute for overridden methods - consider adding it'
                    )
                );
            }

            if (line.includes('}') && inClass) {
                inClass = false;
                hasParent = false;
            }
        });

        return content;
    }
}
