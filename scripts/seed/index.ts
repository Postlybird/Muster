/**
 * Demo data: `npm run seed`. Safe to run repeatedly; it only adds what's
 * missing. See scripts/seed/data for the people and catalogues.
 */
import { createSeedClient, loadEnv } from "./client";
import { seedCatalogues } from "./steps/catalogues";
import { seedCompliance } from "./steps/compliance";
import { seedSettings } from "./steps/settings";
import { seedUsers } from "./steps/users";

async function main() {
  loadEnv();
  const { client, url } = createSeedClient();
  console.log(`Seeding demo data into ${url}`);

  const settings = await seedSettings(client);
  console.log("  settings added:", settings.settings);

  const catalogues = await seedCatalogues(client);
  console.log("  catalogues added:", catalogues);

  const compliance = await seedCompliance(client);
  console.log("  rates and compliance added:", compliance);

  const users = await seedUsers(client);
  console.log(`  demo logins: ${users.users} (${users.newUsers} new)`);

  console.log("Done.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
