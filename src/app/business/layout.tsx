import { requireRole } from "@/lib/auth";

export default async function BusinessLayout({
  children,
}: LayoutProps<"/business">) {
  await requireRole("business_user");
  return children;
}
