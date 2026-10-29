"use client";

import { useState } from "react";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { useServerForm } from "@/components/forms/use-server-form";
import { Markdown } from "@/components/markdown";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import { saveAgreementDraft } from "./actions";
import { agreementKinds, type AgreementKind } from "./labels";

export type AgreementFormValues = {
  id: string | null;
  kind: AgreementKind;
  jurisdiction: string | null;
  version: string;
  title: string;
  body_md: string;
};

const STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"];

export function AgreementForm({ values }: { values: AgreementFormValues }) {
  const { state, onSubmit, pending, fieldErrors } = useServerForm(
    saveAgreementDraft.bind(null, values.id),
  );
  const [body, setBody] = useState(values.body_md);

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-3xl space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <FormField id="kind" label="Document" error={fieldErrors?.kind}>
          {(props) => (
            <Select name="kind" defaultValue={values.kind}>
              <SelectTrigger {...props}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {agreementKinds.map((k) => (
                  <SelectItem key={k.kind} value={k.kind}>
                    {k.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>
        <FormField
          id="jurisdiction"
          label="Applies in"
          hint="Most documents apply everywhere."
          error={fieldErrors?.jurisdiction}
        >
          {(props) => (
            <Select
              name="jurisdiction"
              defaultValue={values.jurisdiction ?? "all"}
            >
              <SelectTrigger {...props}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All states</SelectItem>
                {STATES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s} only
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>
        <FormField
          id="version"
          label="Version"
          hint="E.g. 1.0"
          error={fieldErrors?.version}
        >
          {(props) => (
            <Input {...props} name="version" defaultValue={values.version} />
          )}
        </FormField>
        <FormField id="title" label="Title" error={fieldErrors?.title}>
          {(props) => (
            <Input {...props} name="title" defaultValue={values.title} />
          )}
        </FormField>
      </div>

      <Tabs defaultValue="write">
        <TabsList className="w-auto">
          <TabsTrigger value="write">Write</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        <TabsContent value="write">
          <FormField
            id="body_md"
            label="Wording"
            hint="Use ## for headings, - for lists and **bold**."
            error={fieldErrors?.body_md}
          >
            {(props) => (
              <Textarea
                {...props}
                name="body_md"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={18}
                className="font-mono text-sm"
              />
            )}
          </FormField>
        </TabsContent>
        <TabsContent value="preview">
          <div className="rounded-lg border bg-card p-4">
            <Markdown>{body || "_Nothing written yet._"}</Markdown>
          </div>
        </TabsContent>
      </Tabs>

      <ActionFeedback state={state} />
      <SubmitButton pending={pending}>
        {values.id ? "Save draft" : "Create draft"}
      </SubmitButton>
    </form>
  );
}
