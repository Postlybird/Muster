"use client";

import { useState } from "react";

import { ChoiceField } from "@/components/forms/choice-field";
import { FormField } from "@/components/forms/form-field";
import { Textarea } from "@/components/ui/textarea";

/**
 * After rating a worker, owners and managers can make them a favourite or
 * block them (brief §4.7).
 */
export function NextTimeField({ favourite }: { favourite: boolean }) {
  const [next, setNext] = useState("same");
  return (
    <div className="space-y-4">
      <ChoiceField
        id="next"
        name="next"
        legend="Next time"
        value={next}
        onValueChange={setNext}
        columns={1}
        choices={[
          { value: "same", label: "Nothing to change" },
          ...(favourite
            ? []
            : [
                {
                  value: "favourite",
                  label: "Add them to your favourites",
                  description:
                    "Favourites see your work first, and come first among applicants.",
                },
              ]),
          {
            value: "block",
            label: "Don't offer them our work again",
            description: "They aren't told. You can change this under Workers.",
          },
        ]}
      />
      {next === "block" ? (
        <FormField
          id="block-reason"
          label="Why don't you want them back?"
          hint="Only our team sees this."
        >
          {(props) => (
            <Textarea {...props} name="reason" rows={2} maxLength={500} />
          )}
        </FormField>
      ) : null}
    </div>
  );
}
