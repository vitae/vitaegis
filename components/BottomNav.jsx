'use client';

import { useState } from 'react';

const navItems = [
  {
    id: 'home',
    label: 'Home',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    id: 'explore',
    label: 'Explore',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
      </svg>
    ),
  },
  {
    id: 'search',
    label: 'Search',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const [activeItem, setActiveItem] = useState('home');

  return (
    <nav
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4"
      aria-label="Bottom navigation"
    >
      <div className="glass rounded-full shadow-2xl px-4">
        <div className="flex">
          {navItems.map((item) => {
            const isActive = activeItem === item.id;
            return (
              <div key={item.id} className="flex-auto group hover:flex-grow">
                <button
                  onClick={() => setActiveItem(item.id)}
                  className="flex items-center justify-center text-center mx-auto px-4 py-3 w-full group-hover:w-full transition-all duration-300"
                  style={{
                    color: isActive ? '#00FF00' : 'rgba(255, 255, 255, 0.6)',
                  }}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span
                    className="flex items-center px-2 py-2 rounded-full transition-all duration-300"
                    style={{
                      backgroundColor: isActive
                        ? 'rgba(0, 255, 0, 0.1)'
                        : 'transparent',
                      boxShadow: isActive
                        ? '0 0 15px rgba(0, 255, 0, 0.3)'
                        : 'none',
                    }}
                  >
                    <span className="block transition-transform duration-300 group-hover:scale-110">
                      {item.icon}
                    </span>
                    <span
                      className="hidden group-hover:inline-block ml-3 text-sm font-medium whitespace-nowrap transition-all duration-300"
                      style={{
                        color: isActive ? '#00FF00' : '#FFFFFF',
                        textShadow: isActive
                          ? '0 0 10px rgba(0, 255, 0, 0.8)'
                          : 'none',
                      }}
                    >
                      {item.label}
                    </span>
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
