import { SETTINGS, settingKeys } from "../../../src/config/settings";

/** Default policy settings, from the registry in src/config/settings.ts. */
export const SEED_SETTINGS = settingKeys.map((key) => {
  const definition = SETTINGS[key];
  return {
    key,
    value: definition.defaultValue,
    isPublic: definition.isPublic,
    description: `${definition.placeholder ? "PLACEHOLDER. " : ""}${definition.help}`,
  };
});

/**
 * Demo data only: lets the seeded @demo.test admins use admin screens
 * without an authenticator app, so "Sign in as" works. Not in the registry,
 * so it can't be changed from the settings screen. Production is never seeded.
 */
export const DEMO_ONLY_SETTINGS = [
  {
    key: "demo_admins_skip_mfa",
    value: true,
    isPublic: false,
    description:
      "Demo data only: seeded @demo.test admins skip the authenticator app.",
  },
];
