"use server";

import { revalidatePath } from "next/cache";

import { getEmailSender } from "@/adapters/email";
import { getPushSender } from "@/adapters/push";
import { getSmsSender } from "@/adapters/sms";
import { brand } from "@/config/brand";
import { isDemoMode } from "@/lib/env";

/** Demo mode only: sends one message through each messaging adapter. */
export async function sendTestMessages(): Promise<void> {
  if (!isDemoMode()) throw new Error("Only available in demo mode.");

  await Promise.all([
    getEmailSender().send({
      to: "test@demo.test",
      subject: `Test email from ${brand.name}`,
      text: "This is a test email from the email adapter.",
      tag: "test",
    }),
    getSmsSender().send({
      to: "+61400000000",
      body: `${brand.name}: this is a test text from the SMS adapter.`,
    }),
    getPushSender().send(
      {
        endpoint: "https://push.example/test-device",
        keys: { p256dh: "test", auth: "test" },
      },
      {
        recipient: "test@demo.test",
        title: "Test notification",
        body: "This is a test from the push adapter.",
        url: "/worker",
      },
    ),
  ]);

  revalidatePath("/dev/outbox");
}
