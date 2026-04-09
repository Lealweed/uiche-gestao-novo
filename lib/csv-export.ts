function sanitizeCsvCell(value: unknown) {
  let normalized = "";

  if (value !== null && value !== undefined) {
    normalized = typeof value === "number"
      ? value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })
      : String(value);
  }

  const trimmedStart = normalized.trimStart();
  if (/^[=+\-@]/.test(trimmedStart) || /^[\t\r]/.test(normalized)) {
    normalized = `'${normalized}`;
  }

  normalized = normalized.replace(/"/g, '""');
  return `"${normalized}"`;
}

export function exportToCSV(filename: string, rows: any[], columns: { key: string; label: string }[]) {
  if (!rows || !rows.length) return;
  const separator = ";";
  const header = columns.map(c => `"${c.label}"`).join(separator);
  
  const csvData = rows.map(row => {
    return columns.map(c => sanitizeCsvCell(row[c.key])).join(separator);
  });
  
  const csvContent = [header, ...csvData].join("\n");
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
