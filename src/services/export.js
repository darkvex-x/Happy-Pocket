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

// ── PDF Helpers ───────────────────────────────────────────────────

const loadImage = (url) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = url;
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
  });
};

const drawHeart = (doc, x, y, r, fillColor = [236, 72, 153]) => {
  doc.saveGraphicsState();
  doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
  doc.setDrawColor(fillColor[0], fillColor[1], fillColor[2]);
  doc.ellipse(x - r, y, r, r, 'F');
  doc.ellipse(x + r, y, r, r, 'F');
  doc.triangle(x - 2 * r, y, x + 2 * r, y, x, y + 2.2 * r, 'F');
  doc.restoreGraphicsState();
};

const formatEventDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

const drawGrandTotal = (doc, yStart, totalGuests, totalCollection, currency) => {
  const x = 15;
  const w = 180;
  const h = 24;

  // Light purple background
  doc.setFillColor(248, 247, 255);
  doc.roundedRect(x, yStart, w, h, 3, 3, 'F');

  // Left accent bar in Purple
  doc.setFillColor(91, 61, 245);
  doc.rect(x, yStart, 3, h, 'F');

  // Text details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(91, 61, 245); // Purple
  doc.text('GRAND TOTAL', x + 8, yStart + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99); // Gray-600
  doc.text(`Total Guests: ${totalGuests}`, x + 8, yStart + 16);

  // Right side large total value
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(236, 72, 153); // Pink
  const totalVal = `${currency} ${totalCollection.toLocaleString('en-IN')}`;
  const totalWidth = doc.getTextWidth(totalVal);
  doc.text(totalVal, x + w - 8 - totalWidth, yStart + 14);

  return yStart + h;
};

const drawFinalFooter = (doc, yStart) => {
  // Divider line
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.4);
  doc.line(15, yStart, 195, yStart);

  // Thank You centered with stylish times bolditalic font
  const thankYouText = 'Thank You ';
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(15);
  doc.setTextColor(91, 61, 245); // Purple

  const textWidth = doc.getTextWidth(thankYouText);
  const thankYouX = 105 - (textWidth + 6) / 2;
  doc.text(thankYouText, thankYouX, yStart + 10);

  // Draw pink heart next to Thank You
  drawHeart(doc, thankYouX + textWidth + 3, yStart + 8, 1.8, [236, 72, 153]);

  // Subtitle with stylish times italic font
  doc.setFont('times', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  const subText = 'Thank you for trusting Digi Moi.';
  doc.text(subText, 105 - doc.getTextWidth(subText) / 2, yStart + 16);

  // Balanced footer details (2-column layout, no contact info)
  const colY = yStart + 26;

  // Column 1: Generated On (Left-aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(156, 163, 175);
  doc.text('GENERATED ON', 15, colY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99);
  const today = new Date();
  const printDate = today.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  const printTime = today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  doc.text(printDate, 15, colY + 5.5);
  doc.text(printTime, 15, colY + 10);

  // Column 2: Powered By (Right-aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(156, 163, 175);
  const powText1 = 'POWERED BY';
  const rightAlignX = 195;
  doc.text(powText1, rightAlignX - doc.getTextWidth(powText1), colY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(91, 61, 245);
  const powText2 = 'Digi Moi';
  doc.text(powText2, rightAlignX - doc.getTextWidth(powText2), colY + 6);
};

// ── PDF Export ─────────────────────────────────────────────────────

const toPDF = async (entries, eventInput, prefix, currency) => {
  if (!entries?.length) return;

  const event = typeof eventInput === 'string' ? { eventName: eventInput } : eventInput;
  const eventName = event?.eventName || 'Event Ledger';

  currency = sanitizeCurrency(currency);

  const { headers, data, totalAmount } = toRows(entries, prefix, currency);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageHeight = doc.internal.pageSize.height;

  // ── 1. Load Digi Moi Logo ──
  const logoImg = await loadImage('/logo-full.png');

  // ── 2. First Page Full Branded Header ──
  if (logoImg) {
    doc.addImage(logoImg, 'PNG', 15, 15, 45, 15);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(91, 61, 245);
    doc.text('Digi Moi', 15, 25);
  }

  // Right side: Slogan & Contact Info
  doc.setFont('times', 'italic');
  doc.setFontSize(11);
  doc.setTextColor(236, 72, 153); // Pink #EC4899
  const slogan = 'Sweet collection, Happy celebration';
  doc.text(slogan, 195 - doc.getTextWidth(slogan), 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99); // Slate-600
  const emailStr = 'Email id: digimoi.official@gmail.com';
  const contactStr = 'Contact us: +91 93424 80687';
  doc.text(emailStr, 195 - doc.getTextWidth(emailStr), 23);
  doc.text(contactStr, 195 - doc.getTextWidth(contactStr), 28);

  // Dashed Divider with center Heart
  doc.setDrawColor(209, 213, 219); // Gray-300
  doc.setLineWidth(0.4);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(15, 34, 195, 34);
  doc.setLineDashPattern([], 0); // Reset

  // Draw pink heart in center of divider
  drawHeart(doc, 105, 34, 1.5, [236, 72, 153]);

  // Event Name & Date
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(17, 24, 39); // Gray-900
  const evTitle = eventName;
  doc.text(evTitle, 105 - doc.getTextWidth(evTitle) / 2, 42);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(107, 114, 128); // Gray-500
  const evDate = `Date: ${formatEventDate(event?.functionDate)}`;
  doc.text(evDate, 105 - doc.getTextWidth(evDate) / 2, 48);

  // Summary Cards
  const cardY = 53;
  const cardW = 56;
  const cardH = 16;

  // Card 1: Total Guests
  doc.setFillColor(248, 247, 255); // Light purple
  doc.roundedRect(15, cardY, cardW, cardH, 3, 3, 'F');
  doc.setDrawColor(91, 61, 245); // Purple border
  doc.setLineWidth(0.25);
  doc.roundedRect(15, cardY, cardW, cardH, 3, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(91, 61, 245);
  doc.text('TOTAL GUESTS', 15 + 4, cardY + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(17, 24, 39);
  doc.text(String(entries.length), 15 + 4, cardY + 12);

  // Card 2: Total Collection
  doc.setFillColor(255, 245, 249); // Light pink
  doc.roundedRect(77, cardY, cardW, cardH, 3, 3, 'F');
  doc.setDrawColor(236, 72, 153); // Pink border
  doc.roundedRect(77, cardY, cardW, cardH, 3, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(236, 72, 153);
  doc.text('TOTAL COLLECTION', 77 + 4, cardY + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(17, 24, 39);
  doc.text(`${currency} ${totalAmount.toLocaleString('en-IN')}`, 77 + 4, cardY + 12);

  // Card 3: Total Receipts
  doc.setFillColor(248, 247, 255); // Light purple
  doc.roundedRect(139, cardY, cardW, cardH, 3, 3, 'F');
  doc.setDrawColor(91, 61, 245); // Purple border
  doc.roundedRect(139, cardY, cardW, cardH, 3, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(91, 61, 245);
  doc.text('TOTAL RECEIPTS', 139 + 4, cardY + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(17, 24, 39);
  doc.text(String(entries.length), 139 + 4, cardY + 12);

  // ── 3. Table Starts ──
  autoTable(doc, {
    startY: 74,
    margin: { top: 26, left: 15, right: 15 },
    head: [headers],
    body: data.map(row => [
      stripNonAscii(row[0]),
      stripNonAscii(row[1]),
      `${currency} ${Number(row[2]).toLocaleString('en-IN')}`,
      stripNonAscii(row[3]),
      row[4],
      row[5],
    ]),
    theme: 'striped',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 3.5,
      lineColor: [229, 231, 235],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [91, 61, 245], // Purple #5B3DF5
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      cellPadding: 4,
    },
    alternateRowStyles: {
      fillColor: [250, 249, 255],
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 25 },
      1: { halign: 'left', cellWidth: 55 },
      2: { halign: 'right', cellWidth: 30 },
      3: { halign: 'center', cellWidth: 25 },
      4: { halign: 'center', cellWidth: 25 },
      5: { halign: 'center', cellWidth: 20 },
    },
    rowPageBreak: 'avoid',
  });

  // ── 4. Grand Total & Thank You Footer on Final Page ──
  let finalY = doc.lastAutoTable.finalY + 10;

  if (finalY + 24 > pageHeight - 15) {
    doc.addPage();
    finalY = 26;
  }

  // Draw Grand Total block
  finalY = drawGrandTotal(doc, finalY, entries.length, totalAmount, currency);

  if (finalY + 45 > pageHeight - 10) {
    doc.addPage();
    finalY = 26;
  }

  // Draw final footer
  const footerYStart = pageHeight - 50;
  drawFinalFooter(doc, footerYStart);

  // ── 5. Post-Process Header & Accent Bar Overlay ──
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Colored Accent Bars
    doc.setFillColor(91, 61, 245);
    doc.rect(0, 0, 210, 4, 'F');
    doc.setFillColor(236, 72, 153);
    doc.rect(0, 4, 210, 1.5, 'F');

    if (i === 1) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(156, 163, 175);
      const pageStr = `Page 1 of ${pageCount}`;
      doc.text(pageStr, 195 - doc.getTextWidth(pageStr), pageHeight - 10);
    } else {
      // Compact page header
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.3);
      doc.line(15, 10, 195, 10);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(91, 61, 245);
      doc.text('Digi Moi', 15, 14.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(107, 114, 128);
      const pageStr = `Page ${i} of ${pageCount}`;
      doc.text(pageStr, 195 - doc.getTextWidth(pageStr), 14.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(75, 85, 99);
      doc.text(eventName, 15, 19.5);

      const dateStr = `Date: ${formatEventDate(event?.functionDate)}`;
      doc.text(dateStr, 195 - doc.getTextWidth(dateStr), 19.5);

      doc.line(15, 22, 195, 22);
    }
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
