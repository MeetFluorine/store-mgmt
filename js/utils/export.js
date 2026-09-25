// =========================================================
// CSV export — generated entirely client-side, no server needed
// =========================================================

export function exportToCsv(filename, rows, columns) {
  const header = columns.map((c) => c.label).join(",");
  const lines = rows.map((row) =>
    columns
      .map((c) => {
        const val = String(row[c.key] ?? "");
        return val.includes(",") ? `"${val.replace(/"/g, '""')}"` : val;
      })
      .join(",")
  );
  const csv = [header, ...lines].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
