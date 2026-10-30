import { brand } from "../../../src/config/brand";
import {
  SETTINGS,
  settingKeys,
  type SettingKey,
  type SettingValue,
} from "../../../src/config/settings";

/**
 * Made-up values where the default is blank, so the demo can run pay and
 * send invoices. The owner enters the real ones before launch.
 */
const DEMO_VALUES: { [K in SettingKey]?: SettingValue<K> } = {
  company_details: {
    legal_name: `${brand.name} Labour Hire Pty Ltd (demo)`,
    abn: "00000000000",
    address: "1 Demo Street, Sydney NSW 2000",
    email: brand.supportEmail,
    phone: brand.supportPhone ?? "",
  },
  bank_details: {
    account_name: `${brand.name} Labour Hire (demo)`,
    bsb: "000-000",
    account_number: "00000000",
  },
};

/** Default policy settings, from the registry in src/config/settings.ts. */
export const SEED_SETTINGS = settingKeys.map((key) => {
  const definition = SETTINGS[key];
  return {
    key,
    value: DEMO_VALUES[key] ?? definition.defaultValue,
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
