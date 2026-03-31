"use client";

import { useEffect, useState } from "react";

type SectionMap<T extends string> = Partial<Record<string, T>>;

export function useRebuildSection<T extends string>(defaultSection: T, sectionMap: SectionMap<T>) {
  const [section, setSection] = useState<T>(defaultSection);

  useEffect(() => {
    function resolveSection(rawSection: string | null | undefined) {
      const normalized = (rawSection ?? "").trim();
      return sectionMap[normalized] ?? defaultSection;
    }

    function applySection(rawSection: string | null | undefined) {
      setSection(resolveSection(rawSection));
    }

    function handleSectionChange(event: Event) {
      applySection(String((event as CustomEvent).detail ?? ""));
    }

    window.addEventListener("rebuild:section-change", handleSectionChange);
    applySection(window.location.hash.replace("#", ""));

    return () => window.removeEventListener("rebuild:section-change", handleSectionChange);
  }, [defaultSection, sectionMap]);

  return {
    section,
    setSection,
    show: (candidate: T) => section === candidate,
  };
}
