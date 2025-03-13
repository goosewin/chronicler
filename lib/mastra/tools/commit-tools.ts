import { Tool } from "@mastra/core/tools";
import { z } from "zod";
import { Commit } from "../workflows/changelog-workflow";

const CommitSchema = z.object({
  hash: z.string(),
  message: z.string(),
  author: z.string(),
  date: z.string(),
});

const CommitDataSchema = z.object({
  commits: z.array(CommitSchema),
  startDate: z.string(),
  endDate: z.string(),
  authors: z.array(z.string()),
});

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

    const conventionalCommitPattern =
      /^(feat|fix|docs|chore|refactor|style|test|perf|ci|build|revert)(\([a-z-]+\))?!?:\s(.+)$/i;

    console.log(`Processing ${commitData.commits.length} commits`);
    const MAX_COMMITS_TO_PROCESS = 500;
    const commitsToProcess =
      commitData.commits.length > MAX_COMMITS_TO_PROCESS
        ? commitData.commits.slice(0, MAX_COMMITS_TO_PROCESS)
        : commitData.commits;

    if (commitData.commits.length > MAX_COMMITS_TO_PROCESS) {
      console.log(`Limited processing to ${MAX_COMMITS_TO_PROCESS} commits`);
    }

    for (const commit of commitsToProcess) {
      try {
        const message = commit.message.split("\n")[0].trim();

        const match = message.match(conventionalCommitPattern);

        if (match) {
          const type = match[1].toLowerCase();
          const scope = match[2] ? match[2].replace(/[()]/g, "") : null;
          const description = match[3].trim();

          const commitInfo = {
            hash: commit.hash,
            message: description,
            scope,
            author: commit.author,
            date: commit.date,
          };

          switch (type) {
            case "feat":
              categories.features.push(commitInfo);
              break;
            case "fix":
              categories.fixes.push(commitInfo);
              break;
            case "docs":
              categories.docs.push(commitInfo);
              break;
            case "chore":
              categories.chore.push(commitInfo);
              break;
            case "refactor":
              categories.refactor.push(commitInfo);
              break;
            case "style":
              categories.style.push(commitInfo);
              break;
            case "test":
              categories.test.push(commitInfo);
              break;
            case "perf":
              categories.perf.push(commitInfo);
              break;
            case "ci":
              categories.ci.push(commitInfo);
              break;
            case "build":
              categories.build.push(commitInfo);
              break;
            case "revert":
              categories.revert.push(commitInfo);
              break;
            default:
              categories.other.push(commitInfo);
          }
        } else {
          const msg = message.toLowerCase();
          const commitInfo = {
            hash: commit.hash,
            message: message,
            scope: null,
            author: commit.author,
            date: commit.date,
          };

          if (
            msg.includes("add") ||
            msg.includes("new") ||
            msg.includes("feature") ||
            msg.includes("implement") ||
            msg.includes("support")
          ) {
            categories.features.push(commitInfo);
          } else if (
            msg.includes("fix") ||
            msg.includes("bug") ||
            msg.includes("issue") ||
            msg.includes("resolve") ||
            msg.includes("correct")
          ) {
            categories.fixes.push(commitInfo);
          } else if (
            msg.includes("doc") ||
            msg.includes("readme") ||
            msg.includes("comment")
          ) {
            categories.docs.push(commitInfo);
          } else if (
            msg.includes("refactor") ||
            msg.includes("clean") ||
            msg.includes("restructure")
          ) {
            categories.refactor.push(commitInfo);
          } else if (msg.includes("test")) {
            categories.test.push(commitInfo);
          } else if (
            msg.includes("perf") ||
            msg.includes("performance") ||
            msg.includes("optimize")
          ) {
            categories.perf.push(commitInfo);
          } else {
            categories.other.push(commitInfo);
          }
        }
      } catch (error) {
        console.error(`Error processing commit ${commit.hash}: ${error}`);
      }
    }

    return {
      byType: categories,
      stats: {
        total: commitData.commits.length,
        byType: {
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
      },
    };
  },
});

export const generateChangelogMarkdownTool = new Tool({
  id: "generateChangelogMarkdown",
  description: "Generates a markdown changelog from categorized commits",
  inputSchema: z.object({
    categorizedCommits: z.object({
      categories: z.record(z.array(z.any())).optional(),
      byType: z.record(z.array(z.any())).optional(),
      stats: z.object({
        total: z.number(),
        byCategory: z.record(z.number()).optional(),
        byType: z.record(z.number()).optional(),
        dateRange: z
          .object({
            start: z.string().optional(),
            end: z.string().optional(),
          })
          .optional(),
        authors: z.array(z.string()).optional(),
      }),
    }),
    title: z.string().optional(),
    includeStats: z.boolean().optional(),
  }),
  execute: async ({ context }) => {
    try {
      const categorizedCommits = context.categorizedCommits;
      const title = context.title || "Changelog";
      const includeStats = context.includeStats || false;

      const categories =
        categorizedCommits.categories || categorizedCommits.byType || {};
      const byCategory =
        categorizedCommits.stats.byCategory ||
        categorizedCommits.stats.byType ||
        {};
      const dateRange = categorizedCommits.stats.dateRange || {
        start: "",
        end: "",
      };
      const authors = categorizedCommits.stats.authors || [];

      const categoryMappings: Record<string, string> = {
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

      if (dateRange.start && dateRange.end) {
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        markdown += `Generated from changes between ${startDate.toDateString()} and ${endDate.toDateString()}.\n\n`;
      }

      if (includeStats) {
        markdown += `## Summary\n\n`;
        markdown += `- Total changes: ${categorizedCommits.stats.total}\n`;

        // Process by categories - limit to top categories
        const MAX_STATS_ITEMS = 10;

        // Convert to array to sort by count and limit
        const categoryCounts = Object.entries(byCategory)
          .filter(([, count]) => count > 0)
          .sort(([, countA], [, countB]) => Number(countB) - Number(countA))
          .slice(0, MAX_STATS_ITEMS);

        for (const [category, count] of categoryCounts) {
          const categoryName = categoryMappings[category] || category;
          markdown += `- ${categoryName}: ${count}\n`;
        }

        if (Object.keys(byCategory).length > MAX_STATS_ITEMS) {
          markdown += `- Plus ${Object.keys(byCategory).length - MAX_STATS_ITEMS} more categories\n`;
        }

        // List authors if available
        if (authors && authors.length > 0) {
          const MAX_AUTHORS = 15;

          markdown += `\n### Contributors\n\n`;
          if (authors.length <= MAX_AUTHORS) {
            markdown += authors.join(", ");
          } else {
            markdown += `${authors.slice(0, MAX_AUTHORS).join(", ")} and ${authors.length - MAX_AUTHORS} others`;
          }
          markdown += `\n\n`;
        }
      }

      let hasContent = false;
      const categoryOrder = [
        "features",
        "fixes",
        "perf",
        "refactor",
        "docs",
        "style",
        "test",
        "chore",
        "ci",
        "build",
        "revert",
        "other",
      ];

      for (const category of categoryOrder) {
        const commits = categories[category];

        if (!commits || commits.length === 0) {
          continue;
        }

        hasContent = true;

        const categoryName = categoryMappings[category] || category;
        markdown += `## ${categoryName}\n\n`;

        const MAX_COMMITS_PER_CATEGORY = 50;
        const displayedCommits = commits.slice(0, MAX_COMMITS_PER_CATEGORY);

        for (const commit of displayedCommits) {
          try {
            let message = commit.message || "No message";
            const hash = commit.hash ? commit.hash.substring(0, 8) : "unknown";
            const scope = commit.scope ? `**${commit.scope}**: ` : "";

            if (message.length > 500) {
              message = message.substring(0, 500) + "...";
            }

            markdown += `- ${scope}${message} (\`${hash}\`)\n`;
          } catch (error) {
            console.error(`Error formatting commit:`, error);
          }
        }

        if (commits.length > MAX_COMMITS_PER_CATEGORY) {
          markdown += `- ... and ${commits.length - MAX_COMMITS_PER_CATEGORY} more\n`;
        }

        markdown += `\n`;
      }

      if (!hasContent) {
        markdown += `No categorized changes found.\n`;
      }

      return markdown;
    } catch (error: unknown) {
      console.error("Error generating changelog markdown:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return `# Error Generating Changelog\n\nAn error occurred while generating the changelog: ${errorMessage}\n\nPlease check your commit data and try again with a smaller dataset or report this issue.`;
    }
  },
});
