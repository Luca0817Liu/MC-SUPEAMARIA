/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, Flame, Pause, Play } from 'lucide-react';

interface ControlsProps {
  onPress: (key: 'left' | 'right' | 'up' | 'fire', pressed: boolean) => void;
  onPauseToggle: () => void;
  marioForm: string;
}

export default function Controls({ onPress, onPauseToggle, marioForm }: ControlsProps) {
  const handleTouchStart = (key: 'left' | 'right' | 'up' | 'fire', e: React.TouchEvent) => {
    e.preventDefault();
    onPress(key, true);
  };

  const handleTouchEnd = (key: 'left' | 'right' | 'up' | 'fire', e: React.TouchEvent) => {
    e.preventDefault();
    onPress(key, false);
  };

  return (
    <div className="absolute inset-x-0 bottom-6 z-30 flex justify-between items-end px-6 pointer-events-none md:hidden">
      
      {/* Left side: Arrow keys D-PAD designed after the Vibrant Palette style spec */}
      <div className="flex gap-4 pointer-events-auto select-none">
        {/* LEFT BUTTON */}
        <button
          id="touch_left_btn"
          onTouchStart={(e) => handleTouchStart('left', e)}
          onTouchEnd={(e) => handleTouchEnd('left', e)}
          className="w-16 h-16 bg-[#3d3d3d]/50 text-white border-4 border-white/30 flex items-center justify-center shadow-[4px_4px_0px_rgba(0,0,0,0.4)] active:translate-y-0.5 active:translate-x-0.5 rounded-none active:bg-white/10 transition-colors cursor-pointer touch-none"
        >
          <span className="text-3xl font-bold">←</span>
        </button>

        {/* RIGHT BUTTON */}
        <button
          id="touch_right_btn"
          onTouchStart={(e) => handleTouchStart('right', e)}
          onTouchEnd={(e) => handleTouchEnd('right', e)}
          className="w-16 h-16 bg-[#3d3d3d]/50 text-white border-4 border-white/30 flex items-center justify-center shadow-[4px_4px_0px_rgba(0,0,0,0.4)] active:translate-y-0.5 active:translate-x-0.5 rounded-none active:bg-white/10 transition-colors cursor-pointer touch-none"
        >
          <span className="text-3xl font-bold">→</span>
        </button>
      </div>

      {/* Floating center Pause helper on mobile with translucent backplates */}
      <div className="pointer-events-auto select-none">
        <button
          id="touch_pause_btn"
          onClick={onPauseToggle}
          className="w-12 h-12 bg-[#3d3d3d]/60 text-white border-2 border-white/40 flex items-center justify-center shadow-[2px_2px_0px_rgba(0,0,0,0.3)] active:translate-y-0.5 rounded-none active:bg-white/20 mb-2 transition-transform cursor-pointer"
        >
          <Pause className="w-5 h-5 pointer-events-none" />
        </button>
      </div>

      {/* Right side: Action keys matching the red/white custom buttons */}
      <div className="flex flex-col items-center gap-3 pointer-events-auto select-none">
        
        <div className="flex gap-4 items-end">
          {/* FIRE BUTTON - formatted similar to the red FIRE key in the design */}
          <button
            id="touch_fire_btn"
            onTouchStart={(e) => handleTouchStart('fire', e)}
            onTouchEnd={(e) => handleTouchEnd('fire', e)}
            className={`w-16 h-16 border-4 flex items-center justify-center shadow-[4px_4px_0px_rgba(0,0,0,0.4)] active:translate-y-0.5 active:translate-x-0.5 rounded-none transition-colors cursor-pointer touch-none ${
              marioForm === 'FIRE'
                ? 'bg-[#ff0000]/70 text-white border-white'
                : 'bg-[#ff0000]/30 text-white/50 border-white/20'
            }`}
          >
            <span className="font-bold text-xs tracking-wider">FIRE</span>
          </button>

          {/* JUMP BUTTON - larger size matching the design spec's w-24 h-24 */}
          <button
            id="touch_jump_btn"
            onTouchStart={(e) => handleTouchStart('up', e)}
            onTouchEnd={(e) => handleTouchEnd('up', e)}
            className="w-24 h-24 bg-white/30 text-white border-4 border-white/50 flex flex-col items-center justify-center shadow-[4px_4px_0px_rgba(0,0,0,0.4)] active:translate-y-0.5 active:translate-x-0.5 rounded-none active:bg-white/40 transition-colors cursor-pointer touch-none mb-3"
          >
            <span className="font-bold text-sm tracking-wider">JUMP</span>
          </button>
        </div>

        {/* HUD text helper */}
        <span className="text-[9px] font-retro text-white/80 bg-[#3d3d3d]/80 border border-white/10 px-2 py-0.5">
          {marioForm === 'FIRE' ? 'A = JUMP | B = FIRE' : 'A_TAP = JUMP / DOUBLEJUMP'}
        </span>
      </div>
    </div>
  );
}
