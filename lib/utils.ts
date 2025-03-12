import { clsx, type ClassValue } from "clsx";
import { NextResponse } from "next/server";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ApiErrorResponse = {
  error: string;
  status?: number;
};

export function apiError(
  message: string,
  status = 500,
): NextResponse<ApiErrorResponse> {
  return NextResponse.json({ error: message }, { status });
}

export function apiSuccess<T>(data: T, status = 200): NextResponse<T> {
  return NextResponse.json(data, { status });
}

export function extractRepoInfo(url: string) {
  try {
    const parsedUrl = new URL(url);
    let owner = "";
    let name = "";

    const pathParts = parsedUrl.pathname.split("/").filter(Boolean);

    if (pathParts.length >= 2) {
      owner = pathParts[0];
      name = pathParts[1];
    }

    return { repositoryOwner: owner, repositoryName: name };
  } catch (error) {
    console.error("Error parsing repository URL:", error);
    return { repositoryOwner: "", repositoryName: "" };
  }
}
