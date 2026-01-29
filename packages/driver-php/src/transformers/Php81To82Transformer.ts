import { Change, ParserRegistry } from '@larade/core';
import { VersionTransformer } from './VersionTransformer';

export class Php81To82Transformer extends VersionTransformer {
    fromVersion = '8.1';
    toVersion = '8.2';
    filePattern = /\.php$/;

    async transform(
        filePath: string,
        content: string,
        parserRegistry: ParserRegistry
    ): Promise<{ content: string; changes: Change[] }> {
        const changes: Change[] = [];
        let transformedContent = content;

        transformedContent = this.checkDynamicProperties(transformedContent, changes);
        transformedContent = this.checkDeprecatedFunctions(transformedContent, changes);

        return { content: transformedContent, changes };
    }

    private checkDynamicProperties(content: string, changes: Change[]): string {
        const lines = content.split('\n');
        let inClass = false;
        let className = '';
        const declaredProperties = new Set<string>();

        lines.forEach((line, index) => {
            const classMatch = line.match(/class\s+(\w+)/);
            if (classMatch) {
                inClass = true;
                className = classMatch[1];
                declaredProperties.clear();
            }

            if (inClass && line.match(/(public|protected|private)\s+\$(\w+)/)) {
                const propMatch = line.match(/\$(\w+)/);
                if (propMatch) {
                    declaredProperties.add(propMatch[1]);
                }
            }

            if (inClass && line.includes('$this->')) {
                const propMatches = line.matchAll(/\$this->(\w+)/g);
                for (const match of propMatches) {
                    const propName = match[1];
                    if (!declaredProperties.has(propName) && !line.includes('function')) {
                        changes.push(
                            this.createChange(
                                'modify',
                                index + 1,
                                `Dynamic property $${propName} deprecated in PHP 8.2. Declare it or add #[AllowDynamicProperties]`
                            )
                        );
                        declaredProperties.add(propName);
                    }
                }
            }

            if (line.includes('}') && inClass && !line.includes('{')) {
                inClass = false;
            }
        });

        return content;
    }

    private checkDeprecatedFunctions(content: string, changes: Change[]): string {
        const lines = content.split('\n');
        const deprecated = ['utf8_encode', 'utf8_decode'];

        lines.forEach((line, index) => {
            deprecated.forEach(func => {
                if (line.includes(func)) {
                    changes.push(
                        this.createChange(
                            'modify',
                            index + 1,
                            `${func}() is deprecated in PHP 8.2. Use mb_convert_encoding() instead`
                        )
                    );
                }
            });
        });

        return content;
    }
}
