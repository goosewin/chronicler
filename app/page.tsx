import { MarkdownContent } from "@/components/markdown-content";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { LIMITS } from "@/lib/db/constants";
import { ChangelogsInteractor } from "@/lib/interactors/changelogs";
import { GitBranch, Layers } from "lucide-react";
import Link from "next/link";

export default async function Home() {
  const changelogs = await ChangelogsInteractor.getRecent(
    LIMITS.CHANGELOGS_PER_PAGE,
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Chronicler</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="outline">Log in</Button>
            </Link>
            <Link href="/login?signup=true">
              <Button>Sign up</Button>
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <section className="py-20 md:py-32 bg-slate-150 dark:bg-zinc-950/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl flex flex-col items-center text-center">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Intelligent Changelog Management
            </h1>
            <p className="mt-6 max-w-3xl text-lg md:text-xl text-muted-foreground">
              Chronicler automatically generates beautiful changelogs from your
              GitHub commits using AI, saving you time and keeping your users
              informed.
            </p>
          </div>
        </section>

        <section id="changelogs" className="py-20 bg-muted/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <h2 className="text-3xl font-bold text-center mb-12">
              Latest Changelogs
            </h2>
            {changelogs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  No changelogs available yet.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {changelogs.map((changelog) => (
                  <Card key={changelog.id}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <Link
                            href={`/view/projects/${changelog.projectId}/changelog/${changelog.id}`}
                            className="font-semibold text-xl hover:underline"
                          >
                            {changelog.version}
                          </Link>
                          <CardDescription className="mt-1">
                            <Link
                              href={`/view/projects/${changelog.projectId}`}
                              className="hover:underline"
                            >
                              {changelog.project?.name}
                            </Link>
                            {" · "}
                            {new Date(changelog.releaseDate).toLocaleDateString(
                              undefined,
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              },
                            )}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="markdown-preview-container mb-2">
                        <div className="markdown-preview">
                          <MarkdownContent
                            content={changelog.content.substring(0, 300)}
                            className="text-sm text-muted-foreground"
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-4">
                        <Link
                          href={`/view/projects/${changelog.projectId}/changelog/${changelog.id}`}
                          className="text-sm text-primary hover:underline"
                        >
                          Read more
                        </Link>
                        {changelog.project?.repositoryUrl && (
                          <Link
                            href={changelog.project.repositoryUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
                          >
                            <GitBranch className="h-4 w-4" />
                            <span>View Repository</span>
                          </Link>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <footer className="border-t py-6 md:py-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <span className="font-semibold">Chronicler</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Chronicler. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
