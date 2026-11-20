import React from 'react';
import { ResidentRole } from '../types/simulation';

interface ResidentAvatarProps {
  name: string;
  role: ResidentRole;
  color: string;
  size?: number;
}

export const ResidentAvatar: React.FC<ResidentAvatarProps> = ({
  name,
  role,
  color,
  size = 44,
}) => {
  const initial = name.charAt(0).toUpperCase();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className="shrink-0 rounded-lg border border-[#263B30] bg-[#101B17]"
      aria-label={`${name} (${role})`}
    >
      <circle cx="24" cy="24" r="20" fill={color} fillOpacity="0.16" />
      {/* Stylized explorer/settler shoulder & head silhouette */}
      <path
        d="M12 40 C12 31, 36 31, 36 40"
        fill={color}
        fillOpacity="0.85"
      />
      <circle cx="24" cy="20" r="7.5" fill="#E7E9D8" />
      {role === 'Forager' && (
        <path d="M15 17 Q24 10 33 17" stroke={color} strokeWidth="3" fill="none" />
      )}
      {role === 'Builder' && (
        <path d="M15 16 L33 16 L30 11 L18 11 Z" fill={color} />
      )}
      {role === 'Gatherer' && (
        <circle cx="30" cy="14" r="3" fill={color} />
      )}
      {role === 'Explorer' && (
        <path d="M13 16 L35 16 L24 10 Z" fill={color} />
      )}
      <text
        x="24"
        y="38.5"
        textAnchor="middle"
        className="fill-[#101B17] text-[9px] font-bold font-mono"
      >
        {initial}
      </text>
    </svg>
  );
};
