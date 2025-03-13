import { Step, Workflow } from "@mastra/core/workflows";
import { z } from "zod";
import { aiSummaryAgent, changelogAgent } from "../agents/changelog-agent";
import {
  analyzeCommitsTool,
  generateChangelogMarkdownTool,
} from "../tools/commit-tools";

const CommitSchema = z.object({
  hash: z.string(),
  message: z.string(),
  author: z.string(),
  date: z.string(),
});

export type Commit = z.infer<typeof CommitSchema>;

const CommitDataSchema = z.object({
  commits: z.array(CommitSchema),
  startDate: z.string(),
  endDate: z.string(),
  authors: z.array(z.string()),
});

export type CommitData = z.infer<typeof CommitDataSchema>;

export interface CategoryStats {
  total: number;
  byType: Record<string, number>;
}

export interface CategorizedCommits {
  byType: Record<string, Commit[]>;
  stats: CategoryStats;
}

const ChangelogGenerationInputSchema = z.object({
  commitData: CommitDataSchema,
  title: z.string().optional(),
  includeStats: z.boolean().optional(),
  generateSummary: z.boolean().optional(),
});

export type ChangelogGenerationInput = z.infer<
  typeof ChangelogGenerationInputSchema
>;

export const ChangelogOutputSchema = z.object({
  changelog: z.string(),
  summary: z.string().optional(),
  metadata: z.record(z.any()),
});

export type ChangelogOutput = z.infer<typeof ChangelogOutputSchema>;

const analyzeCommitsStep = new Step({
  id: "analyze-commits",
  description: "Analyzes commit messages and categorizes them by type",
  inputSchema: z.object({
    commitData: CommitDataSchema,
  }),
  execute: async ({ context }) => {
    const input = context?.getStepResult<{ commitData: CommitData }>("trigger");

    if (!input) {
      throw new Error("Input data not found");
    }

    const MAX_COMMITS = 300;
    if (input.commitData.commits.length > MAX_COMMITS) {
      console.log(
        `Large dataset detected (${input.commitData.commits.length} commits). Limiting to ${MAX_COMMITS} most recent commits.`,
      );

      const limitedCommitData = {
        ...input.commitData,
        commits: [...input.commitData.commits]
          .sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          )
          .slice(0, MAX_COMMITS),
      };

      return analyzeCommitsTool.execute?.({
        context: { commitData: limitedCommitData },
      });
    }

    return analyzeCommitsTool.execute?.({
      context: { commitData: input.commitData },
    });
  },
});

// Step 2: Generate a technical changelog in markdown format
const generateTechnicalChangelogStep = new Step({
  id: "generate-technical-changelog",
  description: "Generates a technical changelog in markdown format",
  inputSchema: z.object({
    categorizedCommits: z.object({
      byType: z.record(z.array(CommitSchema)),
      stats: z.object({
        total: z.number(),
        byType: z.record(z.number()),
      }),
    }),
    title: z.string().optional(),
    includeStats: z.boolean().optional(),
  }),
  execute: async ({ context }) => {
    const categorizedCommits =
      context?.getStepResult<CategorizedCommits>("analyze-commits");
    const input = context?.getStepResult<ChangelogGenerationInput>("trigger");

    if (!categorizedCommits || !input) {
      throw new Error("Required data not found");
    }

    const MAX_COMMITS_PER_CATEGORY = 50;
    const limitedCommits = {
      byType: {} as Record<string, Commit[]>,
      stats: { ...categorizedCommits.stats },
    };

    let totalCommits = 0;
    for (const category in categorizedCommits.byType) {
      const commits = categorizedCommits.byType[category];
      totalCommits += commits.length;

      limitedCommits.byType[category] = commits.slice(
        0,
        MAX_COMMITS_PER_CATEGORY,
      );
    }

    if (totalCommits > 500) {
      console.log(
        `Large dataset detected (${totalCommits} commits). Limiting to ${MAX_COMMITS_PER_CATEGORY} commits per category.`,
      );
    }

    return generateChangelogMarkdownTool.execute?.({
      context: {
        categorizedCommits: {
          categories: limitedCommits.byType,
          stats: {
            ...categorizedCommits.stats,
            authors: input.commitData.authors,
            byCategory: categorizedCommits.stats.byType,
            dateRange: {
              start: input.commitData.startDate,
              end: input.commitData.endDate,
            },
          },
        },
        title: input.title,
        includeStats: input.includeStats,
      },
    });
  },
});

// Step 3: Generate a user-friendly changelog using the AI agent
const generateUserFriendlyChangelogStep = new Step({
  id: "generate-user-friendly-changelog",
  description: "Generates a user-friendly changelog using AI",
  inputSchema: z.object({
    technicalChangelog: z.string(),
    commitData: CommitDataSchema,
  }),
  execute: async ({ context }) => {
    const technicalChangelog = context?.getStepResult<string>(
      "generate-technical-changelog",
    );
    const input = context?.getStepResult<{ commitData: CommitData }>("trigger");

    if (!technicalChangelog || !input) {
      throw new Error("Required data not found");
    }

    const prompt = `Transform this technical changelog into a concise, specific, and user-focused changelog.
     
     Here's the technical changelog:
     
     ${technicalChangelog}
     
     This changelog covers ${input.commitData.commits.length} commits between 
     ${new Date(input.commitData.startDate).toLocaleDateString()} and 
     ${new Date(input.commitData.endDate).toLocaleDateString()}.
     
     Contributors: ${input.commitData.authors.join(", ")}
     
     Format your response as follows:
     1. Title: Do not include a title. Use subheadings for each section
     2. Organize changes by user impact, not by commit type
     3. Use specific headings that describe the actual changes (not generic categories)
     4. For each change, describe concrete user benefits and improvements
     5. IMPORTANT: Format EVERY changelog entry as a bullet point starting with "- "
     6. DO NOT use plain text paragraphs for changelog entries - only bullet points
     7. Include PR/issue numbers as references where available
     8. Skip generic phrases like "We're pleased to announce" or "Thank you for using"
     9. Don't add filler text about "throughout the system" or "various improvements"
     10. List contributors at the end`;

    const response = await changelogAgent.stream([
      {
        role: "user",
        content: prompt,
      },
    ]);

    let userFriendlyChangelog = "";
    for await (const chunk of response.textStream) {
      userFriendlyChangelog += chunk;
    }

    return userFriendlyChangelog;
  },
});

// Step 4: Generate a summary of the changelog (optional)
const generateSummaryStep = new Step({
  id: "generate-summary",
  description: "Generates a summary of the changelog",
  inputSchema: z.object({
    userFriendlyChangelog: z.string(),
    generateSummary: z.boolean().optional(),
  }),
  execute: async ({ context }) => {
    const userFriendlyChangelog = context?.getStepResult<string>(
      "generate-user-friendly-changelog",
    );
    const input = context?.getStepResult<ChangelogGenerationInput>("trigger");

    if (!userFriendlyChangelog || !input) {
      throw new Error("Required data not found");
    }

    if (!input.generateSummary) {
      return null;
    }

    const prompt = `Create a brief summary (3-4 sentences) of the following changelog:
     
     ${userFriendlyChangelog}
     
     Focus on the most significant changes and their impact on users.`;

    const response = await aiSummaryAgent.stream([
      {
        role: "user",
        content: prompt,
      },
    ]);

    let summary = "";
    for await (const chunk of response.textStream) {
      summary += chunk;
    }

    return summary;
  },
});

const changelogWorkflow = new Workflow({
  name: "changelog-workflow",
  triggerSchema: ChangelogGenerationInputSchema,
})
  .step(analyzeCommitsStep)
  .then(generateTechnicalChangelogStep)
  .then(generateUserFriendlyChangelogStep)
  .then(generateSummaryStep);

changelogWorkflow.commit();

export { changelogWorkflow };
