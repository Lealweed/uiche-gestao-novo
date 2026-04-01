"use client";

import * as React from "react";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={cn("flex items-center", className)} aria-label="Breadcrumb">
      <ol className="flex items-center gap-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isFirst = index === 0;

          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 text-muted mx-1" aria-hidden="true" />
              )}

              {isLast ? (
                <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  {item.icon}
                  {item.label}
                </span>
              ) : (
                <button
                  onClick={item.onClick}
                  className={cn(
                    "text-sm text-muted hover:text-foreground transition-colors flex items-center gap-1.5",
                    isFirst && "text-primary hover:text-primary/80"
                  )}
                >
                  {isFirst && !item.icon && <Home className="h-4 w-4" />}
                  {item.icon}
                  {!isFirst && item.label}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
