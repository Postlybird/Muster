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
