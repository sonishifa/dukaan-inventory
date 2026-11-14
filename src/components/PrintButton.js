'use client';

export default function PrintButton() {
  return (
    <button type="button" className="btn btn-quiet no-print" onClick={() => window.print()}>
      Print bill
    </button>
  );
}
