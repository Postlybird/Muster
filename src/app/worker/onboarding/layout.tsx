import { BrandMark } from "@/components/layout/brand-mark";
import { SignOutButton } from "@/components/layout/sign-out-button";

/** Onboarding gets the whole screen: no tabs or menu, just the steps. */
export default function OnboardingLayout({
  children,
}: LayoutProps<"/worker/onboarding">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-(--banner-h) z-30 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <BrandMark href="/worker" />
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-8">
        {children}
      </main>
    </div>
  );
}
