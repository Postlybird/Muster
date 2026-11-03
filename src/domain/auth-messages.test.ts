import { describe, expect, it } from "vitest";

import {
  AUTH_TEXTS_PER_DAY,
  authEmailDecision,
  authMobile,
  authTextDecision,
  signInLink,
} from "./auth-messages";

describe("code texts", () => {
  const change = {
    user: { id: "u1", phone: "" },
    sms: { otp: "123456", phone: "61412345678" },
  };

  it("confirm a new Australian mobile", () => {
    expect(authTextDecision(change, 0)).toEqual({
      ok: true,
      userId: "u1",
      to: "+61412345678",
      body: "Your code to confirm this mobile number is 123456. It expires in 15 minutes.",
    });
    expect(
      authTextDecision(
        { ...change, user: { id: "u1", phone: "61400000000" } },
        0,
      ),
    ).toMatchObject({ ok: true, to: "+61412345678" });
  });

  it("never sign anyone in by text", () => {
    expect(
      authTextDecision(
        {
          user: { id: "u1", phone: "61412345678" },
          sms: { otp: "1", phone: "61412345678" },
        },
        0,
      ),
    ).toMatchObject({ ok: false, httpCode: 403 });
    expect(
      authTextDecision(
        { user: { id: "u1", phone: "61412345678" }, sms: { otp: "1" } },
        0,
      ),
    ).toMatchObject({ ok: false, httpCode: 403 });
  });

  it("only go to Australian mobiles", () => {
    for (const phone of ["447700900123", "61298765432", "1415555", ""]) {
      expect(
        authTextDecision({ ...change, sms: { otp: "1", phone } }, 0),
      ).toMatchObject({ ok: false });
    }
  });

  it(`stop at ${AUTH_TEXTS_PER_DAY} a day for each person`, () => {
    expect(authTextDecision(change, AUTH_TEXTS_PER_DAY - 1).ok).toBe(true);
    expect(authTextDecision(change, AUTH_TEXTS_PER_DAY)).toMatchObject({
      ok: false,
      httpCode: 429,
    });
  });

  it("need a person and a code", () => {
    expect(
      authTextDecision({ sms: { otp: "1", phone: "61412345678" } }, 0).ok,
    ).toBe(false);
    expect(
      authTextDecision({ ...change, sms: { phone: "61412345678" } }, 0).ok,
    ).toBe(false);
  });

  it("read mobiles as Supabase stores them", () => {
    expect(authMobile("61412345678")).toBe("+61412345678");
    expect(authMobile("+61412345678")).toBe("+61412345678");
    expect(authMobile("0412345678")).toBeNull();
    expect(authMobile("614123456789")).toBeNull();
  });
});

describe("code emails", () => {
  const site = "https://www.shifta.com.au";
  const signIn = {
    user: { email: "jo@example.com" },
    email_data: {
      token: "654321",
      token_hash: "hash-1",
      redirect_to: "https://www.shifta.com.au/auth/confirm?next=%2Fworker",
      email_action_type: "magiclink",
    },
  };

  it("carry the code and a link back to our site", () => {
    expect(authEmailDecision(signIn, site)).toEqual({
      ok: true,
      to: "jo@example.com",
      code: "654321",
      link: "https://www.shifta.com.au/auth/confirm?next=%2Fworker&token_hash=hash-1&type=email",
    });
    expect(
      authEmailDecision(
        {
          ...signIn,
          email_data: { ...signIn.email_data, email_action_type: "signup" },
        },
        site,
      ).ok,
    ).toBe(true);
  });

  it("aren't sent to change an address, or for anything else", () => {
    for (const action of ["email_change", "recovery", "invite", ""]) {
      expect(
        authEmailDecision(
          {
            ...signIn,
            email_data: { ...signIn.email_data, email_action_type: action },
          },
          site,
        ),
      ).toMatchObject({ ok: false, httpCode: 403 });
    }
  });

  it("need an address, a code and its token", () => {
    expect(authEmailDecision({ ...signIn, user: {} }, site).ok).toBe(false);
    expect(
      authEmailDecision(
        { ...signIn, email_data: { ...signIn.email_data, token: "" } },
        site,
      ).ok,
    ).toBe(false);
  });
});

describe("sign-in links", () => {
  const site = "https://www.shifta.com.au";

  it("keep where to go next, on our own site with or without www", () => {
    expect(
      signInLink(
        "https://shifta.com.au/auth/confirm?next=%2Fbusiness",
        site,
        "h",
      ),
    ).toBe(
      "https://shifta.com.au/auth/confirm?next=%2Fbusiness&token_hash=h&type=email",
    );
    expect(
      signInLink("https://www.shifta.com.au/somewhere?x=1", site, "h"),
    ).toBe(
      "https://www.shifta.com.au/auth/confirm?next=&token_hash=h&type=email",
    );
  });

  it("never lead anywhere else", () => {
    for (const elsewhere of [
      "https://evil.example/auth/confirm?next=%2F",
      "http://www.shifta.com.au/auth/confirm",
      "https://shifta.com.au.evil.example/auth/confirm",
      "not a url",
      null,
    ]) {
      expect(signInLink(elsewhere, site, "h")).toBe(
        "https://www.shifta.com.au/auth/confirm?next=&token_hash=h&type=email",
      );
    }
  });
});
