/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { RotateCcw, Home, Award, ArrowRight, Skull, Trophy } from 'lucide-react';
import { StageName } from '../types';
import { audio } from '../utils/audio';

interface GameOverMenuProps {
  status: 'GAMEOVER' | 'VICTORY';
  score: number;
  coins: number;
  clearedStage: StageName;
  highscore: number;
  isNewHighscore: boolean;
  onRestart: () => void;
  onNextLevel?: () => void; // Hidden if stage is 1-4
  onHome: () => void;
}

export default function GameOverMenu({
  status,
  score,
  coins,
  clearedStage,
  highscore,
  isNewHighscore,
  onRestart,
  onNextLevel,
  onHome
 }: GameOverMenuProps) {

  // New interactive speed state: 'paused' | 'slow' | 'normal' | 'fast'
  const [scrollSpeed, setScrollSpeed] = useState<'paused' | 'slow' | 'normal' | 'fast'>('slow');

  // Typewriter effect state
  const [displayedText, setDisplayedText] = useState('');

  // Start the slower background music track corresponding to the menu on mount
  useEffect(() => {
    if (status === 'GAMEOVER') {
      audio.startMusic('GAMEOVER');
    } else {
      audio.startMusic('VICTORY');
    }
    return () => {
      audio.stopMusic();
    };
  }, [status]);

  // Dynamically select exactly ONE quote on mount (or status changes) to avoid looping
  const selectedQuote = React.useMemo(() => {
    if (status === 'GAMEOVER') {
      const deathQuotes = [
        "你被苦力怕近身，原地炸裂了！💣",
        "小心脚底下空岛悬崖！不要踩空。🍃",
        "有些僵尸会在你落地瞬间突然袭击！🚨",
        "海龟的外壳虽然能踢飞，但反弹也会打死自己！🐢",
        "你成为了村民口中另一个冒险失败的故事。"
      ];
      return deathQuotes[Math.floor(Math.random() * deathQuotes.length)];
    } else {
      if (clearedStage === '1-4') {
        const victoryQuotes = [
          "不可思议！你成功击杀了末影巨龙，解救了方块蘑菇世界！🏆👑",
          "完美的像素跳跃操作，成为了这片像素大陆的终极救世主！🎒"
        ];
        return victoryQuotes[Math.floor(Math.random() * victoryQuotes.length)];
      }
      const regularVictoryQuotes = [
        "太厉害了！成功插旗完成本关，继续挑战下一个世界吧！✨",
        "勇往直前！下一关正等待着你高超的手艺与非凡的勇气！🔥"
      ];
      return regularVictoryQuotes[Math.floor(Math.random() * regularVictoryQuotes.length)];
    }
  }, [status, clearedStage]);

  // Clean, high-fidelity typewriter loop that plays satisfying 'CLICK' ticks per character (non-spaces)
  useEffect(() => {
    let active = true;
    let timerId: ReturnType<typeof setTimeout> | null = null;
    let currentCharIndex = 0;

    setDisplayedText('');

    function typeNextChar() {
      if (!active) return;
      const chars = Array.from(selectedQuote);
      if (currentCharIndex < chars.length) {
        const nextChar = chars[currentCharIndex];
        setDisplayedText(chars.slice(0, currentCharIndex + 1).join(''));
        currentCharIndex++;
        
        // Play gentle typewriter tick sound for letters/words
        if (nextChar !== ' ' && nextChar !== '　') {
          audio.playSFX('CLICK');
        }
        timerId = setTimeout(typeNextChar, 100); // Relaxed typing rate (100ms per character)
      }
    }

    timerId = setTimeout(typeNextChar, 100);

    return () => {
      active = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [selectedQuote]);

  const triggerAction = (action: () => void) => {
    audio.playSFX('POWER_UP');
    action();
  };

  return (
    <div className="absolute inset-0 z-40 bg-[#7299ff]/85 flex items-center justify-center p-4 overflow-y-auto font-sans">
      <div className="w-full max-w-md bg-[#3d3d3d] border-8 border-white p-6 sm:p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,0.5)] text-center relative overflow-hidden">
        
        {/* Minecraft top brick stripes */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#ff3333] via-[#ffd700] to-[#4caf50]"></div>

        {/* Retro Tips Scrolling Ticker with custom duration and play state */}
        <div id="retro_hints_ticker" className="mt-2 mb-4 bg-black/40 border-b border-white/10 p-1.5 flex items-center gap-2 overflow-hidden relative text-left">
          <span className="bg-[#ff3333] px-1.5 py-0.5 text-[7px] font-retro text-white border border-white/30 z-10 shrink-0 font-bold shadow-[1px_1px_0_rgba(0,0,0,0.3)] animate-pulse">
            TIPS
          </span>
          <div className="flex-1 overflow-hidden relative h-4">
            <div 
              className="animate-marquee font-retro text-[8px] text-[#ffd700] absolute inset-y-0 flex items-center"
              style={{
                '--marquee-duration': scrollSpeed === 'slow' ? '45s' : scrollSpeed === 'normal' ? '25s' : '15s',
                animationPlayState: scrollSpeed === 'paused' ? 'paused' : 'running',
              } as React.CSSProperties}
            >
              <span className="mr-8">💡 [秘籍] 双击跳跃键(空格/UP)可以连续起跳触发二段飞跃，轻松空渡悬崖!</span>
              <span className="mr-8">🔥 [秘籍] 获得火焰花变成火焰形态后，按下 [X] 键扔火弹可远距离瞬秒僵尸!</span>
              <span className="mr-8">⚡ [秘籍] 抓取无敌星星进入金色疾风模式，自动无视怪物碰撞且获得50%飞奔移速增幅!</span>
              <span className="mr-8">🍄 [秘籍] 红蘑菇令体型变大并提升容错率，承受伤害时仅退化而不丧命!</span>
              <span className="mr-8">💎 [秘籍] 某些绿色管道带有神奇引力，跳进去会探寻到盛满钻石的黄金密室!</span>
            </div>
          </div>
          {/* Speed controller */}
          <div className="flex gap-1 shrink-0 z-10 pl-1 border-l border-white/20">
            {(['paused', 'slow', 'normal', 'fast'] as const).map((spd) => {
              const labels = { paused: '||', slow: 'S', normal: 'M', fast: 'F' };
              const isSelected = scrollSpeed === spd;
              return (
                <button
                  key={spd}
                  onClick={() => setScrollSpeed(spd)}
                  className={`w-3.5 h-3.5 text-[7px] font-retro flex items-center justify-center border transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-[#ffd700] text-black border-white font-bold' 
                      : 'bg-zinc-800 text-gray-400 border-zinc-700 hover:text-white'
                  }`}
                  title={`${spd.toUpperCase()} Speed`}
                >
                  {labels[spd]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Big Retro Graphic Header */}
        <div className="mb-6">
          {status === 'GAMEOVER' ? (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-[#ff3333]/20 border-4 border-white rounded-none flex items-center justify-center mb-3 text-red-500 animate-pulse shadow-[2px_2px_0_rgba(0,0,0,0.3)]">
                <Skull className="w-10 h-10 text-red-400" />
              </div>
              <span className="block font-retro text-xl sm:text-2xl text-red-500 tracking-wider drop-shadow-[2px_2px_0_#000] font-bold">
                GAME OVER
              </span>
              <span className="block text-[10px] font-retro text-gray-300 mt-1">
                你失败了，请大侠重新来过
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-[#ffd700]/20 border-4 border-white rounded-none flex items-center justify-center mb-3 text-[#ffd700] animate-bounce shadow-[2px_2px_0_rgba(0,0,0,0.3)]">
                <Trophy className="w-10 h-10 text-yellow-400" />
              </div>
              <span className="block font-retro text-xl sm:text-2xl text-[#4caf50] tracking-wider drop-shadow-[2px_2px_0_#000] font-bold">
                STAGE CLEARED!
              </span>
              <span className="block text-[10px] font-retro text-[#ffd700] mt-1 animate-pulse drop-shadow-[1px_1px_0_rgba(0,0,0,0.4)]">
                ★ 完美通关，凯旋归来 ★
              </span>
            </div>
          )}
        </div>

        {/* HighScore Badge */}
        {isNewHighscore && (
          <div className="mb-4 inline-flex items-center gap-1.5 py-1 px-4 bg-orange-600 border-2 border-white text-white font-retro text-[9px] animate-[bounce_2s_infinite] shadow-[4px_4px_0px_rgba(0,0,0,0.3)] font-bold">
            <Award className="w-3.5 h-3.5 animate-[pulse_1s_infinite]" />
            <span>🎉 全新高分纪录 NEW HIGHSCORE!</span>
          </div>
        )}

        {/* Stats Panel */}
        <div className="bg-black/30 border border-white/20 p-4 text-left grid grid-cols-2 gap-y-3 gap-x-4 mb-6">
          <div>
            <span className="text-[10px] font-retro text-gray-400 block">CURRENT WORLD</span>
            <span className="text-sm font-bold text-white font-mono flex items-center gap-1">
              <span>Stage {clearedStage}</span>
            </span>
          </div>

          <div>
            <span className="text-[10px] font-retro text-gray-400 block">COINS COLLECTED</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-4 h-4 bg-[#ffd700] border border-[#b8860b] shadow-[inset_-1px_-1px_0_#daa520] shrink-0"></div>
              <span className="text-sm font-bold text-[#ffd700] font-mono leading-none">
                {coins} Coins
              </span>
            </div>
          </div>

          <div className="col-span-2 border-t border-white/10 pt-2">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] font-retro text-gray-400 block">TOTAL SCORE</span>
                <span className="text-lg font-retro text-[#38bdf8] block font-bold drop-shadow-[1px_1px_0_rgba(0,0,0,0.8)]">
                  {score.toString().padStart(6, '0')}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-retro text-gray-400 block">BEST HIGHSCORE</span>
                <span className="text-sm font-retro text-[#ffd700] block font-bold">
                  {highscore.toString().padStart(6, '0')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Flavor Fun description */}
        <p className="text-xs text-gray-300 font-mono text-center italic mb-8 border-l-2 border-white/30 pl-2 leading-relaxed min-h-[2rem]">
          {displayedText || '\u00a0'}
        </p>

        {/* Actions buttons */}
        <div className="flex flex-col gap-3">
          {/* Next Level button if victory and valid */}
          {status === 'VICTORY' && onNextLevel && clearedStage !== '1-4' && (
            <button
              onClick={() => triggerAction(onNextLevel)}
              className="w-full py-3 bg-[#4caf50] hover:bg-[#43a047] border-4 border-white text-white font-retro text-xs tracking-wider flex items-center justify-center gap-2 active:translate-y-0.5 shadow-[4px_4px_0_rgba(0,0,0,0.4)] cursor-pointer"
            >
              <ArrowRight className="w-4 h-4 text-white" />
              <span>挑战下一关 NEXT STAGE</span>
            </button>
          )}

          {/* Retry game */}
          <button
            onClick={() => triggerAction(onRestart)}
            className="w-full py-3 bg-[#38bdf8] hover:bg-[#0ea5e9] border-4 border-white text-white font-retro text-xs tracking-wider flex items-center justify-center gap-2 active:translate-y-0.5 shadow-[4px_4px_0_rgba(0,0,0,0.4)] cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-white" />
            <span>重新挑战 PLAY AGAIN</span>
          </button>

          {/* Back Home */}
          <button
            onClick={() => triggerAction(onHome)}
            className="w-full py-3 bg-[#585860] hover:bg-[#484850] border-4 border-white text-white font-retro text-xs tracking-wider flex items-center justify-center gap-2 active:translate-y-0.5 shadow-[4px_4px_0_rgba(0,0,0,0.4)] cursor-pointer"
          >
            <Home className="w-4 h-4 text-white" />
            <span>返回游戏大厅 MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
}
