import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

const baseFieldStyles = [
  "w-full px-3 py-2.5 text-sm text-foreground",
  "bg-input border border-border rounded-lg",
  "placeholder:text-muted",
  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background focus:border-primary",
  "disabled:opacity-50 disabled:cursor-not-allowed",
  "transition-all duration-200",
].join(" ");

const labelStyles = "block text-sm font-medium text-foreground mb-2";
const errorTextStyles = "text-destructive text-xs mt-1";
const hintTextStyles = "text-muted text-xs mt-1";

/* ------------------------------------------------------------------
   Input
------------------------------------------------------------------ */
type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={inputId} className={labelStyles}>
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            baseFieldStyles,
            error && "border-destructive focus:ring-destructive focus:border-destructive",
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className={errorTextStyles} role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className={hintTextStyles}>
            {hint}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

/* ------------------------------------------------------------------
   Select
------------------------------------------------------------------ */
type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className, id, children, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={selectId} className={labelStyles}>
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={cn(
            baseFieldStyles,
            "cursor-pointer",
            error && "border-destructive focus:ring-destructive focus:border-destructive",
            className
          )}
          aria-invalid={!!error}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p className={errorTextStyles} role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Select.displayName = "Select";

/* ------------------------------------------------------------------
   Textarea
------------------------------------------------------------------ */
type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={textareaId} className={labelStyles}>
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          className={cn(
            baseFieldStyles,
            "resize-none min-h-[80px]",
            error && "border-destructive focus:ring-destructive focus:border-destructive",
            className
          )}
          aria-invalid={!!error}
          {...props}
        />
        {error && (
          <p className={errorTextStyles} role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";
