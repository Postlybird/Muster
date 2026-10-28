/**
 * Invoice PDFs use the built-in Helvetica, which only has the Windows-1252
 * characters. Anything else is written without its accents (Nguyễn →
 * Nguyen), or as "?" if that still isn't enough.
 */

const EXTRAS = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
const PLAIN: Record<string, string> = {
  Đ: "D",
  đ: "d",
  Ł: "L",
  ł: "l",
  ı: "i",
  Ħ: "H",
  ħ: "h",
};

function printable(char: string): boolean {
  const code = char.codePointAt(0) ?? 0;
  return (
    char === "\n" ||
    (code >= 0x20 && code <= 0x7e) ||
    (code >= 0xa0 && code <= 0xff) ||
    EXTRAS.includes(char)
  );
}

export function pdfText(text: string): string {
  return Array.from(text.normalize("NFC"), (char) => {
    if (printable(char)) return char;
    const plain = PLAIN[char] ?? char.normalize("NFD").replace(/\p{M}/gu, "");
    return plain !== "" && Array.from(plain).every(printable) ? plain : "?";
  }).join("");
}
