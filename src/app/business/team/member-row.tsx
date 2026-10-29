"use client";

import { useState } from "react";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { ConfirmAction } from "@/components/forms/confirm-action";
import { SubmitButton } from "@/components/forms/submit-button";
import { useServerForm } from "@/components/forms/use-server-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { BUSINESS_ROLES, type BusinessRoleKey } from "@/config/business-roles";

import { removeTeamMember, resendInvite, updateTeamMember } from "./actions";

export type Member = {
  id: string;
  name: string;
  contact: string;
  role: BusinessRoleKey;
  invited: boolean;
  isMe: boolean;
  siteIds: string[];
};

export function MemberRow({
  member,
  sites,
  canEdit,
}: {
  member: Member;
  sites: { id: string; name: string }[];
  canEdit: boolean;
}) {
  const { state, onSubmit, pending } = useServerForm(
    updateTeamMember.bind(null, member.id),
  );
  const [role, setRole] = useState<BusinessRoleKey>(member.role);
  const editable = canEdit && !member.isMe;

  return (
    <li className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 [overflow-wrap:anywhere]">
          <p className="font-medium">
            {member.name}
            {member.isMe ? (
              <span className="text-muted-foreground"> (you)</span>
            ) : null}
          </p>
          {member.contact ? (
            <p className="text-sm text-muted-foreground">{member.contact}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="neutral">{BUSINESS_ROLES[member.role].label}</Badge>
          {member.invited ? <Badge variant="info">Invited</Badge> : null}
        </div>
      </div>

      {editable ? (
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor={`role-${member.id}`}>What they can do</Label>
            <NativeSelect
              id={`role-${member.id}`}
              name="role"
              value={role}
              onChange={(event) =>
                setRole(event.target.value as BusinessRoleKey)
              }
              className="sm:w-80"
            >
              {Object.entries(BUSINESS_ROLES).map(([value, info]) => (
                <option key={value} value={value}>
                  {info.label}: {info.description.toLowerCase()}
                </option>
              ))}
            </NativeSelect>
          </div>
          {role === "supervisor" ? (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Their sites</legend>
              {sites.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Add a site first.
                </p>
              ) : (
                sites.map((site) => (
                  <div key={site.id} className="flex items-center gap-3">
                    <Checkbox
                      id={`site-${member.id}-${site.id}`}
                      name="site_ids"
                      value={site.id}
                      defaultChecked={member.siteIds.includes(site.id)}
                    />
                    <Label
                      htmlFor={`site-${member.id}-${site.id}`}
                      className="font-normal"
                    >
                      {site.name}
                    </Label>
                  </div>
                ))
              )}
            </fieldset>
          ) : null}
          <ActionFeedback state={state} />
          <div className="flex flex-wrap gap-2">
            <SubmitButton pending={pending} variant="outline" size="sm">
              Save
            </SubmitButton>
            {member.invited ? (
              <ConfirmAction
                trigger={
                  <Button type="button" variant="ghost" size="sm">
                    Send invite again
                  </Button>
                }
                title="Send the invite again?"
                description={`We'll email ${member.name} another invite.`}
                confirmLabel="Send"
                variant="default"
                action={resendInvite.bind(null, member.id)}
              />
            ) : null}
            <ConfirmAction
              trigger={
                <Button type="button" variant="ghost" size="sm">
                  Remove
                </Button>
              }
              title={`Remove ${member.name}?`}
              description="They'll lose access to your account straight away."
              confirmLabel="Remove"
              action={removeTeamMember.bind(null, member.id)}
            />
          </div>
        </form>
      ) : null}
    </li>
  );
}
