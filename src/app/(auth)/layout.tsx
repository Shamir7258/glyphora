import Link from "next/link";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <div className="flex h-16 items-center border-b border-border/80 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="font-display text-2xl tracking-tight" aria-label="Glyphora home">
          Glyphora
        </Link>
      </div>
      <main className="flex flex-1 items-center justify-center px-4 py-12">{children}</main>
    </div>
  );
}
