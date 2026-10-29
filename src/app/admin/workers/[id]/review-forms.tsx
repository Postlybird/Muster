"use client";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { ConfirmAction } from "@/components/forms/confirm-action";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { useServerForm } from "@/components/forms/use-server-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

import {
  activateWorker,
  reviewIdentity,
  reviewPhoto,
  reviewRightToWork,
  reviewTicket,
  saveLevels,
  savePayroll,
} from "./actions";
import { DecisionForm } from "./decision-form";

export function PhotoReview({
  workerId,
  reasons,
}: {
  workerId: string;
  reasons: string[];
}) {
  return (
    <DecisionForm
      id="photo"
      action={reviewPhoto.bind(null, workerId)}
      reasons={reasons}
      approveLabel="Approve photo"
    />
  );
}

export function IdentityReview({
  workerId,
  reasons,
}: {
  workerId: string;
  reasons: string[];
}) {
  return (
    <DecisionForm
      id="identity"
      action={reviewIdentity.bind(null, workerId)}
      reasons={reasons}
      approveLabel="ID matches the details and the selfie"
      renderApprove={(errors) => (
        <FormField
          id="document_reference"
          label="Last 4 characters of the licence or passport number"
          hint="Kept as a record of what you checked. The images are deleted when you save."
          error={errors?.document_reference}
        >
          {(props) => (
            <Input
              {...props}
              name="document_reference"
              maxLength={20}
              autoComplete="off"
              className="w-40"
            />
          )}
        </FormField>
      )}
    />
  );
}

export type VevoDefaults = {
  subclass: string;
  visaExpiry: string;
  conditions: string;
  workLimit: boolean;
  today: string;
};

function VevoFields({
  errors,
  defaults,
}: {
  errors: Record<string, string[] | undefined> | undefined;
  defaults: VevoDefaults;
}) {
  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <p className="text-sm text-muted-foreground">
        Check VEVO in ImmiAccount, then record the result here.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="vevo_checked_on"
          label="Checked on"
          error={errors?.vevo_checked_on}
        >
          {(props) => (
            <Input
              {...props}
              type="date"
              name="vevo_checked_on"
              defaultValue={defaults.today}
              max={defaults.today}
            />
          )}
        </FormField>
        <FormField
          id="vevo_reference"
          label="VEVO reference"
          error={errors?.vevo_reference}
        >
          {(props) => (
            <Input {...props} name="vevo_reference" autoComplete="off" />
          )}
        </FormField>
        <FormField
          id="visa_subclass"
          label="Visa subclass"
          error={errors?.visa_subclass}
        >
          {(props) => (
            <Input
              {...props}
              name="visa_subclass"
              defaultValue={defaults.subclass}
              autoComplete="off"
            />
          )}
        </FormField>
        <FormField
          id="visa_expiry"
          label="Visa expiry (if any)"
          error={errors?.visa_expiry}
        >
          {(props) => (
            <Input
              {...props}
              type="date"
              name="visa_expiry"
              defaultValue={defaults.visaExpiry}
            />
          )}
        </FormField>
      </div>
      <FormField
        id="visa_conditions"
        label="Work conditions shown in VEVO"
        error={errors?.visa_conditions}
      >
        {(props) => (
          <Textarea
            {...props}
            name="visa_conditions"
            rows={2}
            defaultValue={defaults.conditions}
          />
        )}
      </FormField>
      <div className="flex items-center gap-3">
        <Checkbox
          id="work_limit_flag"
          name="work_limit_flag"
          defaultChecked={defaults.workLimit}
        />
        <Label htmlFor="work_limit_flag" className="font-normal">
          Their hours are limited (flag for admin when booking)
        </Label>
      </div>
      <FormField
        id="next_check_due"
        label="Next VEVO check"
        hint="Leave blank to use the visa expiry, or 3 months for a bridging visa with no end date."
        error={errors?.next_check_due}
      >
        {(props) => (
          <Input
            {...props}
            type="date"
            name="next_check_due"
            className="w-48"
          />
        )}
      </FormField>
    </div>
  );
}

export function RightToWorkReview({
  workerId,
  reasons,
  citizen,
  recheck,
  vevo,
}: {
  workerId: string;
  reasons: string[];
  citizen: boolean;
  /** Already verified: recording a new VEVO check. */
  recheck: boolean;
  vevo: VevoDefaults;
}) {
  return (
    <DecisionForm
      id="right-to-work"
      action={reviewRightToWork.bind(null, workerId)}
      reasons={reasons}
      approveLabel={
        citizen
          ? "The document shows Australian citizenship"
          : recheck
            ? "Record a new VEVO check"
            : "VEVO shows they can work"
      }
      renderApprove={
        citizen
          ? undefined
          : (errors) => <VevoFields errors={errors} defaults={vevo} />
      }
    />
  );
}

export function TicketReview({
  workerId,
  credentialId,
  reasons,
}: {
  workerId: string;
  credentialId: string;
  reasons: string[];
}) {
  return (
    <DecisionForm
      id={`ticket-${credentialId}`}
      action={reviewTicket.bind(null, workerId, credentialId)}
      reasons={reasons}
      approveLabel="Verify"
    />
  );
}

export function LevelsForm({
  workerId,
  categories,
}: {
  workerId: string;
  categories: { id: string; name: string; years: number; level: number }[];
}) {
  const { state, onSubmit, pending } = useServerForm(
    saveLevels.bind(null, workerId),
  );
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <ul className="space-y-3">
        {categories.map((category) => (
          <li
            key={category.id}
            className="flex flex-wrap items-center justify-between gap-3"
          >
            <span>
              {category.name}
              <span className="text-muted-foreground">
                {" "}
                ·{" "}
                {category.years === 0
                  ? "under a year"
                  : `${category.years}${category.years === 10 ? "+" : ""} yrs`}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <Label htmlFor={`level-${category.id}`} className="font-normal">
                Level
              </Label>
              <NativeSelect
                id={`level-${category.id}`}
                name={`level_${category.id}`}
                defaultValue={category.level}
                className="w-24"
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </NativeSelect>
            </span>
          </li>
        ))}
      </ul>
      <ActionFeedback state={state} />
      <SubmitButton pending={pending} variant="outline">
        Save levels
      </SubmitButton>
    </form>
  );
}

export function PayrollForm({
  workerId,
  employeeId,
  status,
}: {
  workerId: string;
  employeeId: string;
  status: "not_started" | "invited" | "complete";
}) {
  const {
    state,
    onSubmit,
    pending,
    fieldErrors: errors,
  } = useServerForm(savePayroll.bind(null, workerId));
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="payroll_employee_id"
          label="Employment Hero employee ID"
          error={errors?.payroll_employee_id}
        >
          {(props) => (
            <Input
              {...props}
              name="payroll_employee_id"
              defaultValue={employeeId}
              autoComplete="off"
            />
          )}
        </FormField>
        <FormField
          id="payroll_status"
          label="Payroll setup"
          error={errors?.payroll_status}
        >
          {(props) => (
            <NativeSelect
              {...props}
              name="payroll_status"
              defaultValue={status}
            >
              <option value="not_started">Not started</option>
              <option value="invited">Invited (waiting for the worker)</option>
              <option value="complete">Complete</option>
            </NativeSelect>
          )}
        </FormField>
      </div>
      <ActionFeedback state={state} />
      <SubmitButton pending={pending} variant="outline">
        Save payroll details
      </SubmitButton>
    </form>
  );
}

export function ActivateButton({
  workerId,
  name,
}: {
  workerId: string;
  name: string;
}) {
  return (
    <ConfirmAction
      trigger={<Button size="lg">Activate</Button>}
      title={`Activate ${name}?`}
      description="They'll be texted, and can take shifts in work types where their tickets are verified."
      confirmLabel="Activate"
      variant="default"
      action={activateWorker.bind(null, workerId)}
    />
  );
}
