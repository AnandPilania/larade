export interface Parser {
    parse(code: string): any;
    generate(ast: any): string;
}

export class ParserRegistry {
    private parsers: Map<string, Parser> = new Map();

    register(name: string, parser: Parser): void {
        this.parsers.set(name, parser);
    }

    get(name: string): Parser | undefined {
        return this.parsers.get(name);
    }

    has(name: string): boolean {
        return this.parsers.has(name);
    }

    getByExtension(extension: string): Parser | undefined {
        const extensionMap: Record<string, string> = {
            'php': 'php',
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'javascript',
            'tsx': 'javascript',
            'json': 'json',
            'css': 'css',
            'yaml': 'yaml',
            'yml': 'yaml'
        };

        const parserName = extensionMap[extension];
        return parserName ? this.get(parserName) : undefined;
    }
}
