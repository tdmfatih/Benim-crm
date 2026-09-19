import React from 'react';
import { storage } from '../../services/storageService';

export interface BrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  variant?: 'card' | 'horizontal' | 'icon' | 'badge' | 'white' | 'dark';
  showSubtitle?: boolean;
  className?: string;
  customLogoUrl?: string;
  onClick?: () => void;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  variant = 'horizontal',
  showSubtitle = true,
  className = '',
  customLogoUrl,
  onClick,
}) => {
  const settings = storage.getSettings();
  const effectiveLogoUrl = customLogoUrl || settings.logoUrl;

  // Özel yüklenmiş şirket logosu varsa onu göster
  if (effectiveLogoUrl) {
    const imgHeightClass = {
      xs: 'h-6',
      sm: 'h-8',
      md: 'h-10',
      lg: 'h-12',
      xl: 'h-16',
      '2xl': 'h-20',
    }[size];

    return (
      <div 
        onClick={onClick}
        className={`inline-flex items-center gap-2 select-none ${className} ${onClick ? 'cursor-pointer' : ''}`}
        title={settings.companyName || '3AS TEKNOLOJİ'}
      >
        <img 
          src={effectiveLogoUrl} 
          alt={settings.companyName || 'Şirket Logosu'} 
          className={`${imgHeightClass} w-auto max-w-[180px] object-contain rounded-md`}
          onError={(e) => {
            // Eğer resim yüklenemezse varsayılan fallback
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        {showSubtitle && variant === 'horizontal' && (
          <div className="flex flex-col justify-center leading-none">
            <span className="font-extrabold text-sm text-slate-900 tracking-tight">
              {settings.companyName || '3AS TEKNOLOJİ'}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mt-0.5">
              {settings.slogan ? settings.slogan.slice(0, 24) : 'KURUMSAL SİSTEM'}
            </span>
          </div>
        )}
      </div>
    );
  }

  // If variant is "card" (matching the exact uploaded 1:1 image "3AS TEKNOLOJİ Karar10.jpg")
  if (variant === 'card') {
    const cardDimensions = {
      xs: 'w-12 h-12 rounded-lg',
      sm: 'w-20 h-20 rounded-xl',
      md: 'w-32 h-32 rounded-2xl shadow-md',
      lg: 'w-48 h-48 rounded-3xl shadow-lg',
      xl: 'w-64 h-64 rounded-3xl shadow-xl',
      '2xl': 'w-80 h-80 rounded-3xl shadow-2xl',
    }[size];

    return (
      <div 
        onClick={onClick}
        className={`bg-[#2853a8] flex flex-col items-center justify-center p-3 select-none text-white relative overflow-hidden transition-all duration-200 ${cardDimensions} ${className}`}
        style={{ backgroundColor: '#2853a8' }}
        title="3AS TEKNOLOJİ"
      >
        <svg
          viewBox="0 0 310 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto max-h-[85%] drop-shadow-xs"
        >
          {/* GLYPH 3 */}
          <path
            d="M 0 0 L 88 0 L 88 18 L 32 18 L 56 36 L 88 36 L 88 74 L 0 74 L 0 56 L 56 56 L 34 36 L 0 36 Z"
            fill="#FFFFFF"
          />

          {/* GLYPH A / Modern Arch with diagonal cut */}
          <path
            d="M 98 74 C 98 42 108 0 148 0 L 178 0 L 192 74 L 168 74 L 164 54 L 126 54 L 122 74 Z 
               M 132 38 L 158 38 L 150 16 C 144 16 138 22 132 38 Z"
            fill="#FFFFFF"
          />

          {/* GLYPH S with aerodynamic rounded curves */}
          <path
            d="M 206 18 C 206 6 220 0 248 0 L 298 0 L 298 18 L 246 18 C 236 18 232 21 232 26 C 232 32 238 34 252 36 L 274 38 C 294 41 306 48 306 58 C 306 70 292 74 266 74 L 204 74 L 204 56 L 264 56 C 274 56 278 53 278 48 C 278 43 272 41 258 39 L 236 36 C 214 33 206 27 206 18 Z"
            fill="#FFFFFF"
          />

          {/* Subtitle: T E K N O L O J İ */}
          <text
            x="153"
            y="104"
            fill="#FFFFFF"
            fontFamily="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
            fontSize="15.5"
            fontWeight="700"
            letterSpacing="0.48em"
            textAnchor="middle"
          >
            TEKNOLOJİ
          </text>
        </svg>
      </div>
    );
  }

  // If variant is icon only
  if (variant === 'icon') {
    const iconSizes = {
      xs: 'w-6 h-6 rounded-md',
      sm: 'w-8 h-8 rounded-lg',
      md: 'w-10 h-10 rounded-xl',
      lg: 'w-12 h-12 rounded-xl',
      xl: 'w-16 h-16 rounded-2xl',
      '2xl': 'w-20 h-20 rounded-2xl',
    }[size];

    return (
      <div 
        onClick={onClick}
        className={`bg-[#2853a8] flex items-center justify-center p-1.5 select-none text-white shadow-xs ${iconSizes} ${className}`}
        style={{ backgroundColor: '#2853a8' }}
        title="3AS TEKNOLOJİ"
      >
        <svg
          viewBox="0 0 310 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto"
        >
          <path
            d="M 0 0 L 88 0 L 88 18 L 32 18 L 56 36 L 88 36 L 88 74 L 0 74 L 0 56 L 56 56 L 34 36 L 0 36 Z"
            fill="#FFFFFF"
          />
          <path
            d="M 98 74 C 98 42 108 0 148 0 L 178 0 L 192 74 L 168 74 L 164 54 L 126 54 L 122 74 Z 
               M 132 38 L 158 38 L 150 16 C 144 16 138 22 132 38 Z"
            fill="#FFFFFF"
          />
          <path
            d="M 206 18 C 206 6 220 0 248 0 L 298 0 L 298 18 L 246 18 C 236 18 232 21 232 26 C 232 32 238 34 252 36 L 274 38 C 294 41 306 48 306 58 C 306 70 292 74 266 74 L 204 74 L 204 56 L 264 56 C 274 56 278 53 278 48 C 278 43 272 41 258 39 L 236 36 C 214 33 206 27 206 18 Z"
            fill="#FFFFFF"
          />
        </svg>
      </div>
    );
  }

  // Horizontal / Default variant (badge icon + typography)
  const isDarkTheme = variant === 'dark';
  const badgeSizes = {
    xs: 'w-7 h-7 rounded-md p-1',
    sm: 'w-8 h-8 rounded-lg p-1.5',
    md: 'w-10 h-10 rounded-xl p-2',
    lg: 'w-12 h-12 rounded-xl p-2.5',
    xl: 'w-16 h-16 rounded-2xl p-3',
    '2xl': 'w-20 h-20 rounded-2xl p-4',
  }[size];

  const titleSizes = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
  }[size];

  const subSizes = {
    xs: 'text-[8px] tracking-[0.25em]',
    sm: 'text-[9px] tracking-[0.3em]',
    md: 'text-[10px] tracking-[0.35em]',
    lg: 'text-[11px] tracking-[0.4em]',
    xl: 'text-[12px] tracking-[0.45em]',
    '2xl': 'text-[14px] tracking-[0.5em]',
  }[size];

  return (
    <div 
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 select-none ${className} ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* 3AS Royal Blue Emblem Badge (matching the Karar10 photo) */}
      <div 
        className={`bg-[#2853a8] flex items-center justify-center shrink-0 shadow-md border border-blue-400/30 ${badgeSizes}`}
        style={{ backgroundColor: '#2853a8' }}
      >
        <svg
          viewBox="0 0 310 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto drop-shadow-xs"
        >
          <path
            d="M 0 0 L 88 0 L 88 18 L 32 18 L 56 36 L 88 36 L 88 74 L 0 74 L 0 56 L 56 56 L 34 36 L 0 36 Z"
            fill="#FFFFFF"
          />
          <path
            d="M 98 74 C 98 42 108 0 148 0 L 178 0 L 192 74 L 168 74 L 164 54 L 126 54 L 122 74 Z 
               M 132 38 L 158 38 L 150 16 C 144 16 138 22 132 38 Z"
            fill="#FFFFFF"
          />
          <path
            d="M 206 18 C 206 6 220 0 248 0 L 298 0 L 298 18 L 246 18 C 236 18 232 21 232 26 C 232 32 238 34 252 36 L 274 38 C 294 41 306 48 306 58 C 306 70 292 74 266 74 L 204 74 L 204 56 L 264 56 C 274 56 278 53 278 48 C 278 43 272 41 258 39 L 236 36 C 214 33 206 27 206 18 Z"
            fill="#FFFFFF"
          />
        </svg>
      </div>

      {/* Brand Text */}
      <div className="flex flex-col justify-center leading-none">
        <div className="flex items-center gap-1.5">
          <span className={`font-extrabold tracking-tight ${isDarkTheme ? 'text-white' : 'text-slate-900'} ${titleSizes}`}>
            <span className={isDarkTheme ? 'text-blue-400' : 'text-[#2853a8]'}>3AS</span> TEKNOLOJİ
          </span>
        </div>
        {showSubtitle && (
          <span className={`font-bold uppercase mt-0.5 ${isDarkTheme ? 'text-blue-200/80' : 'text-slate-500'} ${subSizes}`}>
            TEKNOLOJİ
          </span>
        )}
      </div>
    </div>
  );
};
