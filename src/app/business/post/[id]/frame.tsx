import { WizardShell } from "@/components/wizard/wizard-shell";
import { POST_STEPS, type PostStepKey } from "@/domain/jobs";

export function PostStepFrame({
  jobId,
  step,
  completed,
  title,
  description,
  children,
}: {
  jobId: string;
  step: PostStepKey;
  completed: readonly string[];
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <WizardShell
      steps={POST_STEPS}
      currentKey={step}
      completedKeys={completed}
      title={title}
      description={description}
      exitHref="/business/post"
      stepHref={(key) => `/business/post/${jobId}/${key}`}
    >
      {children}
    </WizardShell>
  );
}
