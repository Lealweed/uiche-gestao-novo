type FullNameValue = { full_name: string } | { full_name: string }[] | null | undefined;
type NameValue = { name: string } | { name: string }[] | null | undefined;
type BoothValue = { name: string; code: string } | { name: string; code: string }[] | null | undefined;

export function relatedFullName(value: FullNameValue) {
  return Array.isArray(value) ? value[0]?.full_name : value?.full_name;
}

export function relatedName(value: NameValue) {
  return Array.isArray(value) ? value[0]?.name : value?.name;
}

export function boothLabel(value: BoothValue) {
  const booth = Array.isArray(value) ? value[0] : value;
  return booth ? `${booth.code} - ${booth.name}` : "—";
}
