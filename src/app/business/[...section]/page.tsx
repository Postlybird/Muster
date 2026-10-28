import { PlaceholderPage } from "@/components/layout/placeholder-page";

export default async function Page({
  params,
}: PageProps<"/business/[...section]">) {
  const { section } = await params;
  return <PlaceholderPage href={`/business/${section.join("/")}`} />;
}
