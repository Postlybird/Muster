import { PlaceholderPage } from "@/components/layout/placeholder-page";

export default async function Page({
  params,
}: PageProps<"/worker/[...section]">) {
  const { section } = await params;
  return <PlaceholderPage href={`/worker/${section.join("/")}`} />;
}
