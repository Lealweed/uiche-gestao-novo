export function exportToCSV(filename: string, rows: any[], columns: { key: string; label: string }[]) {
  if (!rows || !rows.length) return;
  const separator = ";";
  const header = columns.map(c => `"${c.label}"`).join(separator);
  
  const csvData = rows.map(row => {
    return columns.map(c => {
      let val = row[c.key];
      if (val === null || val === undefined) val = "";
      // Handle formatting for numbers/money if passed as raw
      if (typeof val === "number") {
        val = val.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
      }
      if (typeof val === "string") val = val.replace(/"/g, '""');
      return `"${val}"`;
    }).join(separator);
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
