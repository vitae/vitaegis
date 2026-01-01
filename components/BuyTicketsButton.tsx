'use client';

import React from 'react';

export default function BuyTicketsButton() {
  const handleClick = async () => {
    // call your Stripe checkout route
    const res = await fetch('/api/checkout', { method: 'POST' });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  };

  return (
    <button
      onClick={handleClick}
      className="rounded-xl border border-red-500/40 px-6 py-3 text-red-400 hover:bg-red-500/10 transition"
    >
      Buy Tickets!
    </button>
  );
}
