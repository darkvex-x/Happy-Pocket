import React, { forwardRef } from 'react';
import { formatDate } from '../../utils/date';

/**
 * ThermalReceipt
 * A forwardRef component consumed by react-to-print.
 * Uses only inline styles so the output is portable for thermal POS printers.
 * Paper width is controlled by the `paperWidth` prop ("58mm" | "80mm").
 */
const ThermalReceipt = forwardRef(({ entry, event, settings, paperWidth = '58mm' }, ref) => {
  const width = paperWidth === '80mm' ? '80mm' : '58mm';
  const fontSize = paperWidth === '80mm' ? '12px' : '11px';
  const prefix = settings?.receiptPrefix || 'MR-';
  const currency = settings?.currency || '₹';

  const s = {
    page: {
      width,
      fontFamily: "'Courier New', Courier, monospace",
      fontSize,
      color: '#000',
      backgroundColor: '#fff',
      padding: '4px 6px',
      boxSizing: 'border-box',
    },
    center: { textAlign: 'center' },
    bold: { fontWeight: 'bold' },
    divider: {
      borderTop: '1px dashed #000',
      margin: '6px 0',
    },
    row: {
      display: 'flex',
      justifyContent: 'space-between',
      margin: '3px 0',
    },
    label: { color: '#000', fontWeight: 'bold' }, // High contrast pure black for labels
    large: { fontSize: paperWidth === '80mm' ? '16px' : '14px', fontWeight: 'bold' },
    footer: { textAlign: 'center', marginTop: '10px', fontSize: '9px', color: '#000', lineHeight: '1.2' }, // Pure black text
  };

  const receiptDate = entry?.date
    ? formatDate(entry.date, { day: '2-digit', month: 'short', year: 'numeric' })
    : formatDate(new Date().toISOString().split('T')[0], { day: '2-digit', month: 'short', year: 'numeric' });

  const receiptTime = entry?.time
    ? entry.time.slice(0, 5)
    : new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  if (!entry) {
    const displayDate = event?.functionDate ? formatDate(event.functionDate) : '—';
    const currentLocalTimeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const todayStr = new Date().toISOString().split('T')[0];
    const printedOnStr = `${formatDate(todayStr)} ${currentLocalTimeStr}`;

    return (
      <div ref={ref} style={s.page} className="thermal-receipt-root">
        {/* ── Logo ── */}
        <div style={{ ...s.center, marginBottom: '6px' }}>
          <img src="/logo-full.png" alt="Digi Moi" style={{ width: paperWidth === '80mm' ? '60mm' : '44mm', height: 'auto', margin: '0 auto', display: 'block' }} />
        </div>

        {/* ── Business Header ── */}
        <div style={s.center}>
          <div style={s.bold}>Event Summary Receipt</div>
        </div>

        <div style={s.divider} />

        {/* ── Event Info ── */}
        <div style={s.center}>
          <div style={s.bold}>{event?.eventName || 'Event Summary'}</div>
          {(event?.brideName || event?.groomName) && (
            <div style={{ fontSize: '10px', color: '#000', fontWeight: 'bold', marginTop: '2px' }}>
              {[event.brideName, event.groomName].filter(Boolean).join(' & ')}
            </div>
          )}
          {event?.venue && (
            <div style={{ fontSize: '10px', color: '#000', marginTop: '1px' }}>{event.venue}</div>
          )}
          {event?.functionDate && (
            <div style={{ fontSize: '10px', color: '#000', marginTop: '1px' }}>Date: {displayDate}</div>
          )}
        </div>

        <div style={s.divider} />

        {/* ── Summary Details ── */}
        <div style={s.row}>
          <span style={s.label}>Total Guests:</span>
          <span style={s.bold}>{event?.totalEntries || 0}</span>
        </div>
        <div style={s.row}>
          <span style={s.label}>Total Amount:</span>
          <span style={s.bold}>
            {currency} {Number(event?.totalAmount || 0).toLocaleString('en-IN')}
          </span>
        </div>

        <div style={s.divider} />

        {/* ── Print Meta ── */}
        <div style={s.row}>
          <span style={s.label}>Printed On:</span>
          <span>{printedOnStr}</span>
        </div>

        <div style={s.divider} />

        {/* ── Footer ── */}
        <div style={s.footer}>
          <div style={s.bold}>Thank You 💕</div>
          <div style={s.bold}>Powered by Digi Moi </div>
          <div style={s.bold}>Contact us📞:+91 93424 80687</div>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} style={s.page} className="thermal-receipt-root">
      {/* ── Logo ── */}
      <div style={{ ...s.center, marginBottom: '6px' }}>
        <img src="/logo-full.png" alt="Happy Pocket" style={{ width: paperWidth === '80mm' ? '60mm' : '44mm', height: 'auto', margin: '0 auto', display: 'block' }} />
      </div>

      {/* ── Business Header ── */}
      <div style={s.center}>
        <div style={s.bold}>Moi Contribution Receipt💗</div>
      </div>

      <div style={s.divider} />

      {/* ── Event Info ── */}
      <div style={s.center}>
        <div style={s.bold}>{event?.eventName || 'Event'}</div>
        {(event?.brideName || event?.groomName) && (
          <div style={{ fontSize: '10px', color: '#000', fontWeight: 'bold' }}>
            {[event.brideName, event.groomName].filter(Boolean).join(' & ')}
          </div>
        )}
        {event?.venue && (
          <div style={{ fontSize: '10px', color: '#000' }}>{event.venue}</div>
        )}
      </div>

      <div style={s.divider} />

      {/* ── Receipt Meta ── */}
      <div style={s.row}>
        <span style={s.label}>Receipt No:</span>
        <span style={s.bold}>{prefix}{entry?.receiptNumber || '001'}</span>
      </div>
      <div style={s.row}>
        <span style={s.label}>Date:</span>
        <span>{receiptDate}</span>
      </div>
      <div style={s.row}>
        <span style={s.label}>Time:</span>
        <span>{receiptTime}</span>
      </div>

      <div style={s.divider} />

      {/* ── Guest Info ── */}
      <div style={s.row}>
        <span style={s.label}>Guest Name:</span>
        <span style={s.bold}>{entry?.name || '—'}</span>
      </div>
      <div style={s.row}>
        <span style={s.label}>Payment Method:</span>
        <span>{entry?.paymentMethod || 'Cash'}</span>
      </div>

      <div style={s.divider} />

      {/* ── Amount ── */}
      <div style={{ ...s.center, margin: '8px 0' }}>
        <div style={{ fontSize: '11px', color: '#000', fontWeight: 'bold' }}>AMOUNT CONTRIBUTED💝</div>
        <div style={s.large}>
          {currency} {Number(entry?.amount || 0).toLocaleString('en-IN')}
        </div>
      </div>

      <div style={s.divider} />

      {/* ── Footer ── */}
      <div style={s.footer}>
        <div>Thank you for your blessings!💕</div>
        <div style={{ marginTop: '4px', fontWeight: 'bold' }}>Powered by Digi Moi</div>
        <div style={s.bold}> Contact us📞:+91 93424 80687</div>
      </div>
    </div>
  );
});

ThermalReceipt.displayName = 'ThermalReceipt';
export default ThermalReceipt;
