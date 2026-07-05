import React from 'react';
import { DEFAULT_AVATAR } from '@/constants/defaultAvatar';

interface Props {
  src?: string | null;
  name?: string | null;
  className?: string;
  alt?: string;
}

const getInitials = (name?: string | null) => {
  if (!name) return '?';
  const clean = name.trim().replace(/^@/, '');
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const gradientFor = (seed?: string | null) => {
  const palette = [
    'from-pink-500 to-purple-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-sky-500 to-indigo-600',
    'from-rose-500 to-fuchsia-600',
    'from-lime-500 to-green-600',
  ];
  const s = (seed || '?').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return palette[s % palette.length];
};

export const AvatarWithFallback = ({ src, name, className = '', alt }: Props) => {
  const [errored, setErrored] = React.useState(false);
  const hasImage = !!src && src !== DEFAULT_AVATAR && !errored;

  if (hasImage) {
    return (
      <img
        src={src!}
        alt={alt || name || 'avatar'}
        className={`object-cover ${className}`}
        onError={() => setErrored(true)}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br ${gradientFor(name)} text-white font-bold ${className}`}
      aria-label={alt || name || 'avatar'}
    >
      <span className="select-none" style={{ fontSize: '42%' }}>
        {getInitials(name)}
      </span>
    </div>
  );
};
