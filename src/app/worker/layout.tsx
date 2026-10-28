import { requireRole } from "@/lib/auth";

export default async function WorkerLayout({
  children,
}: LayoutProps<"/worker">) {
  await requireRole("worker");
  return children;
}
