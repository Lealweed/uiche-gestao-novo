export type TolerantResult<T> = {
  data: T;
  warning?: string;
};

const OPTIONAL_PATTERNS = [
  "could not find the table",
  "relation",
  "does not exist",
  "column",
  "schema cache",
  "not found",
  "42703",
  "42p01",
];

export function isSchemaToleranceError(error: { message?: string; code?: string } | null | undefined) {
  const msg = (error?.message ?? "").toLowerCase();
  const code = (error?.code ?? "").toLowerCase();
  return OPTIONAL_PATTERNS.some((pattern) => msg.includes(pattern) || code.includes(pattern));
}

export function tolerantData<T>(
  data: T | null | undefined,
  error: { message?: string; code?: string } | null | undefined,
  fallback: T,
  moduleName: string
): TolerantResult<T> {
  if (!error) return { data: (data ?? fallback) as T };

  if (!isSchemaToleranceError(error)) {
    return {
      data: fallback,
      warning: `Falha ao carregar ${moduleName}: ${error.message ?? "erro inesperado"}`,
    };
  }

  return {
    data: fallback,
    warning: `Módulo opcional indisponível: ${moduleName}. Exibindo modo resiliente.`,
  };
}

export function firstFrom<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}
