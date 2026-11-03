import { describe, expect, it, vi } from "vitest";

import { ResendEmailSender } from "./resend";

const env = {
  RESEND_API_KEY: "re_test_key",
  EMAIL_FROM: "Shifta <hello@example.com>",
};

function fakeFetch(status: number, body: unknown) {
  return vi.fn(
    async () =>
      new Response(typeof body === "string" ? body : JSON.stringify(body), {
        status,
      }),
  );
}

describe("ResendEmailSender", () => {
  it("needs a key and a sender", () => {
    expect(() => new ResendEmailSender({})).toThrow(
      /RESEND_API_KEY and EMAIL_FROM/,
    );
  });

  it("sends the message with its attachments, replies to support", async () => {
    const fetchImpl = fakeFetch(200, { id: "email_123" });
    const sender = new ResendEmailSender(env, fetchImpl);
    const result = await sender.send({
      to: "accounts@example.com",
      subject: "Tax invoice INV-1001",
      text: "Your invoice is attached.",
      tag: "invoice",
      attachments: [
        {
          filename: "INV-1001.pdf",
          contentType: "application/pdf",
          content: "JVBERi0=",
        },
      ],
    });
    expect(result).toEqual({ id: "email_123" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer re_test_key",
    });
    expect(JSON.parse(init.body as string)).toEqual({
      from: "Shifta <hello@example.com>",
      to: ["accounts@example.com"],
      reply_to: "support@shifta.com.au",
      subject: "Tax invoice INV-1001",
      text: "Your invoice is attached.",
      tags: [{ name: "template", value: "invoice" }],
      attachments: [
        {
          filename: "INV-1001.pdf",
          content: "JVBERi0=",
          content_type: "application/pdf",
        },
      ],
    });
  });

  it("says why Resend refused, without the address", async () => {
    const sender = new ResendEmailSender(
      env,
      fakeFetch(422, { message: "The `to` field is invalid." }),
    );
    await expect(
      sender.send({ to: "nobody@example.com", subject: "Hi", text: "Hi" }),
    ).rejects.toThrow(/Resend didn't send the email \(422\)/);
    await expect(
      sender.send({ to: "nobody@example.com", subject: "Hi", text: "Hi" }),
    ).rejects.not.toThrow(/nobody@example\.com/);
  });
});
