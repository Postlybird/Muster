"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Makes a pair of push keys for the owner to add to the hosting settings.
 * They're shown once, on this screen only, and never saved.
 */
export function PushKeys({
  makeKeys,
}: {
  makeKeys: () => Promise<{ publicKey: string; privateKey: string }>;
}) {
  const [keys, setKeys] = useState<{
    publicKey: string;
    privateKey: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  if (!keys) {
    return (
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => startTransition(async () => setKeys(await makeKeys()))}
      >
        Make push keys
      </Button>
    );
  }
  return (
    <div className="space-y-4">
      <ol className="list-decimal space-y-1 pl-5 text-sm">
        <li>
          In Vercel, open the project, then Settings, then Environment
          Variables.
        </li>
        <li>
          Add NEXT_PUBLIC_VAPID_PUBLIC_KEY with the public key below, and
          VAPID_PRIVATE_KEY with the private key (mark it Sensitive).
        </li>
        <li>Add PUSH_PROVIDER with the value webpush.</li>
        <li>Redeploy. Keep the private key secret, and don&apos;t share it.</li>
      </ol>
      <div className="space-y-2">
        <Label htmlFor="vapid-public">Public key</Label>
        <Input id="vapid-public" readOnly value={keys.publicKey} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="vapid-private">Private key</Label>
        <Input id="vapid-private" readOnly value={keys.privateKey} />
      </div>
    </div>
  );
}
