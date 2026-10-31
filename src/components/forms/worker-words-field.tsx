"use client";

import { useState } from "react";

import { FormField } from "@/components/forms/form-field";
import { Textarea } from "@/components/ui/textarea";
import { WORKER_WORDS_MAX } from "@/domain/worker-words";

/**
 * A worker's words for businesses (their bio, or a note when they apply),
 * with a count of the characters left. The rules are checked when it's
 * saved (`workerWordsProblem()`).
 */
export function WorkerWordsField({
  id,
  name,
  label,
  hint,
  defaultValue,
  error,
  max = WORKER_WORDS_MAX,
  placeholder,
}: {
  id: string;
  name: string;
  label: string;
  hint: string;
  defaultValue?: string | null;
  error?: string[] | string;
  max?: number;
  placeholder?: string;
}) {
  const [text, setText] = useState(defaultValue ?? "");
  const left = max - [...text].length;
  return (
    <FormField
      id={id}
      label={label}
      hint={
        <>
          {hint}{" "}
          <span className={left < 0 ? "font-medium text-destructive" : ""}>
            {left < 0
              ? `${-left} characters too many.`
              : `${left} characters left.`}
          </span>
        </>
      }
      error={error}
    >
      {(props) => (
        <Textarea
          {...props}
          name={name}
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={3}
          placeholder={placeholder}
        />
      )}
    </FormField>
  );
}
