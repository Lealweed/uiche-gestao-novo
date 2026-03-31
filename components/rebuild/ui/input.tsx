import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

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
          <label htmlFor={inputId} className="rb-form-label">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn("rb-field", error && "!border-[var(--ds-danger)] !shadow-[0_0_0_3px_var(--ds-danger-soft)]", className)}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-[#F87171] text-xs" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-[var(--ds-muted)] text-xs">
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
          <label htmlFor={selectId} className="rb-form-label">
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={cn("rb-field", error && "!border-[var(--ds-danger)]", className)}
          aria-invalid={!!error}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p className="text-[#F87171] text-xs" role="alert">
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
          <label htmlFor={textareaId} className="rb-form-label">
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          className={cn("rb-field resize-none", error && "!border-[var(--ds-danger)]", className)}
          aria-invalid={!!error}
          {...props}
        />
        {error && (
          <p className="text-[#F87171] text-xs" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";
