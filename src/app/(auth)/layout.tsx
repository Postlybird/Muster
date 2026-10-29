import { BrandMark } from "@/components/layout/brand-mark";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-md items-center px-4 pt-6">
        <BrandMark />
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
