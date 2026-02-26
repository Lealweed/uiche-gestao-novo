import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className }: CardProps) {
  return <section className={cn("rb-card", className)}>{children}</section>;
}

export function CardTitle({ children, className }: CardProps) {
  return <h3 className={cn("rb-card-title", className)}>{children}</h3>;
}

export function CardDescription({ children, className }: CardProps) {
  return <p className={cn("rb-card-description", className)}>{children}</p>;
}
