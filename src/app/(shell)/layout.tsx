import AppRail from "@/components/shell/app-rail";

export default function ShellLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // lifted from prototype CSS
  return (
    <div className="flex min-h-screen bg-celia-page-background">
      <AppRail />
      <main className="min-w-0 flex-1 px-[var(--content-padding-x)] pb-[var(--content-padding-bottom)] pt-[var(--content-padding-top)]">
        {children}
      </main>
    </div>
  );
}
