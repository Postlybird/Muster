/**
 * Demo data: `npm run seed`. Safe to run repeatedly; it only adds what's
 * missing. See scripts/seed/data for the people and catalogues.
 *
 * `npm run seed:reference` adds only the real setup, for the live site:
 * settings, catalogues, the checked rate cards, public holidays, states and
 * agreements. No demo people, businesses or jobs, and no placeholder rates.
 * The live workflow sets SEED_TARGET=live, and then demo data is refused.
 */
import { createSeedClient, loadEnv } from "./client";
import { seedBookings } from "./steps/bookings";
import { seedBusinesses } from "./steps/businesses";
import { seedCatalogues } from "./steps/catalogues";
import { seedCompliance } from "./steps/compliance";
import { seedJobs } from "./steps/jobs";
import { seedMatches } from "./steps/matches";
import { seedSettings } from "./steps/settings";
import { seedUsers } from "./steps/users";
import { seedRatings, seedWorked } from "./steps/worked";
import { seedWorkers } from "./steps/workers";

async function main() {
  loadEnv();
  const referenceOnly = process.argv.includes("--reference");
  if (process.env.SEED_TARGET === "live" && !referenceOnly) {
    throw new Error(
      "Refusing to put demo data in the live database. Use npm run seed:reference.",
    );
  }
  const { client, url } = createSeedClient();
  console.log(
    `Seeding ${referenceOnly ? "the real setup (no demo data)" : "demo data"} into ${url}`,
  );

  const settings = await seedSettings(client, { demo: !referenceOnly });
  console.log("  settings added:", settings.settings);

  const catalogues = await seedCatalogues(client);
  console.log("  catalogues added:", catalogues);

  const compliance = await seedCompliance(client, {
    placeholderRates: !referenceOnly,
  });
  console.log("  rates and compliance added:", compliance);

  if (referenceOnly) {
    console.log("Done.");
    return;
  }

  const users = await seedUsers(client);
  console.log(`  demo logins: ${users.users} (${users.newUsers} new)`);

  const businesses = await seedBusinesses(client);
  console.log(
    `  businesses: ${businesses.businesses} (${businesses.added} added, ${businesses.repaired} sites corrected, ${businesses.accepted} accepted the new services agreement)`,
  );

  const workers = await seedWorkers(client);
  console.log(
    `  worker details: ${workers.workers} workers (${workers.newlySeeded} filled in, ${workers.newVersionsAccepted} new document versions accepted)`,
  );

  const jobs = await seedJobs(client);
  console.log(`  demo jobs: ${jobs.added} posted`);

  const matches = await seedMatches(client);
  console.log(`  workers matched to ${matches.jobs} open jobs`);

  const bookings = await seedBookings(client);
  console.log(
    `  demo applications: ${bookings.applied} new, bookings: ${bookings.booked} new`,
  );

  const worked = await seedWorked(client);
  console.log(`  worked shifts with timesheets: ${worked.shifts} added`);

  const ratings = await seedRatings(client);
  console.log(`  demo ratings: ${ratings.added} added`);

  console.log("Done.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
