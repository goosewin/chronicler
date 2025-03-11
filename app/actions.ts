"use server";

import { mastra } from "@/lib/mastra";

export async function getWeatherInfo(city: string) {
  const agent = mastra.getAgent("weatherAgent");

  const result = await agent.generate(`What's the weather like in ${city}?`);

  return result;
}
