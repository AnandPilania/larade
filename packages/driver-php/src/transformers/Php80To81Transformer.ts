import { Change, ParserRegistry } from '@larade/core';
import { VersionTransformer } from './VersionTransformer';

export class Php80To81Transformer extends VersionTransformer {
    fromVersion = '8.0';
    toVersion = '8.1';
    filePattern = /\.php$/;

    async transform(
        filePath: string,
        content: string,
        parserRegistry: ParserRegistry
    ): Promise<{ content: string; changes: Change[] }> {
        const changes: Change[] = [];
        let transformedContent = content;

        transformedContent = this.checkEnumUsage(transformedContent, changes);
        transformedContent = this.checkReadonlyProperties(transformedContent, changes);
        transformedContent = this.checkFiberUsage(transformedContent, changes);

        return { content: transformedContent, changes };
    }

    private checkEnumUsage(content: string, changes: Change[]): string {
        const lines = content.split('\n');

        lines.forEach((line, index) => {
            if (line.match(/class\s+\w+/)) {
                changes.push(
                    this.createChange(
                        'modify',
                        index + 1,
                        'PHP 8.1 introduces Enums - consider using them instead of constant classes'
                    )
                );
            }
        });

        return content;
    }

    private checkReadonlyProperties(content: string, changes: Change[]): string {
        const lines = content.split('\n');

        lines.forEach((line, index) => {
            if (line.match(/(public|protected|private)\s+\$\w+/) && !line.includes('readonly')) {
                if (content.includes('__construct') && !line.includes('=')) {
                    changes.push(
                        this.createChange(
                            'modify',
                            index + 1,
                            'Consider using readonly modifier for immutable properties (PHP 8.1)'
                        )
                    );
                }
            }
        });

        return content;
    }

    private checkFiberUsage(content: string, changes: Change[]): string {
        const lines = content.split('\n');

        lines.forEach((line, index) => {
            if (line.includes('pcntl_fork') || line.includes('async')) {
                changes.push(
                    this.createChange(
                        'modify',
                        index + 1,
                        'PHP 8.1 introduces Fibers for cooperative multitasking - consider using them'
                    )
                );
            }
        });

        return content;
    }
}
