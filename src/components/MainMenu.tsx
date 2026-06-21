/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Volume2, VolumeX, Play, Info, Layers, Compass, Swords, Shield, Heart } from 'lucide-react';
import { StageName } from '../types';
import { audio } from '../utils/audio';

interface MainMenuProps {
  onStartGame: (stage: StageName) => void;
  highscore: number;
  isMuted: boolean;
  onToggleMute: () => void;
}

export default function MainMenu({ onStartGame, highscore, isMuted, onToggleMute }: MainMenuProps) {
  const [selectedStage, setSelectedStage] = useState<StageName>('1-1');
  const [showTutorial, setShowTutorial] = useState(false);

  const stages: { name: StageName; title: string; desc: string; icon: string; bg: string; border: string; label: string }[] = [
    {
      name: '1-1',
      title: '方块草原 (Overworld)',
      desc: '绿草茵茵，僵尸出没。熟悉方块重力与跳跃手感。',
      icon: '🌱',
      bg: 'bg-emerald-950/80',
      border: 'border-emerald-500',
      label: 'Stage 1-1'
    },
    {
      name: '1-2',
      title: '地下矿道 (Underground)',
      desc: '布满圆石与煤炭。小心坚硬的海龟守卫。',
      icon: '⛏️',
      bg: 'bg-slate-900/80',
      border: 'border-slate-500',
      label: 'Stage 1-2'
    },
    {
      name: '1-3',
      title: '空岛浮空城 (The Sky)',
      desc: '极高难度浮空岛链。需要灵活掌握二段跳。',
      icon: '☁️',
      bg: 'bg-sky-950/80',
      border: 'border-sky-400',
      label: 'Stage 1-3'
    },
    {
      name: '1-4',
      title: '下界要塞 (Castle Boss)',
      desc: '熔岩翻滚，苦力怕伏击！决战方块末影龙。',
      icon: '🔥',
      bg: 'bg-red-950/80',
      border: 'border-red-600',
      label: 'Stage 1-4'
    }
  ];

  const handleStart = () => {
    // Play quick sound effect
    audio.playSFX('POWER_UP');
    onStartGame(selectedStage);
  };

  return (
    <div className="relative w-full min-h-screen bg-[#7299ff] flex flex-col items-center justify-center p-4 overflow-hidden font-sans border-8 border-[#3d3d3d]">
      {/* The sky decorations from the Vibrant Palette design */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Dynamic retro pixelated clouds from the design blueprint */}
        <div className="absolute top-16 left-12 w-32 h-10 bg-white/80 shadow-[12px_0_0_0_#fff,24px_0_0_0_#fff,0_12px_0_0_#fff,12px_12px_0_0_#fff] opacity-90"></div>
        <div className="absolute top-44 right-20 w-48 h-14 bg-white/80 shadow-[16px_0_0_0_#fff,32px_0_0_0_#fff,16px_16px_0_0_#fff] opacity-90 hidden sm:block"></div>
        <div className="absolute bottom-32 left-1/3 w-28 h-8 bg-white/40 shadow-[12px_0_0_0_rgba(255,255,255,0.4),0_12px_0_0_rgba(255,255,255,0.4)] opacity-50"></div>
        
        {/* Floating golden sparkling coins */}
        <div className="absolute top-24 right-1/4 w-4 h-4 bg-[#ffd700] border-2 border-[#b8860b] shadow-[inset_-2px_-2px_0_#daa520] animate-bounce"></div>
        <div className="absolute bottom-48 left-20 w-4 h-4 bg-[#ffd700] border-2 border-[#b8860b] shadow-[inset_-2px_-2px_0_#daa520] animate-[bounce_3s_infinite]"></div>
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-4xl bg-[#3d3d3d]/95 border-4 border-white/80 p-6 sm:p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,0.5)] flex flex-col items-center">
        
        {/* Top bar with highscore and audio toggle */}
        <div className="w-full flex justify-between items-center mb-6 border-b-4 border-white/20 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-[#f1f5f9] font-retro text-[10px] sm:text-xs tracking-wider">HIGHSCORE:</span>
            <span className="text-[#ffd700] font-retro text-[12px] sm:text-sm drop-shadow-[2px_2px_0px_rgba(0,0,0,0.5)]">{highscore.toString().padStart(6, '0')}</span>
          </div>

          <div className="flex gap-2">
            <button
              id="tutorial_btn"
              onClick={() => { audio.playSFX('COIN'); setShowTutorial(!showTutorial); }}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border-2 border-white/50 text-xs font-bold text-white flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] active:translate-y-0.5 transition-all cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{showTutorial ? "返回" : "玩前必看"}</span>
            </button>
            <button
              id="mute_btn"
              onClick={onToggleMute}
              className={`p-1.5 border-2 border-white/50 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] active:translate-y-0.5 cursor-pointer ${
                isMuted ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'
              } text-white`}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Title Logo section with Super Mario Font Styled text and MC blocks */}
        <div className="flex flex-col items-center justify-center text-center mb-8 relative">
          {/* Blocky Super Title */}
          <div className="relative animate-[bounce_4s_infinite]">
            <span className="block font-retro text-3xl sm:text-5xl text-[#ff3333] tracking-tight drop-shadow-[4px_4px_0px_#000]">
              MINECRAFT
            </span>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="font-retro text-2xl sm:text-4xl text-[#ffd700] drop-shadow-[4px_4px_0px_#000] tracking-wide">
                SUPER MARIO
              </span>
            </div>
            {/* Minecraft Cube Badge */}
            <span className="mt-3 inline-block px-4 py-1.5 bg-[#4caf50] text-[10px] font-retro text-white border-2 border-white/30 shadow-[4px_4px_0px_rgba(0,0,0,0.3)]">
              VIBRANT RETRO EDITION
            </span>
          </div>
        </div>

        {showTutorial ? (
          /* Tutorial Pane */
          <div className="w-full max-w-2xl bg-[#14151a] border-4 border-[#31323a] p-5 mb-6 text-sm text-gray-300">
            <h3 className="font-retro text-sm text-[#f3ad2e] mb-4 text-center border-b-2 border-[#31323a] pb-2">【操作指令】 Controls</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-[#1c1d24] p-3 border-2 border-slate-700">
                <span className="font-bold text-[#e2e8f0] block mb-2 font-retro text-[10px] text-green-400">⌨️ 电脑键盘</span>
                <ul className="space-y-1.5 text-xs">
                  <li><strong className="text-white">← / → 方向键</strong> : 左右移动/顺滑惯性</li>
                  <li><strong className="text-white">↑ / 空格键</strong> : 强力跳跃 (空中可二段跳)</li>
                  <li><strong className="text-white">X 键 / 触屏B</strong> : 抛射火球 (变身喷火状态)</li>
                  <li><strong className="text-white">P 键</strong> : 暂停游戏并查看状态</li>
                </ul>
              </div>

              <div className="bg-[#1c1d24] p-3 border-2 border-slate-700">
                <span className="font-bold text-[#e2e8f0] block mb-2 font-retro text-[10px] text-cyan-400">📱 手机触屏</span>
                <p className="text-xs text-gray-400">
                  底部自带高级虚拟摇杆和功能按键，完美适配各种主流屏幕。支持在空中点击跳跃瞬间进行二段跳。
                </p>
              </div>
            </div>

            <h3 className="font-retro text-sm text-[#f3ad2e] mb-2 text-center border-b-2 border-[#31323a] pb-2 mt-4">【特色机制】 MC Elements</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-[11px]">
              <div className="bg-[#241a1a] p-2 border border-red-950">
                <span className="text-xl block">🍄</span>
                <span className="font-bold text-white block">红色方块菇</span>
                <span className="text-gray-400">体型变大增加一格血</span>
              </div>
              <div className="bg-[#1d1f14] p-2 border border-yellow-950">
                <span className="text-xl block">⭐</span>
                <span className="font-bold text-white block">下界之星</span>
                <span className="text-gray-400">短暂无敌冲刺与反伤</span>
              </div>
              <div className="bg-[#152324] p-2 border border-cyan-950">
                <span className="text-xl block">🌹</span>
                <span className="font-bold text-white block">凋零/火焰玫瑰</span>
                <span className="text-gray-400">长出火球发射能力</span>
              </div>
              <div className="bg-[#142319] p-2 border border-emerald-950">
                <span className="text-xl block">🦖</span>
                <span className="font-bold text-white block">末影神龙</span>
                <span className="text-gray-400">4关镇守 吐息大红火球</span>
              </div>
            </div>

            <h3 className="font-retro text-[10px] text-[#ffd700] mb-2 mt-4 text-center border-b border-[#31323a] pb-2">【全新系统】 弹幕秘籍与调速面板 TIPS MARQUEE TICKER</h3>
            <p className="text-xs text-gray-300 leading-relaxed text-center">
              游戏结束后在重试卡片上方加载了<strong>「方块冒险秘籍轮播栏」</strong>。为了解决字符流动过快无法看清的问题，专设 <strong>[ || ] (暂停) / [ S ] (慢速) / [ M ] (正常) / [ F ] (快速)</strong> 四档触感调速按钮，您可以随心控制弹幕速度，随时细嚼慢品硬核生存攻略，助您挑战新高分！
            </p>
          </div>
        ) : (
          /* Normal Layout: Stage Selector & Play */
          <div className="w-full flex flex-col items-center">
            
            {/* Level Selector Title */}
            <div className="w-full text-center mb-3">
              <span className="font-retro text-xs text-gray-400">选择关卡 SELECT WORLD STAGE</span>
            </div>

            {/* Stages Grid */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {stages.map((stg) => {
                const isSelected = selectedStage === stg.name;
                return (
                  <button
                    key={stg.name}
                    id={`stage_btn_${stg.name}`}
                    onClick={() => { audio.playSFX('STOMP'); setSelectedStage(stg.name); }}
                    className={`relative text-left p-3 border-4 flex items-center gap-3 transition-all cursor-pointer ${stg.bg} ${
                      isSelected
                        ? `${stg.border} scale-[1.02] shadow-[4px_4px_0px_0px_#111] translate-y-[-2px]`
                        : 'border-[#2d2e38] opacity-60 hover:opacity-90'
                    }`}
                  >
                    {/* Badge */}
                    <div className="w-12 h-12 flex items-center justify-center bg-black/40 text-2xl border-2 border-white/10 shrink-0">
                      {stg.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-retro text-[#f3ad2e]">{stg.label}</span>
                        {isSelected && <span className="animate-[pulse_1s_infinite] text-xs text-green-400">▶ READY</span>}
                      </div>
                      <span className="block font-bold text-sm text-white truncate mt-0.5">{stg.title}</span>
                      <span className="block text-[11px] text-gray-400 truncate mt-0.5">{stg.desc}</span>
                    </div>

                    {/* Corner overlay for Minecraft feel */}
                    <div className="absolute top-0 right-0 w-2 h-2 bg-black/20"></div>
                  </button>
                );
              })}
            </div>

            {/* Huge Play Button */}
            <button
              id="start_game_btn"
              onClick={handleStart}
              className="w-full max-w-sm py-4 bg-[#22c55e] hover:bg-[#1fb353] border-b-8 border-r-8 border-[#15803d]/90 hover:border-[#166534] text-white font-retro text-sm tracking-widest shadow-[4px_4px_0px_0px_#111] flex items-center justify-center gap-3 transition-transform active:translate-y-1 active:translate-x-1 active:border-b-4 active:border-r-4 hover:scale-[1.03] cursor-pointer"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>进入世界 PLAY GAME</span>
            </button>
          </div>
        )}

        {/* Footer info */}
        <div className="w-full mt-6 pt-4 border-t-2 border-[#333543] text-center text-gray-500 text-[10px] flex justify-center items-center gap-4">
          <span>🎮 WebGL-Canvas 2D Engine</span>
          <span>⛏️ Minecraft Cube Art Design</span>
          <span>🍄 Super Mario Classic System</span>
        </div>
      </div>
    </div>
  );
}
