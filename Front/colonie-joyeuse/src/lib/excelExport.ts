import XLSX from 'xlsx-js-style';

const headerStyle = {
  font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11, name: 'Arial' },
  fill: { fgColor: { rgb: '1B5E20' } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: {
    top: { style: 'thin', color: { rgb: '999999' } },
    bottom: { style: 'thin', color: { rgb: '999999' } },
    left: { style: 'thin', color: { rgb: '999999' } },
    right: { style: 'thin', color: { rgb: '999999' } },
  },
};

const cellStyle = {
  font: { sz: 10, name: 'Arial' },
  alignment: { vertical: 'center' },
  border: {
    top: { style: 'thin', color: { rgb: 'CCCCCC' } },
    bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
    left: { style: 'thin', color: { rgb: 'CCCCCC' } },
    right: { style: 'thin', color: { rgb: 'CCCCCC' } },
  },
};

const altRowFill = { fgColor: { rgb: 'F1F8E9' } };

export function exportStyledExcel(
  headers: string[],
  rows: any[][],
  sheetName: string,
  fileName: string
) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Style headers
  headers.forEach((_, colIdx) => {
    const ref = XLSX.utils.encode_cell({ r: 0, c: colIdx });
    if (ws[ref]) ws[ref].s = headerStyle;
  });

  // Style data rows
  rows.forEach((row, rowIdx) => {
    row.forEach((_, colIdx) => {
      const ref = XLSX.utils.encode_cell({ r: rowIdx + 1, c: colIdx });
      if (ws[ref]) {
        ws[ref].s = {
          ...cellStyle,
          fill: rowIdx % 2 === 1 ? altRowFill : undefined,
        };
      }
    });
  });

  // Auto column widths
  ws['!cols'] = headers.map((h, i) => {
    const maxLen = Math.max(
      h.length,
      ...rows.map(r => String(r[i] ?? '').length)
    );
    return { wch: Math.min(Math.max(maxLen + 2, 8), 35) };
  });

  // Row height for header
  ws['!rows'] = [{ hpx: 28 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName);
}
