/**
 * Export Service
 * 
 * All file-generation logic lives here.
 * UI components call these helpers — they never import xlsx/jspdf directly.
 * Each method accepts a flat array of entry objects and an event name,
 * and triggers a browser download.
 */

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Internal Helpers ──────────────────────────────────────────────

const sanitizeFilename = (name) =>
  (name || 'export').replace(/[^a-z0-9]/gi, '_').toLowerCase();

const timestamp = () =>
  new Date().toISOString().slice(0, 10); // YYYY-MM-DD

const sanitizeCurrency = (c) => {
  if (!c) return 'Rs.';
  if (typeof c !== 'string') return 'Rs.';
  if (c.includes('₹')) return 'Rs.';
  return c;
};

/**
 * Strips non-ASCII characters (emojis, Unicode symbols) that jsPDF core
 * fonts cannot render. Replaces them with empty string to prevent garbled output.
 */
const stripNonAscii = (str) => {
  if (typeof str !== 'string') return String(str ?? '');
  return str.replace(/[^\x20-\x7E\xA0-\xFF]/g, '').trim();
};

/**
 * Converts raw Entry objects into a clean 2D array with a header row.
 * This is the single source of truth for column ordering across all formats.
 */
const toRows = (entries, prefix = 'MR-', _currency = 'Rs.') => {
  const headers = ['Receipt No', 'Guest Name', 'Amount', 'Payment Method', 'Date', 'Time'];

  const data = entries.map(e => ([
    `${prefix}${e.receiptNumber}`,
    e.name,
    Number(e.amount),
    e.paymentMethod,
    e.date,
    e.time
  ]));

  const totalAmount = entries.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalRow = ['', 'TOTAL', totalAmount, '', '', ''];

  return { headers, data, totalRow, totalAmount };
};

// ── CSV Export ─────────────────────────────────────────────────────

const toCSV = (entries, eventName, prefix, currency) => {
  if (!entries?.length) return;

  const { headers, data, totalRow } = toRows(entries, prefix, currency);

  // Escape cells that may contain commas or quotes
  const escapeCell = (val) => {
    let str = String(val);
    // Protect against CSV Injection (Formula Injection)
    if (/^\s*[=+\-@]/.test(str)) {
      str = `'${str}`;
    }
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };

  const lines = [
    // Title row
    `"${eventName || 'Event'} - Moi Records"`,
    '',
    headers.map(escapeCell).join(','),
    ...data.map(row => row.map(escapeCell).join(',')),
    '',
    totalRow.map(escapeCell).join(',')
  ];

  const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  const blob = new Blob([BOM + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `${sanitizeFilename(eventName)}_${timestamp()}.csv`);
};

// ── Excel Export ──────────────────────────────────────────────────

const toExcel = (entries, eventName, prefix, currency) => {
  if (!entries?.length) return;

  const { headers, data, totalRow } = toRows(entries, prefix, currency);

  // Build worksheet data: title row + blank + header + data + blank + total
  const wsData = [
    [`${eventName || 'Event'} — Moi Records`],
    [],
    headers,
    ...data,
    [],
    totalRow
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // ── Column widths ──
  ws['!cols'] = [
    { wch: 14 },  // Receipt No
    { wch: 25 },  // Guest Name
    { wch: 14 },  // Amount
    { wch: 16 },  // Payment Method
    { wch: 14 },  // Date
    { wch: 10 },  // Time
  ];

  // ── Merge title row across all columns ──
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Moi Records');

  XLSX.writeFile(wb, `${sanitizeFilename(eventName)}_${timestamp()}.xlsx`);
};

// ── PDF Export ─────────────────────────────────────────────────────

const toPDF = (entries, eventName, prefix, currency) => {
  if (!entries?.length) return;

  currency = sanitizeCurrency(currency);

  const { headers, data, totalAmount } = toRows(entries, prefix, currency);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // ── Header Left Accent Bar ──
  doc.setFillColor(79, 70, 229); // Indigo-600 primary accent
  doc.rect(15, 15, 4, 18, 'F');

  // ── Header Text Section ──
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text(stripNonAscii(eventName) || 'Event Ledger', 23, 20);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // Slate-500
  const printDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.text(`Generated on ${printDate}`, 23, 26);

  // ── Header Divider Line ──
  doc.setDrawColor(203, 213, 225); // Slate-300
  doc.setLineWidth(0.5);
  doc.line(15, 32, 195, 32);

  // ── Summary Cards Section ──
  const summaryY = 37;
  const cardW = 56;
  const cardH = 16;
  const cardGap = 6;
  const totalCards = 3;

  const avgGift = Math.round(totalAmount / entries.length);

  const cardData = [
    { title: 'TOTAL COLLECTION', value: `${currency} ${totalAmount.toLocaleString('en-IN')}` },
    { title: 'TOTAL GUESTS', value: `${entries.length}` },
    { title: 'AVERAGE CONTRIBUTION', value: `${currency} ${avgGift.toLocaleString('en-IN')}` }
  ];

  for (let idx = 0; idx < totalCards; idx++) {
    const cardX = 15 + idx * (cardW + cardGap);
    
    // Draw background block
    doc.setFillColor(241, 245, 249); // Slate-100
    doc.rect(cardX, summaryY, cardW, cardH, 'F');
    
    // Draw border line
    doc.setDrawColor(203, 213, 225); // Slate-300
    doc.setLineWidth(0.3);
    doc.rect(cardX, summaryY, cardW, cardH, 'S');

    // Title label
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105); // Slate-600
    doc.text(cardData[idx].title, cardX + 4, summaryY + 5);

    // Value label
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.text(cardData[idx].value, cardX + 4, summaryY + 12);
  }

  // ── Data Table ──
  autoTable(doc, {
    startY: 58,
    head: [headers],
    body: data.map(row => [
      stripNonAscii(row[0]),           // Receipt Number
      stripNonAscii(row[1]),           // Guest Name
      `${currency} ${Number(row[2]).toLocaleString('en-IN')}`,  // Amount formatted
      stripNonAscii(row[3]),           // Payment Method
      row[4],                          // Date
      row[5],                          // Time
    ]),
    foot: [['', 'TOTAL', `${currency} ${totalAmount.toLocaleString('en-IN')}`, '', '', '']],
    theme: 'striped',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 3,
      lineColor: [203, 213, 225], // slate-300
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [79, 70, 229],    // Indigo-600 (strong, visible header)
      textColor: [255, 255, 255],   // White text for contrast
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 4,
    },
    footStyles: {
      fillColor: [226, 232, 240], // Slate-200 (visible total row)
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 4,
    },
    alternateRowStyles: {
      fillColor: [241, 245, 249], // Slate-100 alternate rows
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 25 },   // Receipt Number
      1: { halign: 'left', cellWidth: 55 },   // Guest Name
      2: { halign: 'right', cellWidth: 30 },  // Amount
      3: { halign: 'center', cellWidth: 25 }, // Payment Method
      4: { halign: 'center', cellWidth: 25 }, // Date
      5: { halign: 'center', cellWidth: 20 }, // Time
    },
    margin: { left: 15, right: 15 },
  });

  // ── Footer Page Numbering ──
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.setFont('helvetica', 'normal');
    
    // Left footer branding
    doc.text('Digi Moi - Wedding Moi Management System', 15, doc.internal.pageSize.height - 10);
    
    // Right footer page count
    const pageStr = `Page ${i} of ${pageCount}`;
    doc.text(pageStr, doc.internal.pageSize.width - 15 - doc.getTextWidth(pageStr), doc.internal.pageSize.height - 10);
  }

  doc.save(`${sanitizeFilename(eventName)}_${timestamp()}.pdf`);
};

// ── Download Trigger ──────────────────────────────────────────────

const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ── Public API ────────────────────────────────────────────────────

export const ExportService = {
  toCSV,
  toExcel,
  toPDF,
};
