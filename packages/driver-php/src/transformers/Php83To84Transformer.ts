import { Change, ParserRegistry } from '@larade/core';
import { VersionTransformer } from './VersionTransformer';

export class Php83To84Transformer extends VersionTransformer {
    fromVersion = '8.3';
    toVersion = '8.4';
    filePattern = /\.php$/;

    async transform(
        filePath: string,
        content: string,
        parserRegistry: ParserRegistry
    ): Promise<{ content: string; changes: Change[] }> {
        const changes: Change[] = [];
        let transformedContent = content;

        transformedContent = this.fixImplicitNullable(transformedContent, changes);
        transformedContent = this.suggestPropertyHooks(transformedContent, changes);
        transformedContent = this.suggestAsymmetricVisibility(transformedContent, changes);
        transformedContent = this.suggestArrayFunctions(transformedContent, changes);
        transformedContent = this.checkLazyObjects(transformedContent, changes);

        return { content: transformedContent, changes };
    }

    private fixImplicitNullable(content: string, changes: Change[]): string {
        let transformed = content;
        const lines = content.split('\n');

        lines.forEach((line, index) => {
            const match = line.match(/function\s+\w+\s*\([^)]*?(\w+)\s+(\$\w+)\s*=\s*null/);
            if (match && !line.includes('?')) {
                const typeName = match[1];
                const paramName = match[2];
                const newLine = line.replace(
                    new RegExp(`${typeName}\\s+${paramName.replace('$', '\\$')}\\s*=\\s*null`),
                    `?${typeName} ${paramName} = null`
                );

                if (newLine !== line) {
                    transformed = transformed.replace(line, newLine);
                    changes.push(
                        this.createChange(
                            'modify',
                            index + 1,
                            'PHP 8.4 deprecates implicit nullable types. Add explicit ? prefix.',
                            line.trim(),
                            newLine.trim()
                        )
                    );
                }
            }
        });

        return transformed;
    }

    private suggestPropertyHooks(content: string, changes: Change[]): string {
        const lines = content.split('\n');
        let inClass = false;

        lines.forEach((line, index) => {
            if (line.match(/class\s+\w+/)) {
                inClass = true;
            }

            if (inClass && line.match(/(public|protected|private)\s+\$\w+/)) {
                const nextLines = lines.slice(index + 1, index + 10).join('\n');
                const propMatch = line.match(/\$(\w+)/);

                if (propMatch && (nextLines.includes(`get${propMatch[1]}`) || nextLines.includes(`set${propMatch[1]}`))) {
                    changes.push(
                        this.createChange(
                            'modify',
                            index + 1,
                            `PHP 8.4 property hooks available. Consider replacing getter/setter methods with hooks for $${propMatch[1]}`
                        )
                    );
                }
            }

            if (line.includes('}') && inClass) {
                inClass = false;
            }
        });

        return content;
    }

    private suggestAsymmetricVisibility(content: string, changes: Change[]): string {
        const lines = content.split('\n');
        let inClass = false;

        lines.forEach((line, index) => {
            if (line.match(/class\s+\w+/)) {
                inClass = true;
            }

            if (inClass && line.match(/public\s+\$\w+/)) {
                const propMatch = line.match(/\$(\w+)/);
                const nextLines = lines.slice(index + 1, index + 15).join('\n');

                if (propMatch && nextLines.includes(`set${propMatch[1]}`)) {
                    changes.push(
                        this.createChange(
                            'modify',
                            index + 1,
                            `PHP 8.4 asymmetric visibility: Consider 'public private(set) $${propMatch[1]}' for read-only from outside`
                        )
                    );
                }
            }

            if (line.includes('}') && inClass) {
                inClass = false;
            }
        });

        return content;
    }

    private suggestArrayFunctions(content: string, changes: Change[]): string {
        const lines = content.split('\n');

        lines.forEach((line, index) => {
            if (line.includes('array_filter') && line.includes('count') && line.includes('> 0')) {
                changes.push(
                    this.createChange(
                        'modify',
                        index + 1,
                        'PHP 8.4: Use array_any() for checking if array has matching elements'
                    )
                );
            }

            if (line.includes('array_filter') && line.includes('count') && line.includes('===') && line.includes('count($arr)')) {
                changes.push(
                    this.createChange(
                        'modify',
                        index + 1,
                        'PHP 8.4: Use array_all() to check if all elements match a condition'
                    )
                );
            }

            if (line.includes('foreach') && line.includes('return') && !line.includes('array_find')) {
                changes.push(
                    this.createChange(
                        'modify',
                        index + 1,
                        'PHP 8.4: Consider using array_find() to find first matching element'
                    )
                );
            }
        });

        return content;
    }

    private checkLazyObjects(content: string, changes: Change[]): string {
        const lines = content.split('\n');

        lines.forEach((line, index) => {
            if (line.includes('__construct') && line.includes('$this->')) {
                const constructorBody = lines.slice(index, index + 20).join('\n');
                if (constructorBody.split('$this->').length > 5) {
                    changes.push(
                        this.createChange(
                            'modify',
                            index + 1,
                            'PHP 8.4: Consider using lazy objects for expensive initialization'
                        )
                    );
                }
            }
        });

        return content;
    }
}
