import { Change, ParserRegistry } from '@larade/core';

export abstract class VersionTransformer {
    abstract fromVersion: string;
    abstract toVersion: string;
    abstract filePattern: RegExp;

    abstract transform(
        filePath: string,
        content: string,
        parserRegistry: ParserRegistry
    ): Promise<{ content: string; changes: Change[] }>;

    protected createChange(
        type: 'add' | 'remove' | 'modify',
        line: number,
        description: string,
        before?: string,
        after?: string
    ): Change {
        return { type, line, description, before, after };
    }
}
