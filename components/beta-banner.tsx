'use client';

import { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';

export default function BetaBanner() {
  return (
    <div className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white text-[11px] sm:text-xs py-1.5 px-3 z-30 border-b border-blue-500/30 shrink-0">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="inline-flex items-center gap-1 bg-amber-400 text-amber-950 text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 shadow-2xs">
            <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-amber-950" /> BETA
          </span>

          <p className="truncate font-medium text-[10px] sm:text-xs">
            <span className="hidden xs:inline">Hệ thống đang thử nghiệm. </span>
            <span>Rất mong nhận được đóng góp ý kiến!</span>
          </p>
        </div>
      </div>
    </div>
  );
}