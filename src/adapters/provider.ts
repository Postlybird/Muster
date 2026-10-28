/**
 * Which implementation an adapter uses, from an environment variable.
 * Anything other than "mock" must be a real provider the owner has approved
 * (brief §1: ask before adding a paid service).
 */
export function providerFor(
  envVar: string,
  available: readonly string[],
): string {
  const chosen = process.env[envVar]?.trim() || "mock";
  if (!available.includes(chosen)) {
    throw new Error(
      `${envVar}="${chosen}" isn't available. Options: ${available.join(", ")}. See .env.example.`,
    );
  }
  return chosen;
}
