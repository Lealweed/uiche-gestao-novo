"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingState } from "@/components/rebuild/ui/loading-state";

type RouteAliasPageProps = {
  href: string;
  title: string;
  message: string;
};

export function RouteAliasPage({ href, title, message }: RouteAliasPageProps) {
  const router = useRouter();

  useEffect(() => {
    router.replace(href);
  }, [href, router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <LoadingState title={title} message={message} />
    </div>
  );
}
