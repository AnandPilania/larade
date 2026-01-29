import simpleGit, { SimpleGit } from 'simple-git';
import { Octokit } from '@octokit/rest';
import { PROptions } from '../types';

export class GitService {
    private git: SimpleGit;
    private octokit?: Octokit;

    constructor(private projectPath: string, githubToken?: string) {
        this.git = simpleGit(projectPath);

        if (githubToken) {
            this.octokit = new Octokit({ auth: githubToken });
        }
    }

    async getCurrentBranch(): Promise<string> {
        const status = await this.git.status();
        return status.current || 'main';
    }

    async createBranch(branchName: string): Promise<void> {
        await this.git.checkoutLocalBranch(branchName);
    }

    async stageAll(): Promise<void> {
        await this.git.add('.');
    }

    async commit(message: string): Promise<void> {
        await this.git.commit(message);
    }

    async push(remote: string = 'origin', branch?: string): Promise<void> {
        const currentBranch = branch || await this.getCurrentBranch();
        await this.git.push(remote, currentBranch, ['--set-upstream']);
    }

    async getRemoteUrl(): Promise<string | null> {
        try {
            const remotes = await this.git.getRemotes(true);
            const origin = remotes.find(r => r.name === 'origin');
            return origin?.refs.push || null;
        } catch {
            return null;
        }
    }

    parseGithubRepo(url: string): { owner: string; repo: string } | null {
        const match = url.match(/github\.com[:/](.+?)\/(.+?)(\.git)?$/);
        if (!match) return null;

        return {
            owner: match[1],
            repo: match[2]
        };
    }

    async createPullRequest(options: PROptions): Promise<void> {
        if (!this.octokit) {
            throw new Error('GitHub token not provided. Cannot create PR.');
        }

        const remoteUrl = await this.getRemoteUrl();
        if (!remoteUrl) {
            throw new Error('No remote URL found');
        }

        const repo = this.parseGithubRepo(remoteUrl);
        if (!repo) {
            throw new Error('Invalid GitHub repository URL');
        }

        const currentBranch = await this.getCurrentBranch();

        await this.octokit.pulls.create({
            owner: repo.owner,
            repo: repo.repo,
            title: options.title,
            body: options.body,
            head: options.head || currentBranch,
            base: options.base || 'main'
        });
    }

    async hasUncommittedChanges(): Promise<boolean> {
        const status = await this.git.status();
        return !status.isClean();
    }
}
