import type { Metadata } from "next";

import { ConfirmAction } from "@/components/forms/confirm-action";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

import { resetAuthenticator } from "./actions";

export const metadata: Metadata = { title: "Admin team" };

export default async function AdminTeamPage() {
  const me = await requireAdmin();
  const admin = createAdminClient();
  const { data: admins } = await admin
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "admin")
    .is("archived_at", null)
    .order("full_name");
  const withFactors = await Promise.all(
    (admins ?? []).map(async (person) => {
      const { data } = await admin.auth.admin.mfa.listFactors({
        userId: person.id,
      });
      return {
        ...person,
        hasApp: (data?.factors ?? []).some((f) => f.status === "verified"),
      };
    }),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin team"
        description="People with admin access. Each signs in with their email and an authenticator app."
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Authenticator app</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {withFactors.map((person) => (
            <TableRow key={person.id}>
              <TableCell className="font-medium">
                {person.full_name ?? "No name"}
                {person.id === me.id ? (
                  <span className="text-muted-foreground"> (you)</span>
                ) : null}
              </TableCell>
              <TableCell>{person.email}</TableCell>
              <TableCell>
                <Badge variant={person.hasApp ? "success" : "neutral"}>
                  {person.hasApp ? "Set up" : "Not set up"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {person.hasApp && person.id !== me.id ? (
                  <ConfirmAction
                    trigger={
                      <Button variant="outline" size="sm">
                        Reset app
                      </Button>
                    }
                    title={`Reset ${person.full_name ?? "this admin"}'s authenticator app?`}
                    description="Do this if they've lost their phone. They'll set up the app again next time they sign in."
                    confirmLabel="Reset"
                    action={resetAuthenticator.bind(null, person.id)}
                  />
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
