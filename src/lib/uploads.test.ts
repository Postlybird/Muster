import { describe, expect, it } from "vitest";

import { acceptedUpload, isOwnUpload, uploadPath } from "./uploads";

const worker = "6f1c2d9e-8a4b-4c1d-9e2f-3a4b5c6d7e8f";
const other = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const random = "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed";

describe("upload paths", () => {
  it("puts files in the worker's folder with a random name", () => {
    expect(uploadPath(worker, "photo", "image/jpeg", random)).toBe(
      `${worker}/photo-${random}.jpg`,
    );
    expect(uploadPath(worker, "ticket", "application/pdf", random)).toBe(
      `${worker}/ticket-${random}.pdf`,
    );
  });

  it("accepts only the worker's own fresh uploads with the right prefix", () => {
    const path = uploadPath(worker, "photo", "image/jpeg", random);
    expect(isOwnUpload(path, worker, "photo")).toBe(true);
    expect(isOwnUpload(path, other, "photo")).toBe(false);
    expect(isOwnUpload(path, worker, "selfie")).toBe(false);
    expect(
      isOwnUpload(`${worker}/../${other}/photo-${random}.jpg`, worker, "photo"),
    ).toBe(false);
    expect(isOwnUpload(`${worker}/photo-${random}.exe`, worker, "photo")).toBe(
      false,
    );
  });

  it("keeps an unchanged file, takes a new one, and rejects anything else", () => {
    const current = `${worker}/photo-seed.png`;
    const fresh = uploadPath(worker, "photo", "image/png", random);
    expect(acceptedUpload(current, current, worker, "photo")).toBe(current);
    expect(acceptedUpload(fresh, current, worker, "photo")).toBe(fresh);
    expect(acceptedUpload("", current, worker, "photo")).toBeNull();
    expect(acceptedUpload(null, current, worker, "photo")).toBeNull();
    expect(
      acceptedUpload(`${other}/photo-${random}.png`, current, worker, "photo"),
    ).toBeUndefined();
  });
});
