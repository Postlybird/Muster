import { describe, expect, it, vi } from "vitest";

import { TwilioSmsSender } from "./twilio";

const env = {
  TWILIO_ACCOUNT_SID: "AC123",
  TWILIO_AUTH_TOKEN: "secret",
  TWILIO_MESSAGING_SERVICE_SID: "MG456",
};

function fakeFetch(status: number, body: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status }));
}

describe("TwilioSmsSender", () => {
  it("needs the account, its token and the messaging service", () => {
    expect(() => new TwilioSmsSender({ TWILIO_ACCOUNT_SID: "AC123" })).toThrow(
      /TWILIO_AUTH_TOKEN/,
    );
  });

  it("sends through the messaging service, as us", async () => {
    const fetchImpl = fakeFetch(201, { sid: "SM789", status: "accepted" });
    const sender = new TwilioSmsSender(env, fetchImpl);
    const result = await sender.send({
      to: "+61491570006",
      body: "Shifta: Urgent work near you. Open the shift: https://example.com/s/1",
      urgent: true,
    });
    expect(result).toEqual({ id: "SM789" });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe(
      "https://api.twilio.com/2010-04-01/Accounts/AC123/Messages.json",
    );
    expect(init.headers).toMatchObject({
      Authorization: `Basic ${Buffer.from("AC123:secret").toString("base64")}`,
    });
    const body = new URLSearchParams(init.body as string);
    expect(Object.fromEntries(body)).toEqual({
      To: "+61491570006",
      Body: "Shifta: Urgent work near you. Open the shift: https://example.com/s/1",
      MessagingServiceSid: "MG456",
    });
  });

  it("gives Twilio's error code, without the phone number", async () => {
    const sender = new TwilioSmsSender(
      env,
      fakeFetch(400, {
        code: 21211,
        message: "The 'To' number +61491570006 is not a valid phone number.",
      }),
    );
    const sent = sender.send({ to: "+61491570006", body: "Hi" });
    await expect(sent).rejects.toThrow(/\(400, error 21211\)/);
    await expect(
      sender.send({ to: "+61491570006", body: "Hi" }),
    ).rejects.toThrow(/The 'To' number \[number\] is not a valid/);
  });
});
