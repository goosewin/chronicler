import { createLogger } from "@mastra/core/logger";
import { Mastra } from "@mastra/core/mastra";
import { aiSummaryAgent, changelogAgent } from "./agents/changelog-agent";
import { changelogWorkflow } from "./workflows/changelog-workflow";

export const mastra = new Mastra({
  workflows: { changelogWorkflow },
  agents: { changelogAgent, aiSummaryAgent },
  logger: createLogger({
    name: "Mastra",
    level: "info",
  }),
});
