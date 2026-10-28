import { describe, expect, it } from "vitest";

import { pdfText } from "./pdf-text";

describe("text in invoice PDFs", () => {
  it("keeps what Helvetica can print", () => {
    const text = "José Zoë O’Brien · 7:00 am – 3:30 pm · $1,234.56 €";
    expect(pdfText(text)).toBe(text);
  });

  it("drops accents it can't print, then gives up with a question mark", () => {
    expect(pdfText("Nguyễn Văn Đức")).toBe("Nguyen Van Duc");
    expect(pdfText("Łukasz")).toBe("Lukasz");
    expect(pdfText("李")).toBe("?");
  });
});
