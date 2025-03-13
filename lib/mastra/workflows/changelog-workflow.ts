import { Step, Workflow } from "@mastra/core/workflows";
import { z } from "zod";
import { aiSummaryAgent, changelogAgent } from "../agents/changelog-agent";
import {
  analyzeCommitsTool,
  generateChangelogMarkdownTool,
} from "../tools/commit-tools";

// Type for the commits input
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

// Type for categorized commits
export interface CategoryStats {
  total: number;
  byType: Record<string, number>;
}

export interface CategorizedCommits {
  byType: Record<string, Commit[]>;
  stats: CategoryStats;
}

// Input schema for the workflow
const ChangelogGenerationInputSchema = z.object({
  commitData: CommitDataSchema,
  title: z.string().optional(),
  includeStats: z.boolean().optional(),
  generateSummary: z.boolean().optional(),
});

export type ChangelogGenerationInput = z.infer<
  typeof ChangelogGenerationInputSchema
>;

// Output schema for the workflow
// Use type-only export to avoid the linting error
const ChangelogOutputSchema = z.object({
  changelog: z.string(),
  summary: z.string().optional(),
  metadata: z.record(z.any()),
});

// Export as type only since it's only used as a type
export type ChangelogOutput = z.infer<typeof ChangelogOutputSchema>;

// Step 1: Analyze the commit messages and categorize them
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
    categorizedCommits: z.any(), // Using any as a temporary solution
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

    return generateChangelogMarkdownTool.execute?.({
      context: {
        categorizedCommits: {
          categories: categorizedCommits.byType,
          stats: {
            ...categorizedCommits.stats,
            authors: [],
            byCategory: {},
            dateRange: {
              start: "",
              end: "",
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

    const prompt = `I need you to rewrite this technical changelog into user-friendly language. 
     Focus on expressing the changes from the user's perspective.
     
     Here's the technical changelog:
     
     ${technicalChangelog}
     
     This changelog covers ${input.commitData.commits.length} commits made between 
     ${new Date(input.commitData.startDate).toLocaleDateString()} and 
     ${new Date(input.commitData.endDate).toLocaleDateString()}.
     
     Contributors: ${input.commitData.authors.join(", ")}
     
     Please rewrite this changelog to be more user-friendly while maintaining the 
     same structure and information.`;

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

// Define the workflow
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
