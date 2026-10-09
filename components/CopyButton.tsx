'use client';

import { useState } from 'react';

export default function CopyButton({
  value,
  label = 'Copy',
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked: the address is still visible to select by hand */
    }
  }

  return (
    <button type="button" onClick={copy} className={className} aria-live="polite">
      {copied ? 'Copied ✓' : label}
    </button>
  );
}
