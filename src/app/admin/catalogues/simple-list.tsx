"use client";

import { useEffect, useRef } from "react";

import { ConfirmAction } from "@/components/forms/confirm-action";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { SubmitButton } from "@/components/forms/submit-button";
import { useServerForm } from "@/components/forms/use-server-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { saveSimpleItem, setArchived } from "./actions";
import { CatalogueStatus } from "./status-badge";

type Item = {
  id: string;
  name: string;
  active: boolean;
  archived_at: string | null;
};
type Table = "hazards" | "ppe_items";

function AddItem({ table, noun }: { table: Table; noun: string }) {
  const { state, onSubmit, pending } = useServerForm(
    saveSimpleItem.bind(null, table, null),
  );
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);
  const error =
    state.status === "error" ? state.fieldErrors?.name?.[0] : undefined;

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      className="flex flex-wrap items-end gap-3"
    >
      <div className="min-w-60 flex-1 space-y-2">
        <Label htmlFor={`new-${table}`}>Add a {noun}</Label>
        <Input
          id={`new-${table}`}
          name="name"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `new-${table}-error` : undefined}
          required
        />
        {error ? (
          <p id={`new-${table}-error`} className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
      <SubmitButton pending={pending} pendingText="Adding…">
        Add
      </SubmitButton>
    </form>
  );
}

function ItemRow({ item, table }: { item: Item; table: Table }) {
  const { state, onSubmit, pending } = useServerForm(
    saveSimpleItem.bind(null, table, item.id),
  );
  const archived = !!item.archived_at;
  return (
    <li className="space-y-2 rounded-lg border bg-card p-3">
      <form
        onSubmit={onSubmit}
        noValidate
        className="flex flex-wrap items-center gap-3"
      >
        <Label htmlFor={`name-${item.id}`} className="sr-only">
          Name
        </Label>
        <Input
          id={`name-${item.id}`}
          name="name"
          defaultValue={item.name}
          className="min-w-52 flex-1"
          required
        />
        <div className="flex items-center gap-2">
          <Switch
            id={`active-${item.id}`}
            name="active"
            defaultChecked={item.active}
          />
          <Label htmlFor={`active-${item.id}`} className="font-normal">
            Active
          </Label>
        </div>
        <CatalogueStatus active={item.active} archivedAt={item.archived_at} />
        <SubmitButton pending={pending} variant="outline" size="sm">
          Save
        </SubmitButton>
        <ConfirmAction
          trigger={
            <Button type="button" variant="ghost" size="sm">
              {archived ? "Restore" : "Archive"}
            </Button>
          }
          title={
            archived ? `Restore "${item.name}"?` : `Archive "${item.name}"?`
          }
          description={
            archived
              ? "It will be offered again."
              : "It won't be offered on new jobs. Past jobs keep it."
          }
          confirmLabel={archived ? "Restore" : "Archive"}
          variant={archived ? "default" : "destructive"}
          action={setArchived.bind(null, table, item.id, !archived)}
        />
      </form>
      <ActionFeedback state={state} />
    </li>
  );
}

/** Lists with just a name and an active switch (hazards, PPE). */
export function SimpleList({
  items,
  table,
  noun,
}: {
  items: Item[];
  table: Table;
  noun: string;
}) {
  return (
    <div className="space-y-6">
      <AddItem table={table} noun={noun} />
      <ul className="space-y-2">
        {items.map((item) => (
          <ItemRow key={item.id} item={item} table={table} />
        ))}
      </ul>
    </div>
  );
}
