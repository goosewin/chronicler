import { Tool } from "@mastra/core/tools";
import { z } from "zod";
import { Commit } from "../workflows/changelog-workflow";

// Schema for commit data
const CommitSchema = z.object({
  hash: z.string(),
  message: z.string(),
  author: z.string(),
  date: z.string(),
});

// Schema for commit data collection
const CommitDataSchema = z.object({
  commits: z.array(CommitSchema),
  startDate: z.string(),
  endDate: z.string(),
  authors: z.array(z.string()),
});

// Tool for analyzing conventional commits
export const analyzeCommitsTool = new Tool({
  id: "analyzeCommits",
  description: "Analyzes a list of commits to extract meaningful changes",
  inputSchema: z.object({
    commitData: CommitDataSchema,
  }),
  execute: async ({ context }) => {
    const commitData = context.commitData;

    if (!commitData) {
      throw new Error("Commit data not found");
    }

    // Categorize commits by type
    const categories: Record<string, Commit[]> = {
      features: [],
      fixes: [],
      docs: [],
      chore: [],
      refactor: [],
      style: [],
      test: [],
      perf: [],
      ci: [],
      build: [],
      revert: [],
      other: [],
    };

    // Conventional commit regex pattern
    const conventionalCommitPattern = /^(feat|fix|docs|chore|refactor|style|test|perf|ci|build|revert)(\([a-z-]+\))?!?:\s(.+)$/i;

    for (const commit of commitData.commits) {
      const message = commit.message.split('\n')[0].trim(); // Get first line

      const match = message.match(conventionalCommitPattern);

      if (match) {
        const type = match[1].toLowerCase();
        const scope = match[2] ? match[2].replace(/[()]/g, '') : null;
        const description = match[3].trim();

        const commitInfo = {
          hash: commit.hash,
          message: description,
          scope,
          author: commit.author,
          date: commit.date,
        };

        switch (type) {
          case 'feat':
            categories.features.push(commitInfo);
            break;
          case 'fix':
            categories.fixes.push(commitInfo);
            break;
          case 'docs':
            categories.docs.push(commitInfo);
            break;
          case 'chore':
            categories.chore.push(commitInfo);
            break;
          case 'refactor':
            categories.refactor.push(commitInfo);
            break;
          case 'style':
            categories.style.push(commitInfo);
            break;
          case 'test':
            categories.test.push(commitInfo);
            break;
          case 'perf':
            categories.perf.push(commitInfo);
            break;
          case 'ci':
            categories.ci.push(commitInfo);
            break;
          case 'build':
            categories.build.push(commitInfo);
            break;
          case 'revert':
            categories.revert.push(commitInfo);
            break;
          default:
            categories.other.push(commitInfo);
        }
      } else {
        // Use heuristic categorization for non-conventional commits
        const msg = message.toLowerCase();
        const commitInfo = {
          hash: commit.hash,
          message: message,
          scope: null,
          author: commit.author,
          date: commit.date,
        };

        if (msg.includes('add') || msg.includes('new') || msg.includes('feature') || msg.includes('implement') || msg.includes('support')) {
          categories.features.push(commitInfo);
        } else if (msg.includes('fix') || msg.includes('bug') || msg.includes('issue') || msg.includes('resolve') || msg.includes('correct')) {
          categories.fixes.push(commitInfo);
        } else if (msg.includes('doc') || msg.includes('readme') || msg.includes('comment')) {
          categories.docs.push(commitInfo);
        } else if (msg.includes('refactor') || msg.includes('clean') || msg.includes('restructure')) {
          categories.refactor.push(commitInfo);
        } else if (msg.includes('test')) {
          categories.test.push(commitInfo);
        } else if (msg.includes('perf') || msg.includes('performance') || msg.includes('optimize')) {
          categories.perf.push(commitInfo);
        } else {
          categories.other.push(commitInfo);
        }
      }
    }

    return {
      categories,
      stats: {
        total: commitData.commits.length,
        byCategory: {
          features: categories.features.length,
          fixes: categories.fixes.length,
          docs: categories.docs.length,
          chore: categories.chore.length,
          refactor: categories.refactor.length,
          style: categories.style.length,
          test: categories.test.length,
          perf: categories.perf.length,
          ci: categories.ci.length,
          build: categories.build.length,
          revert: categories.revert.length,
          other: categories.other.length,
        },
        dateRange: {
          start: commitData.startDate,
          end: commitData.endDate,
        },
        authors: commitData.authors,
      }
    };
  },
});

// Tool for generating a markdown changelog from categorized commits
export const generateChangelogMarkdownTool = new Tool({
  id: "generateChangelogMarkdown",
  description: "Generates a markdown changelog from categorized commits",
  inputSchema: z.object({
    categorizedCommits: z.object({
      categories: z.record(z.array(z.any())),
      stats: z.object({
        total: z.number(),
        byCategory: z.record(z.number()),
        dateRange: z.object({
          start: z.string(),
          end: z.string(),
        }),
        authors: z.array(z.string()),
      }),
    }),
    title: z.string().optional(),
    includeStats: z.boolean().optional(),
  }),
  execute: async ({ context }) => {
    const categorizedCommits = context.categorizedCommits;
    const title = context.title || "Changelog";
    const includeStats = context.includeStats || false;

    // Map technical categories to user-friendly names
    const categoryMappings = {
      features: "Features",
      fixes: "Bug Fixes",
      docs: "Documentation",
      chore: "Maintenance",
      refactor: "Code Refactoring",
      style: "Styling",
      test: "Tests",
      perf: "Performance Improvements",
      ci: "CI/CD",
      build: "Build System",
      revert: "Reverts",
      other: "Other Changes",
    };

    let markdown = `# ${title}\n\n`;

    // Add date range if available
    if (categorizedCommits.stats.dateRange.start && categorizedCommits.stats.dateRange.end) {
      const startDate = new Date(categorizedCommits.stats.dateRange.start);
      const endDate = new Date(categorizedCommits.stats.dateRange.end);
      markdown += `Generated from changes between ${startDate.toDateString()} and ${endDate.toDateString()}.\n\n`;
    }

    // Add stats summary if requested
    if (includeStats) {
      markdown += `## Summary\n\n`;
      markdown += `- Total changes: ${categorizedCommits.stats.total}\n`;

      for (const [category, count] of Object.entries(categorizedCommits.stats.byCategory)) {
        if (count > 0 && categoryMappings[category as keyof typeof categoryMappings]) {
          markdown += `- ${categoryMappings[category as keyof typeof categoryMappings]}: ${count}\n`;
        }
      }

      if (categorizedCommits.stats.authors.length > 0) {
        markdown += `- Contributors: ${categorizedCommits.stats.authors.join(', ')}\n`;
      }

      markdown += `\n`;
    }

    // Add sections for each category that has commits
    for (const [category, commits] of Object.entries(categorizedCommits.categories)) {
      if (commits.length > 0 && categoryMappings[category as keyof typeof categoryMappings]) {
        markdown += `## ${categoryMappings[category as keyof typeof categoryMappings]}\n\n`;

        for (const commit of commits) {
          // Check if scope exists and add it to the message
          const scopeText = commit.scope ? `**${commit.scope}:** ` : '';
          markdown += `- ${scopeText}${commit.message}\n`;
        }

        markdown += `\n`;
      }
    }

    return markdown;
  },
}); 
