/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, RotateCcw, Home } from 'lucide-react';
import { audio } from '../utils/audio';

interface PauseMenuProps {
  onResume: () => void;
  onRestart: () => void;
  onHome: () => void;
}

export default function PauseMenu({ onResume, onRestart, onHome }: PauseMenuProps) {
  const triggerAction = (action: () => void) => {
    audio.playSFX('STOMP');
    action();
  };

  return (
    <div className="absolute inset-0 z-40 bg-[#7299ff]/75 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="w-full max-w-sm bg-[#3d3d3d] border-8 border-white p-6 shadow-[12px_12px_0px_0px_rgba(0,0,0,0.5)] text-center">
        {/* Title */}
        <div className="mb-6">
          <span className="block font-retro text-xl text-[#ffd700] tracking-wider animate-[pulse_1.5s_infinite] drop-shadow-[2px_2px_0px_#000]">
            GAME PAUSED
          </span>
          <span className="block text-[10px] font-retro text-gray-300 mt-1">
            —— 游戏已暂停 ——
          </span>
        </div>

        {/* Info panel */}
        <div className="bg-black/40 p-3 text-left border border-white/20 mb-6 rounded-none">
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-[#ffd700] font-retro text-[9px] font-bold">INFO PANEL</span>
            <span className="text-white font-mono text-[10px]">⌨️ WASD / 📱 Touch</span>
          </div>
          <p className="text-[11px] text-gray-300 font-mono leading-relaxed">
            建议使用键盘方向键控制位移，空格/UP跳跃，空中再次跳跃可触发二段跳，X键可在火焰形态喷射火球。
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          {/* Resume */}
          <button
            onClick={() => triggerAction(onResume)}
            className="w-full py-3 bg-[#4caf50] hover:bg-[#43a047] border-4 border-white text-white font-retro text-xs tracking-wider flex items-center justify-center gap-2 active:translate-y-0.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.4)] cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white text-white" />
            <span>继续游戏 RESUME</span>
          </button>

          {/* Restart */}
          <button
            onClick={() => triggerAction(onRestart)}
            className="w-full py-3 bg-[#ffd700] hover:bg-[#fbc02d] border-4 border-white text-[#3d3d3d] font-retro text-xs tracking-wider flex items-center justify-center gap-2 active:translate-y-0.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.4)] cursor-pointer font-bold"
          >
            <RotateCcw className="w-4 h-4 text-[#3d3d3d] stroke-[3]" />
            <span>重新开始 RESTART</span>
          </button>

          {/* Exit to home */}
          <button
            onClick={() => triggerAction(onHome)}
            className="w-full py-3 bg-[#585860] hover:bg-[#484850] border-4 border-white text-white font-retro text-xs tracking-wider flex items-center justify-center gap-2 active:translate-y-0.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.4)] cursor-pointer"
          >
            <Home className="w-4 h-4 text-white" />
            <span>返回大厅 MENU</span>
          </button>
        </div>

        {/* Graphic border elements */}
        <div className="flex justify-center gap-2.5 mt-6">
          <div className="w-3 h-3 bg-[#4caf50] border border-white/40"></div>
          <div className="w-3 h-3 bg-[#ffd700] border border-white/40"></div>
          <div className="w-3 h-3 bg-[#ff3333] border border-white/40"></div>
        </div>
      </div>
    </div>
  );
}
