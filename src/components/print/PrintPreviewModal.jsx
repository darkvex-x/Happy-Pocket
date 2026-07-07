import React, { useRef, useState, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import ThermalReceipt from './ThermalReceipt';
import { StorageService } from '../../services/storage';
import { Printer, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * PrintPreviewModal
 * Opens a print preview for a single entry receipt.
 * Props:
 *   isOpen: bool
 *   onClose: () => void
 *   entry: Entry object
 *   event: Event object
 */
export default function PrintPreviewModal({ isOpen, onClose, entry, event }) {
  const printRef = useRef(null);
  const [paperWidth, setPaperWidth] = useState('58mm');
  const [settings, setSettings] = useState(null);
  const [zoom, setZoom] = useState(2.5); // Start zoomed in for tiny receipt preview

  useEffect(() => {
    StorageService.getSettings().then(s => {
      setSettings(s);
      if (s?.paperWidth) setPaperWidth(s.paperWidth);
    });
  }, []);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Receipt-${entry?.receiptNumber || 'MR'}`,
    pageStyle: `
      @page {
        size: ${paperWidth} auto;
        margin: 0;
      }
      @media print {
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: #fff !important;
        }
        body * {
          visibility: hidden !important;
        }
        .thermal-receipt-root, .thermal-receipt-root * {
          visibility: visible !important;
        }
        .thermal-receipt-root {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: ${paperWidth} !important;
        }
      }
    `,
  });

  const SIZE_OPTIONS = ['58mm', '80mm'];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Print Receipt Preview" size="md">
      <div className="flex flex-col gap-4">

        {/* ── Controls (sticky top toolbar) ── */}
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
          
          {/* Paper width toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Paper</span>
            <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              {SIZE_OPTIONS.map(size => (
                <button
                  key={size}
                  onClick={() => setPaperWidth(size)}
                  className={cn(
                    'px-3 py-1.5 text-sm font-mono font-semibold transition-colors',
                    paperWidth === size
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Zoom</span>
            <button
              onClick={() => setZoom(z => Math.max(1, z - 0.5))}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition"
            ><ZoomOut size={16} /></button>
            <span className="text-sm font-mono w-12 text-center text-gray-700 dark:text-gray-300">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(z => Math.min(5, z + 0.5))}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition"
            ><ZoomIn size={16} /></button>
          </div>
        </div>

        {/* ── Preview Window ── */}
        <div className="flex justify-center items-start bg-gray-200 dark:bg-gray-900 rounded-xl p-6 overflow-auto min-h-48 max-h-[50vh]">
          <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', display: 'inline-block' }}>
            <div className="shadow-2xl rounded-sm overflow-hidden bg-white">
              <ThermalReceipt
                ref={printRef}
                entry={entry}
                event={event}
                settings={settings}
                paperWidth={paperWidth}
              />
            </div>
          </div>
        </div>

        {/* ── Action Bar ── */}
        <div className="flex justify-end items-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button variant="primary" onClick={handlePrint} className="shadow-md shadow-indigo-500/20 min-w-36">
            <Printer size={18} className="mr-2" />
            Print Receipt
          </Button>
        </div>

      </div>
    </Modal>
  );
}
