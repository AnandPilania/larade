#!/usr/bin/env node

import { Command } from 'commander';
import { UpgradeEngine } from '@larade/core';
import { PhpDriver } from '@larade/driver-php';
import { LaravelDriver } from '@larade/driver-laravel';
import { ParserRegistry } from '@larade/core';
import chalk from 'chalk';

const program = new Command();
const parserRegistry = new ParserRegistry();
const engine = new UpgradeEngine(process.env.GITHUB_TOKEN);

const phpDriver = new PhpDriver(parserRegistry);
const laravelDriver = new LaravelDriver(parserRegistry, phpDriver);

engine.registerDriver(phpDriver);
engine.registerDriver(laravelDriver);

program
    .name('larade')
    .description('Educational framework upgrade tool')
    .version('1.0.0');

program
    .command('detect')
    .description('Detect frameworks in project')
    .argument('[path]', 'Project path', process.cwd())
    .action(async (projectPath: string) => {
        try {
            console.log(chalk.blue('\nDetecting frameworks...\n'));

            const drivers = await engine.detectDrivers(projectPath);

            if (drivers.length === 0) {
                console.log(chalk.yellow('No supported frameworks detected.'));
                return;
            }

            console.log(chalk.green('Detected frameworks:'));
            for (const driver of drivers) {
                const version = await driver.getCurrentVersion(projectPath);
                console.log(chalk.cyan(`  ✓ ${driver.name}`) + chalk.gray(` (v${version})`));
            }

            console.log('');
        } catch (error) {
            console.error(chalk.red('Error:'), (error as Error).message);
            process.exit(1);
        }
    });

program
    .command('upgrade')
    .description('Upgrade a framework')
    .argument('<driver>', 'Driver name (php, laravel)')
    .argument('<from>', 'From version')
    .argument('<to>', 'To version')
    .option('-p, --path <path>', 'Project path', process.cwd())
    .option('--dry-run', 'Preview changes without applying')
    .option('--pr', 'Create pull request')
    .option('-b, --branch <name>', 'Custom branch name')
    .action(async (
        driver: string,
        from: string,
        to: string,
        options: { path: string; dryRun?: boolean; pr?: boolean; branch?: string }
    ) => {
        try {
            console.log(chalk.blue(`\nUpgrading ${driver} from ${from} to ${to}...\n`));

            if (options.dryRun) {
                console.log(chalk.yellow('DRY RUN MODE - No changes will be applied\n'));
            }

            const results = await engine.upgrade(
                options.path,
                driver,
                from,
                to,
                {
                    dryRun: options.dryRun,
                    createPR: options.pr,
                    branchName: options.branch
                }
            );

            if (results.length === 0) {
                console.log(chalk.yellow('\nNo changes needed.'));
                return;
            }

            console.log(chalk.green(`\n✓ Modified ${results.length} file(s):`));

            for (const result of results) {
                console.log(chalk.cyan(`\n${result.filePath}:`));

                result.changes.forEach(change => {
                    const icon = change.type === 'add' ? '+' : change.type === 'remove' ? '-' : '~';
                    console.log(chalk.gray(`  ${icon} ${change.description}`));

                    if (change.before && change.after) {
                        console.log(chalk.red(`    - ${change.before}`));
                        console.log(chalk.green(`    + ${change.after}`));
                    }
                });
            }

            if (options.dryRun) {
                console.log(chalk.yellow('\nDry run completed. Run without --dry-run to apply changes.'));
            } else {
                console.log(chalk.green('\n✓ Upgrade completed successfully!'));

                if (options.pr) {
                    console.log(chalk.blue('\n✓ Pull request created!'));
                }
            }

            console.log('');
        } catch (error) {
            console.error(chalk.red('\nError:'), (error as Error).message);
            process.exit(1);
        }
    });

program
    .command('list-drivers')
    .description('List all available drivers')
    .action(() => {
        console.log(chalk.blue('\nAvailable drivers:\n'));

        console.log(chalk.cyan('  php'));
        console.log(chalk.gray('    Supported versions: 7.4, 8.0, 8.1, 8.2, 8.3'));

        console.log(chalk.cyan('\n  laravel'));
        console.log(chalk.gray('    Supported versions: 9, 10, 11'));
        console.log(chalk.gray('    Dependencies: php'));

        console.log('');
    });

program.parse();
