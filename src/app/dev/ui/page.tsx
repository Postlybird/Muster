import { Inbox } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status/status-badge";
import { WhatsNext } from "@/components/status/whats-next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { isDemoMode } from "@/lib/env";
import { formatCents, formatDate, formatDateTime } from "@/lib/format";
import { formatAuPhone } from "@/lib/phone";
import {
  businessStatuses,
  checkStatuses,
  workerStatuses,
} from "@/lib/statuses";

export const metadata: Metadata = { title: "UI kit", robots: { index: false } };

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4" aria-labelledby={title}>
      <h2 id={title} className="border-b pb-2 text-lg font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Demo mode only: every building block in one place, for design review. */
export default function UiKitPage() {
  if (!isDemoMode()) notFound();
  const example = new Date("2026-10-27T20:30:00Z");

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-10 px-4 py-8">
      <PageHeader
        title="UI kit"
        description="The components every screen is built from. Demo mode only."
        actions={
          <Button asChild variant="outline">
            <Link href="/dev/ui/wizard">Wizard example</Link>
          </Button>
        }
      />

      <Section title="Buttons">
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="highlight">Highlight</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button>Default (44px)</Button>
          <Button size="lg">Large</Button>
        </div>
      </Section>

      <Section title="Form fields">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="kit-name">Preferred name</Label>
            <Input
              id="kit-name"
              placeholder="e.g. Sam"
              aria-describedby="kit-name-hint"
            />
            <p id="kit-name-hint" className="text-sm text-muted-foreground">
              What supervisors will call you on site.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="kit-abn">ABN</Label>
            <Input
              id="kit-abn"
              defaultValue="12 345 678 901"
              aria-invalid
              aria-describedby="kit-abn-error"
            />
            <p id="kit-abn-error" className="text-sm text-destructive">
              That ABN isn&apos;t valid. Check the 11 digits.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="kit-category">Work type</Label>
            <Select defaultValue="restoration_labourer">
              <SelectTrigger id="kit-category">
                <SelectValue placeholder="Choose a work type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="restoration_labourer">
                  Restoration labourer
                </SelectItem>
                <SelectItem value="commercial_cleaner">
                  Commercial cleaner
                </SelectItem>
                <SelectItem value="trades_assistant">
                  Trades assistant
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="kit-notes">Access notes</Label>
            <Textarea
              id="kit-notes"
              placeholder="Gate code, parking, who to ask for"
            />
          </div>
          <div className="flex items-center gap-3">
            <Checkbox id="kit-ppe" defaultChecked />
            <Label htmlFor="kit-ppe">Steel-cap boots required</Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch id="kit-now" />
            <Label htmlFor="kit-now">Available now</Label>
          </div>
          <fieldset className="space-y-3 sm:col-span-2">
            <legend className="text-sm font-medium">
              How do you get to work?
            </legend>
            <RadioGroup defaultValue="car">
              <div className="flex items-center gap-3">
                <RadioGroupItem value="car" id="kit-car" />
                <Label htmlFor="kit-car">Own car</Label>
              </div>
              <div className="flex items-center gap-3">
                <RadioGroupItem value="public" id="kit-public" />
                <Label htmlFor="kit-public">Public transport</Label>
              </div>
            </RadioGroup>
          </fieldset>
        </div>
      </Section>

      <Section title="Statuses">
        <div className="flex flex-wrap gap-2">
          {[workerStatuses, checkStatuses, businessStatuses].flatMap((group) =>
            Object.entries(group).map(([key, status]) => (
              <StatusBadge key={`${status.label}-${key}`} status={status} />
            )),
          )}
          <Badge>Default</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <WhatsNext title="White Card" status={checkStatuses.verified} />
          <WhatsNext
            title="First aid (HLTAID011)"
            status={checkStatuses.rejected}
            detail={
              <p>
                <span className="font-medium">Reason: </span>The photo is
                blurry, so we can&apos;t read the expiry date.
              </p>
            }
          />
        </div>
      </Section>

      <Section title="Alerts">
        <div className="grid gap-3">
          <Alert variant="info">
            <AlertTitle>Shift starts in 2 hours</AlertTitle>
            <AlertDescription>
              12 George St, Parramatta. Report to Priya.
            </AlertDescription>
          </Alert>
          <Alert variant="success">
            <AlertTitle>Timesheet approved</AlertTitle>
            <AlertDescription>7.5 hours on Wed 28 Oct.</AlertDescription>
          </Alert>
          <Alert variant="warning">
            <AlertTitle>Ticket expiring</AlertTitle>
            <AlertDescription>
              Your White Card expires in 14 days.
            </AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertTitle>Couldn&apos;t save</AlertTitle>
            <AlertDescription>
              Check your connection and try again.
            </AlertDescription>
          </Alert>
        </div>
      </Section>

      <Section title="Cards, tables and empty states">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Restoration labourer</CardTitle>
              <CardDescription>
                Parramatta · Thu 29 Oct, 7:00 am – 3:30 pm
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-2xl font-semibold">{formatCents(3845)}/hr</p>
              <p className="text-muted-foreground">
                Mould · P2 respirator · Steel caps
              </p>
            </CardContent>
          </Card>
          <EmptyState
            icon={Inbox}
            title="No timesheets to approve"
            description="Timesheets appear here when workers clock out."
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Worker</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Hours</TableHead>
              <TableHead className="text-right">Cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Sam N.</TableCell>
              <TableCell>{formatDate(example)}</TableCell>
              <TableCell className="text-right">7.5</TableCell>
              <TableCell className="text-right">{formatCents(46838)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Section>

      <Section title="Australian formats">
        <dl className="grid gap-2 text-sm sm:grid-cols-[12rem_1fr]">
          <dt className="font-medium">Date</dt>
          <dd>{formatDate(example)}</dd>
          <dt className="font-medium">Date and time (Sydney)</dt>
          <dd>{formatDateTime(example)}</dd>
          <dt className="font-medium">Money (AUD)</dt>
          <dd>{formatCents(123456)}</dd>
          <dt className="font-medium">Phone</dt>
          <dd>{formatAuPhone("+61412345678")}</dd>
        </dl>
      </Section>
    </main>
  );
}
