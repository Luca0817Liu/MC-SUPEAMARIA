/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Pause, RefreshCw, Star, Heart, Flame, Home, Layers } from 'lucide-react';
import { GameState, StageName, MarioForm } from './types';
import MainMenu from './components/MainMenu';
import GameCanvas from './components/GameCanvas';
import PauseMenu from './components/PauseMenu';
import GameOverMenu from './components/GameOverMenu';
import Controls from './components/Controls';
import { audio } from './utils/audio';

export default function App() {
  // State variables synchronized across the game
  const [gameState, setGameState] = useState<GameState>('START');
  const [currentStage, setCurrentStage] = useState<StageName>('1-1');
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [lives, setLives] = useState(3);
  const [marioForm, setMarioForm] = useState<MarioForm>('SMALL');
  const [isStarActive, setIsStarActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // High score persistent state
  const [highscore, setHighscore] = useState(0);
  const [isNewHighscore, setIsNewHighscore] = useState(false);
  const [showVirtualControls, setShowVirtualControls] = useState(false);

  // Load highscore from localStorage on initialization
  // Also detect touch screen capability to set virtual controls state
  useEffect(() => {
    const savedHighScore = localStorage.getItem('minecraft_mario_highscore');
    if (savedHighScore) {
      setHighscore(parseInt(savedHighScore, 10));
    }
    const isTouch = window.matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    setShowVirtualControls(isTouch);
  }, []);

  // Update highscore if current score exceeds it
  const checkAndSetHighscore = (finalScore: number) => {
    if (finalScore > highscore) {
      setHighscore(finalScore);
      setIsNewHighscore(true);
      localStorage.setItem('minecraft_mario_highscore', finalScore.toString());
    } else {
      setIsNewHighscore(false);
    }
  };

  // Sound toggler wrapper
  const handleToggleMute = () => {
    const isNowMuted = audio.toggleMute();
    setIsMuted(isNowMuted);

    // If unmuting while playing, restart stage track
    if (!isNowMuted && gameState === 'PLAYING') {
      audio.startMusic(currentStage);
    }
  };

  // Launch a game stage session
  const handleStartGame = (selectedStage: StageName) => {
    setCurrentStage(selectedStage);
    setScore(0);
    setCoins(0);
    setLives(3);
    setMarioForm('SMALL');
    setIsStarActive(false);
    setGameState('PLAYING');
  };

  // Resume paused game callback
  const handleResumeGame = () => {
    setGameState('PLAYING');
    // resume music
    audio.startMusic(currentStage);
  };

  // Trigger pause state
  const handlePauseToggle = () => {
    if (gameState === 'PLAYING') {
      setGameState('PAUSED');
      audio.stopMusic();
    } else if (gameState === 'PAUSED') {
      handleResumeGame();
    }
  };

  // Handle a single life loss
  const handleMinusLife = () => {
    setLives((prev) => {
      const remaining = prev - 1;
      return remaining;
    });
  };

  // Triggers game over overlay
  const handleGameOver = (finalScore: number, finalCoins: number) => {
    setScore(finalScore);
    setCoins(finalCoins);
    checkAndSetHighscore(finalScore);
    setGameState('GAMEOVER');
    audio.stopMusic();
  };

  // Trigger level cleared overlay
  const handleVictory = (finalScore: number, finalCoins: number) => {
    setScore(finalScore);
    setCoins(finalCoins);
    checkAndSetHighscore(finalScore);
    setGameState('VICTORY');
    audio.stopMusic();
  };

  // Proceed to next challenge stages
  const handleNextLevel = () => {
    const stageSeq: Record<StageName, StageName> = {
      '1-1': '1-2',
      '1-2': '1-3',
      '1-3': '1-4',
      '1-4': '1-1'
    };
    const next = stageSeq[currentStage];
    setCurrentStage(next);
    setScore(0);
    setCoins(0);
    setLives(3);
    setMarioForm('SMALL');
    setIsStarActive(false);
    setGameState('PLAYING');
  };

  // Exit back to title screen
  const handleReturnToHome = () => {
    setGameState('START');
    audio.stopMusic();
  };

  // Direct trigger for mobile touch joystick mapping
  const handleVirtualKeyPress = (key: 'left' | 'right' | 'up' | 'fire', pressed: boolean) => {
    if ((window as any).marioControlsTrigger) {
      (window as any).marioControlsTrigger(key, pressed);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#7299ff] text-white flex flex-col justify-between select-none relative font-sans overflow-hidden border-4 sm:border-8 border-[#3d3d3d]">
      
      {/* 1) MAIN HOME MENU SCREEN STATE */}
      {gameState === 'START' && (
        <MainMenu
          onStartGame={handleStartGame}
          highscore={highscore}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* 2) MAIN GAMEPLAY VIEW (SCREENS AND HUD) */}
      {(gameState === 'PLAYING' || gameState === 'PAUSED' || gameState === 'GAMEOVER' || gameState === 'VICTORY') && (
        <div className="flex-1 flex flex-col items-center justify-center p-1 sm:p-4 relative">
          
          {/* Subtle retro pixelated decorative clouds in background for Vibrant Sky theme */}
          <div className="absolute inset-x-0 top-0 bottom-0 overflow-hidden pointer-events-none z-0">
            <div className="absolute top-12 left-10 w-28 h-10 bg-white/80 shadow-[12px_0_0_0_#fff,24px_0_0_0_#fff,0_12px_0_0_#fff,12px_12px_0_0_#fff] opacity-65"></div>
            <div className="absolute top-28 right-16 w-40 h-12 bg-white/80 shadow-[16px_0_0_0_#fff,32px_0_0_0_#fff,16px_16px_0_0_#fff] opacity-65 hidden md:block"></div>
          </div>

          {/* Header HUD panel matching the Vibrant Palette Theme */}
          <div className="w-full max-w-4xl bg-[#3d3d3d] border-2 sm:border-4 border-white p-2 sm:p-3.5 shadow-[4px_4px_0px_rgba(0,0,0,0.4)] sm:shadow-[8px_8px_0px_rgba(0,0,0,0.4)] mb-2 sm:mb-3 flex flex-col gap-2 relative z-10">
            
            <div className="flex justify-between items-center text-[10px] sm:text-xs">
              
              {/* Score section */}
              <div className="flex flex-col drop-shadow-[2px_2px_0_rgba(0,0,0,0.5)]">
                <span className="font-retro text-gray-300 text-[7px] sm:text-[8px] tracking-wide">MARIO SCORE</span>
                <span className="font-retro text-[#ffd700] text-xs sm:text-base tracking-widest leading-none font-bold">
                  {score.toString().padStart(7, '0')}
                </span>
              </div>

              {/* Coins tally with the design's signature Custom Voxel gold coin backing */}
              <div className="flex items-center gap-1 sm:gap-2 drop-shadow-[2px_2px_0_rgba(0,0,0,0.5)] bg-black/35 px-1.5 sm:px-2.5 py-0.5 sm:py-1 border border-white/20">
                <div className="w-3.5 h-3.5 sm:w-5 sm:h-5 bg-[#ffd700] border border-[#b8860b] shadow-[inset_-2px_-2px_0_#daa520] shrink-0"></div>
                <span className="font-retro text-white text-[10px] sm:text-sm font-bold">
                  x{coins.toString().padStart(2, '0')}
                </span>
              </div>

              {/* Stage Progress */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 sm:py-1 bg-black/40 border sm:border-2 border-[#ffd700] text-[#ffd700] font-retro text-[8px] sm:text-[10px] shadow-[2px_2px_0px_rgba(0,0,0,0.3)]">
                <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 text-[#ffd700]" />
                <span className="font-bold">W-{currentStage}</span>
              </div>

              {/* Status form badges */}
              <div className="hidden lg:flex items-center gap-2">
                {marioForm === 'BIG' && (
                  <span className="px-2.5 py-0.5 bg-red-600 border border-white text-white font-retro text-[8px] tracking-wider shadow-[2px_2px_0_rgba(0,0,0,0.3)]">
                    🍄 BIG FORM
                  </span>
                )}
                {marioForm === 'FIRE' && (
                  <span className="px-2.5 py-0.5 bg-orange-500 border border-white text-white font-retro text-[8px] flex items-center gap-1 shadow-[2px_2px_0_rgba(0,0,0,0.3)] animate-pulse">
                    <Flame className="w-3 h-3 fill-orange-200 text-orange-200" />
                    <span>FIRE FORM</span>
                  </span>
                )}
                {isStarActive && (
                  <span className="px-2.5 py-0.5 bg-yellow-400 border border-white text-black font-retro text-[8px] flex items-center gap-1 shadow-[2px_2px_0_rgba(0,0,0,0.3)] animate-[bounce_1.5s_infinite]">
                    <Star className="w-3 h-3 fill-black text-black" />
                    <span>STAR MOD</span>
                  </span>
                )}
              </div>

              {/* Health Hearts */}
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 bg-black/25 px-1.5 py-0.5 border border-white/10">
                <span className="font-retro text-red-400 text-[9px] hidden sm:inline font-bold">LIVES:</span>
                <div className="flex gap-0.5">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Heart
                      key={i}
                      className={`w-3.5 h-3.5 sm:w-5 sm:h-5 drop-shadow-[1px_1px_0_rgba(0,0,0,0.6)] ${
                        i < lives ? 'text-red-500 fill-red-500 animate-[pulse_1.5s_infinite]' : 'text-zinc-600 fill-zinc-700'
                      }`}
                    />
                  ))}
                </div>
              </div>

            </div>

            {/* Sub utility details bar with custom white translucent overlays */}
            <div className="flex justify-between items-center border-t border-white/25 pt-2 text-[9px] sm:text-[10px] text-gray-300 font-mono">
              <div className="flex gap-3">
                <span className="hidden md:inline text-white/90 font-semibold">⌨️ Controls: [WASD] Move | [Space/Up] Fly/DoubleJump | [X] Fireball</span>
                <span className="md:hidden text-white/90 font-semibold text-[8px]">📱 点击右边 📱 键自定虚拟操控面盘</span>
              </div>
              
              {/* Play buttons following the design's hover style */}
              <div className="flex items-center gap-1 sm:gap-2 pointer-events-auto">
                <button
                  id="header_controls_btn"
                  onClick={() => {
                    audio.playSFX('CLICK');
                    setShowVirtualControls(prev => !prev);
                  }}
                  className={`p-1 px-1.5 text-white font-retro text-[8px] border shrink-0 cursor-pointer shadow-[2px_2px_0_rgba(0,0,0,0.3)] active:scale-95 transition-all ${
                    showVirtualControls ? 'bg-amber-600 border-amber-300 font-bold' : 'bg-white/10 border-white/50 hover:bg-white/20'
                  }`}
                  title="Toggle Virtual Touchscreen Buttons"
                >
                  📱 {showVirtualControls ? '键ON' : '键OFF'}
                </button>

                <button
                  id="header_pause_btn"
                  onClick={handlePauseToggle}
                  className="px-1.5 sm:px-3 py-1 bg-white/10 hover:bg-white/20 text-white font-retro text-[8px] border cursor-pointer active:translate-y-0.5 shrink-0 shadow-[2px_2px_0_rgba(0,0,0,0.3)]"
                >
                  {gameState === 'PAUSED' ? '▶ RESUME' : '|| PAUSE'}
                </button>
                
                <button
                  id="header_mute_btn"
                  onClick={handleToggleMute}
                  className="p-1 px-1.5 bg-white/10 hover:bg-white/20 text-white border active:scale-95 cursor-pointer shadow-[2px_2px_0_rgba(0,0,0,0.3)]"
                  title="Toggle Audio"
                >
                  {isMuted ? <VolumeX className="w-3 sm:w-3.5 h-3 sm:h-3.5" /> : <Volume2 className="w-3 sm:w-3.5 h-3 sm:h-3.5" />}
                </button>
              </div>
            </div>

          </div>

          {/* Core Interactive Canvas Element */}
          <div className="relative w-full max-w-4xl select-none">
            
            <GameCanvas
              stage={currentStage}
              onGameOver={handleGameOver}
              onVictory={handleVictory}
              onScoreUpdate={(s, c, l, f, st) => {
                setScore(s);
                setCoins(c);
                setLives(l);
                setMarioForm(f);
                setIsStarActive(st);
              }}
              paused={gameState === 'PAUSED'}
              lives={lives}
              onMinusLife={handleMinusLife}
            />

            {/* Direct overlay overlays inside the Canvas wrapping */}
            {gameState === 'PAUSED' && (
              <PauseMenu
                onResume={handleResumeGame}
                onRestart={() => handleStartGame(currentStage)}
                onHome={handleReturnToHome}
              />
            )}

            {gameState === 'GAMEOVER' && (
              <GameOverMenu
                status="GAMEOVER"
                score={score}
                coins={coins}
                clearedStage={currentStage}
                highscore={highscore}
                isNewHighscore={isNewHighscore}
                onRestart={() => handleStartGame(currentStage)}
                onHome={handleReturnToHome}
              />
            )}

            {gameState === 'VICTORY' && (
              <GameOverMenu
                status="VICTORY"
                score={score}
                coins={coins}
                clearedStage={currentStage}
                highscore={highscore}
                isNewHighscore={isNewHighscore}
                onRestart={() => handleStartGame(currentStage)}
                onNextLevel={handleNextLevel}
                onHome={handleReturnToHome}
              />
            )}

          </div>

          {/* Virtual buttons helper on responsive screen sizes */}
          {showVirtualControls && (
            <Controls
              onPress={handleVirtualKeyPress}
              onPauseToggle={handlePauseToggle}
              marioForm={marioForm}
            />
          )}

        </div>
      )}

      {/* Floating global copyright watermark */}
      <div className="relative pb-3 text-center text-[10px] text-gray-600 font-mono tracking-wide">
        Minecraft Mario Platformer Core © 2026. Made with ❤️ for AI Studio Build.
      </div>
    </div>
  );
}
