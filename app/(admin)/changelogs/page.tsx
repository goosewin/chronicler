import { ChangelogCard } from "@/components/changelog-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { LIMITS } from "@/lib/db/constants";
import { ChangelogsInteractor } from "@/lib/interactors/changelogs";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

async function getSession() {
  try {
    return await auth.api.getSession({
      headers: await headers(),
    });
  } catch (error) {
    console.error("Error fetching session:", error);
    return null;
  }
}

export default async function ChangelogsPage() {
  const session = await getSession();

  if (!session?.user) {
    return redirect("/login");
  }

  try {
    const changelogs = await ChangelogsInteractor.getRecent(
      LIMITS.CHANGELOGS_PER_PAGE,
    );

    return (
      <div className="container py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">All Changelogs</h1>
            <p className="text-muted-foreground mt-1">
              Recent updates across all your projects
            </p>
          </div>
        </div>

        {changelogs.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No changelogs found</CardTitle>
              <CardDescription>
                You haven&apos;t created any changelogs yet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Go to one of your projects to create a changelog and publish
                updates for your users.
              </p>
              <Link href="/projects">
                <Button>Go to projects</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {changelogs.map((changelog) => (
              <ChangelogCard
                key={changelog.id}
                changelog={{
                  ...changelog,
                  projectName: changelog.project?.name ?? "",
                  project: changelog.project ?? undefined,
                }}
              />
            ))}
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error("Error in ChangelogsPage:", error);
    return (
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-4">Error Loading Changelogs</h1>
        <p>There was an error loading changelogs. Please try again later.</p>
      </div>
    );
  }
}
