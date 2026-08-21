import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

/** Native GET form — no client JS needed for a simple list search box. */
export function AdminSearchForm({
  basePath,
  placeholder,
  defaultValue,
}: {
  basePath: string;
  placeholder: string;
  defaultValue?: string;
}) {
  return (
    <form action={basePath} method="GET" className="relative mb-4 max-w-sm">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input type="search" name="q" placeholder={placeholder} defaultValue={defaultValue} className="pl-8" />
    </form>
  );
}
