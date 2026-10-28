import { PlaceholderPage } from "@/components/layout/placeholder-page";

export default async function Page({
  params,
}: PageProps<"/admin/[...section]">) {
  const { section } = await params;
  return <PlaceholderPage href={`/admin/${section.join("/")}`} />;
}
