import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { fcmMessage, serviceAccount, tokenGone } = await import("./fcm");

describe("fcmMessage", () => {
  it("carries the title, the words and the page to open", () => {
    expect(
      fcmMessage(
        { token: "abc", platform: "android" },
        {
          recipient: "worker@example.test",
          title: "Shift booked",
          body: "You're booked",
          url: "/worker/my-shifts",
        },
      ),
    ).toEqual({
      message: {
        token: "abc",
        notification: { title: "Shift booked", body: "You're booked" },
        data: { url: "/worker/my-shifts" },
        android: { priority: "HIGH" },
        apns: { payload: { aps: { sound: "default" } } },
      },
    });
  });
});

describe("tokenGone", () => {
  it("forgets phones Firebase no longer knows", () => {
    expect(tokenGone(404, "")).toBe(true);
    expect(
      tokenGone(400, '{"error":{"details":[{"errorCode":"UNREGISTERED"}]}}'),
    ).toBe(true);
    expect(
      tokenGone(
        400,
        "The registration token is not a valid FCM registration token",
      ),
    ).toBe(true);
  });

  it("keeps them through other problems", () => {
    expect(
      tokenGone(
        400,
        '{"error":{"status":"INVALID_ARGUMENT","message":"bad title"}}',
      ),
    ).toBe(false);
    expect(tokenGone(500, "")).toBe(false);
    expect(tokenGone(401, "")).toBe(false);
  });
});

describe("serviceAccount", () => {
  it("needs the project, email and key", () => {
    expect(serviceAccount(undefined)).toBeNull();
    expect(serviceAccount("not json")).toBeNull();
    expect(serviceAccount('{"project_id":"p"}')).toBeNull();
    expect(
      serviceAccount('{"project_id":"p","client_email":"e","private_key":"k"}'),
    ).toEqual({ project_id: "p", client_email: "e", private_key: "k" });
  });
});
