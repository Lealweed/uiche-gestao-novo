import { RebuildShell } from "@/components/rebuild/shell/rebuild-shell";

export default function RebuildLayout({ children }: { children: React.ReactNode }) {
  return <RebuildShell>{children}</RebuildShell>;
}
