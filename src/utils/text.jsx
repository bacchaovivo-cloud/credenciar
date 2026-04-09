import React from 'react';

export const HighlightedText = ({ text, highlight }) => {
  if (!highlight || !highlight.trim()) return <span>{text}</span>;
  const regex = new RegExp(`(${highlight})`, 'gi');
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-500/40 text-slate-900 dark:text-white rounded-sm px-0.5">
            {part}
          </mark>
        ) : part
      )}
    </span>
  );
};

export const normalizar = (str) => (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
