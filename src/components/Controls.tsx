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
  const handlePointerDown = (key: 'left' | 'right' | 'up' | 'fire', e: React.PointerEvent) => {
    if (e.cancelable) {
      e.preventDefault();
    }
    onPress(key, true);
  };

  const handlePointerUp = (key: 'left' | 'right' | 'up' | 'fire', e: React.PointerEvent) => {
    if (e.cancelable) {
      e.preventDefault();
    }
    onPress(key, false);
  };

  return (
    <div className="absolute inset-x-0 bottom-2 sm:bottom-6 z-30 max-w-4xl mx-auto flex justify-between items-end px-3 sm:px-6 pointer-events-none">
      
      {/* Left side: Arrow keys D-PAD designed after the Vibrant Palette style spec */}
      <div className="flex gap-2.5 sm:gap-4 pointer-events-auto select-none">
        {/* LEFT BUTTON */}
        <button
          id="touch_left_btn"
          onPointerDown={(e) => handlePointerDown('left', e)}
          onPointerUp={(e) => handlePointerUp('left', e)}
          onPointerCancel={(e) => handlePointerUp('left', e)}
          onPointerLeave={(e) => handlePointerUp('left', e)}
          className="w-14 h-14 sm:w-16 sm:h-16 bg-[#3d3d3d]/50 text-white border-2 sm:border-4 border-white/30 flex items-center justify-center shadow-[2px_2px_0px_rgba(0,0,0,0.4)] sm:shadow-[4px_4px_0px_rgba(0,0,0,0.4)] active:translate-y-0.5 active:translate-x-0.5 rounded-none active:bg-white/10 transition-colors cursor-pointer touch-none select-none"
        >
          <span className="text-2xl sm:text-3xl font-bold">←</span>
        </button>

        {/* RIGHT BUTTON */}
        <button
          id="touch_right_btn"
          onPointerDown={(e) => handlePointerDown('right', e)}
          onPointerUp={(e) => handlePointerUp('right', e)}
          onPointerCancel={(e) => handlePointerUp('right', e)}
          onPointerLeave={(e) => handlePointerUp('right', e)}
          className="w-14 h-14 sm:w-16 sm:h-16 bg-[#3d3d3d]/50 text-white border-2 sm:border-4 border-white/30 flex items-center justify-center shadow-[2px_2px_0px_rgba(0,0,0,0.4)] sm:shadow-[4px_4px_0px_rgba(0,0,0,0.4)] active:translate-y-0.5 active:translate-x-0.5 rounded-none active:bg-white/10 transition-colors cursor-pointer touch-none select-none"
        >
          <span className="text-2xl sm:text-3xl font-bold">→</span>
        </button>
      </div>

      {/* Floating center Pause helper on mobile with translucent backplates */}
      <div className="pointer-events-auto select-none mb-1 sm:mb-2">
        <button
          id="touch_pause_btn"
          onClick={onPauseToggle}
          className="w-10 h-10 sm:w-12 sm:h-12 bg-[#3d3d3d]/60 text-white border-2 border-white/40 flex items-center justify-center shadow-[1px_1px_0px_rgba(0,0,0,0.3)] sm:shadow-[2px_2px_0px_rgba(0,0,0,0.3)] active:translate-y-0.5 rounded-none active:bg-white/20 transition-transform cursor-pointer"
        >
          <Pause className="w-4.5 h-4.5 sm:w-5 sm:h-5 pointer-events-none" />
        </button>
      </div>

      {/* Right side: Action keys matching the red/white custom buttons */}
      <div className="flex flex-col items-center gap-2 sm:gap-3 pointer-events-auto select-none">
        
        <div className="flex gap-2.5 sm:gap-4 items-end">
          {/* FIRE BUTTON - formatted similar to the red FIRE key in the design */}
          <button
            id="touch_fire_btn"
            onPointerDown={(e) => handlePointerDown('fire', e)}
            onPointerUp={(e) => handlePointerUp('fire', e)}
            onPointerCancel={(e) => handlePointerUp('fire', e)}
            onPointerLeave={(e) => handlePointerUp('fire', e)}
            className={`w-14 h-14 sm:w-16 sm:h-16 border-2 sm:border-4 flex items-center justify-center shadow-[2px_2px_0px_rgba(0,0,0,0.4)] sm:shadow-[4px_4px_0px_rgba(0,0,0,0.4)] active:translate-y-0.5 active:translate-x-0.5 rounded-none transition-colors cursor-pointer touch-none select-none ${
              marioForm === 'FIRE'
                ? 'bg-[#ff0000]/70 text-white border-white'
                : 'bg-[#ff0000]/35 text-white/50 border-white/20'
            }`}
          >
            <span className="font-bold text-[10px] sm:text-xs tracking-wider">FIRE</span>
          </button>

          {/* JUMP BUTTON - larger size matching the design spec */}
          <button
            id="touch_jump_btn"
            onPointerDown={(e) => handlePointerDown('up', e)}
            onPointerUp={(e) => handlePointerUp('up', e)}
            onPointerCancel={(e) => handlePointerUp('up', e)}
            onPointerLeave={(e) => handlePointerUp('up', e)}
            className="w-20 h-20 sm:w-24 sm:h-24 bg-white/30 text-white border-2 sm:border-4 border-white/50 flex flex-col items-center justify-center shadow-[2px_2px_0px_rgba(0,0,0,0.4)] sm:shadow-[4px_4px_0px_rgba(0,0,0,0.4)] active:translate-y-0.5 active:translate-x-0.5 rounded-none active:bg-white/40 transition-colors cursor-pointer touch-none select-none mb-1 sm:mb-2"
          >
            <span className="font-bold text-xs sm:text-sm tracking-wider">JUMP</span>
          </button>
        </div>

        {/* HUD text helper */}
        <span className="text-[8px] sm:text-[9px] font-retro text-white/80 bg-[#3d3d3d]/85 border border-white/10 px-1.5 sm:px-2 py-0.5">
          {marioForm === 'FIRE' ? 'B = FIRE | A = JUMP' : 'A_TAP = HIGH & DOUBLE JUMP'}
        </span>
      </div>
    </div>
  );
}
