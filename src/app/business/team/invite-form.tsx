"use client";

import { useEffect, useRef } from "react";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { useServerForm } from "@/components/forms/use-server-form";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { BUSINESS_ROLES } from "@/config/business-roles";

import { inviteTeamMember } from "./actions";

export function InviteForm() {
  const {
    state,
    onSubmit,
    pending,
    fieldErrors: errors,
  } = useServerForm(inviteTeamMember);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="invite-email"
          label="Email address"
          error={errors?.email}
        >
          {(props) => (
            <Input
              {...props}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="off"
            />
          )}
        </FormField>
        <FormField
          id="invite-role"
          label="What they can do"
          error={errors?.role}
        >
          {(props) => (
            <NativeSelect {...props} name="role" defaultValue="manager">
              {Object.entries(BUSINESS_ROLES).map(([value, role]) => (
                <option key={value} value={value}>
                  {role.label}: {role.description.toLowerCase()}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
      </div>
      <ActionFeedback state={state} />
      <SubmitButton pending={pending} pendingText="Sending…" variant="outline">
        Send invite
      </SubmitButton>
    </form>
  );
}
