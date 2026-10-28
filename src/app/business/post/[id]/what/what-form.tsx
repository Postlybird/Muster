"use client";

import Link from "next/link";
import { useState } from "react";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { ChoiceField } from "@/components/forms/choice-field";
import { FormField } from "@/components/forms/form-field";
import { useServerForm } from "@/components/forms/use-server-form";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { WizardActions } from "@/components/wizard/wizard-actions";
import { JOB_TYPES, MAX_WORKERS } from "@/domain/jobs";

import { saveWhat } from "./actions";

export type WhatValues = {
  type: string;
  siteId: string;
  categoryId: string;
  headcount: string;
};

export function WhatForm({
  jobId,
  values,
  sites,
  categories,
}: {
  jobId: string;
  values: WhatValues;
  sites: { id: string; name: string; suburb: string }[];
  categories: { id: string; name: string; description: string }[];
}) {
  const {
    state,
    onSubmit,
    pending,
    fieldErrors: errors,
  } = useServerForm(saveWhat.bind(null, jobId));
  const [categoryId, setCategoryId] = useState(values.categoryId);
  const description = categories.find((c) => c.id === categoryId)?.description;

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-2xl space-y-6">
      <ChoiceField
        id="type"
        name="type"
        legend="What kind of work is it?"
        defaultValue={values.type}
        error={errors?.type}
        columns={1}
        choices={Object.entries(JOB_TYPES).map(([value, info]) => ({
          value,
          label: info.label,
          description: info.description,
        }))}
      />
      <FormField
        id="site_id"
        label="Where?"
        hint={
          <>
            Workers see the suburb when they&apos;re offered work.{" "}
            <Link href="/business/sites/new" className="underline">
              Add a site
            </Link>
          </>
        }
        error={errors?.site_id}
      >
        {(props) => (
          <NativeSelect {...props} name="site_id" defaultValue={values.siteId}>
            <option value="">Choose a site</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name} ({site.suburb})
              </option>
            ))}
          </NativeSelect>
        )}
      </FormField>
      <FormField
        id="category_id"
        label="Type of work"
        hint={description}
        error={errors?.category_id}
      >
        {(props) => (
          <NativeSelect
            {...props}
            name="category_id"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <option value="">Choose the type of work</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </NativeSelect>
        )}
      </FormField>
      <FormField
        id="headcount"
        label="How many workers?"
        error={errors?.headcount}
      >
        {(props) => (
          <Input
            {...props}
            name="headcount"
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_WORKERS}
            defaultValue={values.headcount}
            className="w-28"
          />
        )}
      </FormField>
      <ActionFeedback state={state} />
      <WizardActions pending={pending} />
    </form>
  );
}
