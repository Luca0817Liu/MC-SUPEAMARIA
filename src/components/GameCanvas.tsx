/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { StageName, MarioForm, Actor, Block, ControlKeys, Particle, BouncingCoin, BlockType, ActorType } from '../types';
import { audio } from '../utils/audio';

interface GameCanvasProps {
  stage: StageName;
  onGameOver: (score: number, coins: number) => void;
  onVictory: (score: number, coins: number) => void;
  onScoreUpdate: (score: number, coins: number, lives: number, form: MarioForm, isStarActive: boolean) => void;
  paused: boolean;
  lives: number;
  onMinusLife: () => void;
}

export default function GameCanvas({
  stage,
  onGameOver,
  onVictory,
  onScoreUpdate,
  paused,
  lives,
  onMinusLife
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game states we track internally
  const [innerScore, setInnerScore] = useState(0);
  const [innerCoins, setInnerCoins] = useState(0);

  // Use refs in order to keep the main requestAnimationFrame loop snappy and free of closures
  const gameRef = useRef({
    score: 0,
    coins: 0,
    lives: 3,
    marioForm: 'SMALL' as MarioForm,
    isStarActive: false,
    starTimer: 0,
    invincibleTimer: 0, // After taking damage
    
    // Player coordinates & speeds
    player: {
      x: 80,
      y: 100,
      vx: 0,
      vy: 0,
      width: 28,
      height: 28, // changes depending on form
      isGrounded: false,
      doubleJumpsUsed: 0,
      facing: 1 as 1 | -1,
      runAnimationTimer: 0,
      isDucking: false,
      isHitAnim: false
    },

    // Level map & actors
    blocks: [] as Block[],
    gridSize: 32, // standard cell height/width
    worldCols: 180, // length of level
    worldRows: 15, // height of level
    actors: [] as Actor[],
    particles: [] as Particle[],
    bouncingCoins: [] as BouncingCoin[],
    fireballs: [] as { x: number; y: number; vx: number; vy: number; id: string }[],
    
    // Camera
    cameraX: 0,
    winSequence: false,
    winSequenceTimer: 0,

    inSecretArea: false,
    secretSavedState: null as {
      blocks: Block[];
      actors: Actor[];
      playerX: number;
      playerY: number;
      cameraX: number;
      worldCols: number;
    } | null,

    keys: {
      left: false,
      right: false,
      up: false,
      down: false,
      fire: false,
      pause: false
    } as ControlKeys,

    // Boss fight state for stage 1-4
    bossActive: false,
    bossHealth: 10,
    bossMaxHealth: 10,
    bossX: 0,
    bossY: 0,
    bossVy: 0,
    bossDirection: -1 as 1 | -1,
    bossAttackTimer: 0
  });

  // Keep track of parent stage
  useEffect(() => {
    initLevel(stage);
  }, [stage]);

  // Keep tracked lives synchronized
  useEffect(() => {
    gameRef.current.lives = lives;
  }, [lives]);

  // Virtual controllers integration hook
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const g = gameRef.current;
      if (g.winSequence || paused) return;

      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          g.keys.left = true;
          break;
        case 'ArrowRight':
        case 'KeyD':
          g.keys.right = true;
          break;
        case 'ArrowUp':
        case 'KeyW':
        case 'Space':
          if (!g.keys.up) {
            triggerJump();
          }
          g.keys.up = true;
          break;
        case 'ArrowDown':
        case 'KeyS':
          g.keys.down = true;
          break;
        case 'KeyX':
        case 'KeyF':
          if (!g.keys.fire) {
            triggerFireball();
          }
          g.keys.fire = true;
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const g = gameRef.current;
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          g.keys.left = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          g.keys.right = false;
          break;
        case 'ArrowUp':
        case 'KeyW':
        case 'Space':
          g.keys.up = false;
          break;
        case 'ArrowDown':
        case 'KeyS':
          g.keys.down = false;
          break;
        case 'KeyX':
        case 'KeyF':
          g.keys.fire = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [paused]);

  // Method to handle jump from keyboard or mobile controller
  const triggerJump = () => {
    const g = gameRef.current;
    const p = g.player;

    if (p.isGrounded) {
      p.vy = -8.2; // Launch force
      p.isGrounded = false;
      p.doubleJumpsUsed = 1;
      audio.playSFX('JUMP');
      // Jump particles
      spawnParticles(p.x + p.width / 2, p.y + p.height, 'DEBRIS', '#ffffff', 5);
    } else if (p.doubleJumpsUsed < 2) {
      // Powerful double jump
      p.vy = -7.4;
      p.doubleJumpsUsed = 2;
      audio.playSFX('JUMP');
      // Dust cloud double jump ring
      spawnParticles(p.x + p.width / 2, p.y + p.height / 2, 'PORTAL', '#38bdf8', 8);
    }
  };

  // Method to handle throwing fireball
  const triggerFireball = () => {
    const g = gameRef.current;
    if (g.marioForm !== 'FIRE') return;

    if (g.fireballs.length < 3) {
      audio.playSFX('FIREBALL');
      g.fireballs.push({
        id: Math.random().toString(),
        x: g.player.x + (g.player.facing === 1 ? g.player.width : -8),
        y: g.player.y + g.player.height / 2 - 4,
        vx: g.player.facing * 6.5,
        vy: 2 // downward bouncy speed
      });

      // Sparks
      spawnParticles(g.player.x + (g.player.facing === 1 ? g.player.width : 0), g.player.y + g.player.height/2, 'FIRE', '#f97316', 4);
    }
  };

  // Exposed handler for touch controller (External components tap this)
  const handleTouchAction = (key: 'left' | 'right' | 'up' | 'fire', pressed: boolean) => {
    const g = gameRef.current;
    if (g.winSequence || paused) return;

    g.keys[key] = pressed;
    if (pressed) {
      if (key === 'up') {
        triggerJump();
      } else if (key === 'fire') {
        triggerFireball();
      }
    }
  };

  // Initial Level Creator based on selected Stage
  const initLevel = (selectedStage: StageName) => {
    const g = gameRef.current;
    g.score = 0;
    g.coins = 0;
    g.winSequence = false;
    g.winSequenceTimer = 0;
    g.marioForm = 'SMALL';
    g.player.height = 28;
    g.player.x = 80;
    g.player.y = 100;
    g.player.vx = 0;
    g.player.vy = 0;
    g.player.isGrounded = false;
    g.player.doubleJumpsUsed = 0;
    g.isStarActive = false;
    g.starTimer = 0;
    g.invincibleTimer = 0;
    g.bossActive = false;

    // Reset list containers
    g.actors = [];
    g.particles = [];
    g.bouncingCoins = [];
    g.fireballs = [];

    // Trigger music change
    audio.startMusic(selectedStage);

    // Build the Grid map
    const cols = g.worldCols;
    const rows = g.worldRows;
    const bArray: Block[] = [];

    // Grid filling rules based on worlds
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        let blockType: BlockType = 'AIR';
        let item: ActorType | undefined;
        let cCount = 0;

        // Establish the primary Ground Level
        if (r >= 13) {
          if (selectedStage === '1-4') {
            // Nether stage: lava hazards and holes!
            if ((c > 35 && c < 42) || (c > 75 && c < 82) || (c > 115 && c < 122)) {
              blockType = 'LAVA';
            } else {
              blockType = 'NETHERRACK';
            }
          } else if (selectedStage === '1-3') {
            // Sky Stage: lots of bottomless pits!
            if ((c > 15 && c < 22) || (c > 45 && c < 52) || (c > 78 && c < 88) || (c > 110 && c < 117) || (c > 118 && c < 125)) {
              blockType = 'AIR';
            } else {
              blockType = 'GRASS';
            }
          } else if (selectedStage === '1-2') {
            // Underground Stone
            blockType = 'STONE';
          } else {
            // 1-1 standard plains
            if ((c > 40 && c < 43) || (c > 85 && c < 89)) {
              blockType = 'AIR'; // standard holes
            } else {
              blockType = 'GRASS';
            }
          }
        } else if (r === 12) {
          // secondary sub-base dirt layer
          if (r >= 13 && r <= 14) blockType = 'AIR';
          else if (selectedStage === '1-1' && !((c > 40 && c < 43) || (c > 85 && c < 89))) blockType = 'DIRT';
          else if (selectedStage === '1-2') blockType = 'STONE';
          else if (selectedStage === '1-3' && !((c > 15 && c < 22) || (c > 45 && c < 52) || (c > 78 && c < 88) || (c > 110 && c < 117) || (c > 118 && c < 125))) blockType = 'DIRT';
          else if (selectedStage === '1-4' && !((c > 35 && c < 42) || (c > 75 && c < 82) || (c > 115 && c < 122))) blockType = 'OBSIDIAN';
        }

        // LEVEL SPECIAL DESIGN PATTERNS (PIPES, BRICKS, SPECIAL LUCKY BLOCKS)
        if (selectedStage === '1-1') {
          // 1-1 overworld items & pipes
          // Left flag pole pole
          if (c === 165 && r <= 12 && r >= 3) {
            blockType = (r === 3) ? 'FLAG' : 'FLAG_POLE';
          }
          if (c === 165 && r === 12) blockType = 'BEDROCK';

          // Lucky blocks & standard bricks
          if (r === 8) {
            if (c === 16) { blockType = 'QUESTION_BLOCK'; item = 'COIN'; }
            if (c === 20) { blockType = 'BRICK'; }
            if (c === 21) { blockType = 'QUESTION_BLOCK'; item = 'MUSHROOM'; }
            if (c === 22) { blockType = 'BRICK'; }
            if (c === 23) { blockType = 'QUESTION_BLOCK'; item = 'COIN'; }
            if (c === 24) { blockType = 'BRICK'; }

            if (c === 58) { blockType = 'BRICK'; }
            if (c === 59) { blockType = 'QUESTION_BLOCK'; item = 'FLOWER'; }
            if (c === 60) { blockType = 'BRICK'; }

            if (c === 98) { blockType = 'QUESTION_BLOCK'; item = 'STAR'; }
            if (c === 100) { blockType = 'QUESTION_BLOCK'; item = 'COIN'; }
            if (c === 102) { blockType = 'QUESTION_BLOCK'; item = 'COIN'; }
          }

          if (r === 4) {
            if (c === 22) { blockType = 'QUESTION_BLOCK'; item = 'COIN'; }
            if (c === 80) { blockType = 'BRICK'; }
            if (c === 81) { blockType = 'BRICK'; }
            if (c === 82) { blockType = 'BRICK'; }
          }

          // Green Pipes
          if (c === 32) {
            if (r === 11 || r === 12) blockType = 'PIPE_BODY_L';
            if (r === 10) blockType = 'PIPE_TOP_L';
          }
          if (c === 33) {
            if (r === 11 || r === 12) blockType = 'PIPE_BODY_R';
            if (r === 10) blockType = 'PIPE_TOP_R';
          }

          if (c === 68) {
            if (r === 12) blockType = 'PIPE_BODY_L';
            if (r === 11) blockType = 'PIPE_TOP_L';
          }
          if (c === 69) {
            if (r === 12) blockType = 'PIPE_BODY_R';
            if (r === 11) blockType = 'PIPE_TOP_R';
          }

        } else if (selectedStage === '1-2') {
          // 1-2 cave: stony & brick walls
          if (c === 165 && r <= 12 && r >= 3) {
            blockType = (r === 3) ? 'FLAG' : 'FLAG_POLE';
          }
          if (c === 165 && r === 12) blockType = 'BEDROCK';

          // bricks in 1-2 made of COAL_ORE
          if (r === 8) {
            if (c === 15 || c === 17 || c === 19) { blockType = 'COAL_ORE'; }
            if (c === 16 || c === 18) { blockType = 'QUESTION_BLOCK'; item = 'COIN'; }
            if (c === 55) { blockType = 'QUESTION_BLOCK'; item = 'MUSHROOM'; }
            if (c === 56 || c === 57) { blockType = 'COAL_ORE'; }
            if (c === 58) { blockType = 'QUESTION_BLOCK'; item = 'FLOWER'; }
            
            if (c === 90 || c === 92 || c === 94) { blockType = 'COAL_ORE'; }
            if (c === 91 || c === 93) { blockType = 'QUESTION_BLOCK'; item = 'COIN'; }
          }

          // Tunnel roof layout
          if (r <= 3 && c < 155) {
            blockType = 'STONE';
          }

          // Pipes
          if (c === 38) {
            if (r === 11 || r === 12) blockType = 'PIPE_BODY_L';
            if (r === 10) blockType = 'PIPE_TOP_L';
          }
          if (c === 39) {
            if (r === 11 || r === 12) blockType = 'PIPE_BODY_R';
            if (r === 10) blockType = 'PIPE_TOP_R';
          }

          // Exit Pipe for secret room in 1-2
          if (c === 80) {
            if (r === 11 || r === 12) blockType = 'PIPE_BODY_L';
            if (r === 10) blockType = 'PIPE_TOP_L';
          }
          if (c === 81) {
            if (r === 11 || r === 12) blockType = 'PIPE_BODY_R';
            if (r === 10) blockType = 'PIPE_TOP_R';
          }

          // Secret fake walkthrough cave wall blocks of COAL_ORE at columns 72-73
          if ((c === 72 || c === 73) && (r === 9 || r === 10)) {
            blockType = 'COAL_ORE';
          }

        } else if (selectedStage === '1-3') {
          // 1-3 Sky stage: Floating platforms
          if (c === 165 && r <= 12 && r >= 3) {
            blockType = (r === 3) ? 'FLAG' : 'FLAG_POLE';
          }
          if (c === 165 && r === 12) blockType = 'BEDROCK';

          // Pipes for secret room in 1-3
          if (c === 30) {
            if (r === 11 || r === 12) blockType = 'PIPE_BODY_L';
            if (r === 10) blockType = 'PIPE_TOP_L';
          }
          if (c === 31) {
            if (r === 11 || r === 12) blockType = 'PIPE_BODY_R';
            if (r === 10) blockType = 'PIPE_TOP_R';
          }
          if (c === 60) {
            if (r === 11 || r === 12) blockType = 'PIPE_BODY_L';
            if (r === 10) blockType = 'PIPE_TOP_L';
          }
          if (c === 61) {
            if (r === 11 || r === 12) blockType = 'PIPE_BODY_R';
            if (r === 10) blockType = 'PIPE_TOP_R';
          }

          // Secret cloud illusion wall at cols 52-53
          if ((c === 52 || c === 53) && (r === 8 || r === 9)) {
            blockType = 'BRICK';
          }

          // Floating cloud/brick cells
          if (r === 9) {
            if (c >= 25 && c <= 29) blockType = 'BRICK';
            if (c === 27) { blockType = 'QUESTION_BLOCK'; item = 'STAR'; }

            if (c >= 60 && c <= 64) blockType = 'BRICK';
            if (c === 62) { blockType = 'QUESTION_BLOCK'; item = 'MUSHROOM'; }

            if (c >= 95 && c <= 100) blockType = 'BRICK';
          }

          if (r === 5) {
            if (c >= 35 && c <= 39) blockType = 'QUESTION_BLOCK'; // Coins chain
            if (c === 37) { blockType = 'QUESTION_BLOCK'; item = 'FLOWER'; }
            if (c >= 70 && c <= 75) blockType = 'BRICK';
          }

        } else if (selectedStage === '1-4') {
          // 1-4 Nether Fortress & Ender Dragon
          if (c === 165 && r === 12) {
            blockType = 'END_PORTAL'; // Portal block rather than flagpole
          }

          // Green pipes for secret room in 1-4
          if (c === 30) {
            if (r === 11 || r === 12) blockType = 'PIPE_BODY_L';
            if (r === 10) blockType = 'PIPE_TOP_L';
          }
          if (c === 31) {
            if (r === 11 || r === 12) blockType = 'PIPE_BODY_R';
            if (r === 10) blockType = 'PIPE_TOP_R';
          }
          if (c === 65) {
            if (r === 11 || r === 12) blockType = 'PIPE_BODY_L';
            if (r === 10) blockType = 'PIPE_TOP_L';
          }
          if (c === 66) {
            if (r === 11 || r === 12) blockType = 'PIPE_BODY_R';
            if (r === 10) blockType = 'PIPE_TOP_R';
          }

          // Dark walls made of Obsidian / Netherrack
          if (r === 8) {
            if (c === 12) { blockType = 'QUESTION_BLOCK'; item = 'MUSHROOM'; }
            if (c === 25 || c === 26 || c === 27) { blockType = 'NETHERRACK'; }
            if (c === 50) { blockType = 'QUESTION_BLOCK'; item = 'FLOWER'; }
            if (c === 60 || c === 61 || c === 62) { blockType = 'OBSIDIAN'; }
            if (c === 85) { blockType = 'QUESTION_BLOCK'; item = 'STAR'; }
            if (c === 141) { blockType = 'QUESTION_BLOCK'; item = 'FLOWER'; }
          }

          // Massive Lava hazard zones. Create step stone bridges
          if (r === 12) {
            if (c === 38 || c === 39) blockType = 'NETHERRACK';
            if (c === 78 || c === 79) blockType = 'OBSIDIAN';
            if (c === 118 || c === 119) blockType = 'NETHERRACK';
          }

          // Boss Wall barrier
          if (c === 145 && r >= 3 && r <= 12) {
            blockType = 'OBSIDIAN'; // Wall right before Boss
          }
        }

        // Add block layout
        if (blockType !== 'AIR') {
          bArray.push({
            x: c,
            y: r,
            type: blockType,
            containsItem: item,
            coinCount: item === 'COIN' ? 1 : 0
          });
        }
      }
    }

    g.blocks = bArray;

    // SPAWN MOB ACTORS ACCORDING TO CURRENT WORLD STAGE
    if (selectedStage === '1-1') {
      g.actors.push(
        { id: '1', type: 'ZOMBIE', x: 450, y: 150, vx: -1.2, vy: 0, width: 24, height: 28, direction: -1, isGrounded: false, health: 1, state: 'WALKING', stateTimer: 0 },
        { id: '2', type: 'ZOMBIE', x: 800, y: 150, vx: -1.2, vy: 0, width: 24, height: 28, direction: -1, isGrounded: false, health: 1, state: 'WALKING', stateTimer: 0 },
        { id: '3', type: 'TURTLE', x: 1200, y: 150, vx: -1.0, vy: 0, width: 24, height: 24, direction: -1, isGrounded: false, health: 1, state: 'WALKING', stateTimer: 0 },
        { id: '4', type: 'ZOMBIE', x: 1600, y: 150, vx: -1.2, vy: 0, width: 24, height: 28, direction: -1, isGrounded: false, health: 1, state: 'WALKING', stateTimer: 0 },
        { id: '5', type: 'CREEPER', x: 2176, y: 320, vx: 0, vy: 0, width: 24, height: 32, direction: -1, isGrounded: true, health: 1, state: 'STATIONARY', stateTimer: 0 } // pipe creeper
      );
    } else if (selectedStage === '1-2') {
      g.actors.push(
        { id: '20', type: 'TURTLE', x: 300, y: 150, vx: -1.1, vy: 0, width: 24, height: 24, direction: -1, isGrounded: false, health: 1, state: 'WALKING', stateTimer: 0 },
        { id: '21', type: 'TURTLE', x: 650, y: 150, vx: -1.1, vy: 0, width: 24, height: 24, direction: -1, isGrounded: false, health: 1, state: 'WALKING', stateTimer: 0 },
        { id: '22', type: 'ZOMBIE', x: 1000, y: 150, vx: -1.3, vy: 0, width: 24, height: 28, direction: -1, isGrounded: false, health: 1, state: 'WALKING', stateTimer: 0 },
        { id: '23', type: 'TURTLE', x: 1400, y: 150, vx: -1.1, vy: 0, width: 24, height: 24, direction: -1, isGrounded: false, health: 1, state: 'WALKING', stateTimer: 0 },
        // Secret wall passage coins and star at cols 74-76
        { id: 'sec_cave_c1', type: 'COIN', x: 74 * 32, y: 10 * 32, vx: 0, vy: 0, width: 24, height: 24, direction: 1, isGrounded: true, health: 1, state: 'STATIONARY', stateTimer: 0 },
        { id: 'sec_cave_c2', type: 'COIN', x: 75 * 32, y: 10 * 32, vx: 0, vy: 0, width: 24, height: 24, direction: 1, isGrounded: true, health: 1, state: 'STATIONARY', stateTimer: 0 },
        { id: 'sec_cave_star', type: 'STAR', x: 76 * 32, y: 9 * 32, vx: 0.8, vy: 0, width: 24, height: 24, direction: 1, isGrounded: true, health: 1, state: 'SPAWNING', stateTimer: 0 }
      );
    } else if (selectedStage === '1-3') {
      g.actors.push(
        { id: '30', type: 'ZOMBIE', x: 400, y: 100, vx: -1.4, vy: 0, width: 24, height: 28, direction: -1, isGrounded: false, health: 1, state: 'WALKING', stateTimer: 0 },
        { id: '31', type: 'CREEPER', x: 800, y: 100, vx: 0, vy: 0, width: 24, height: 32, direction: -1, isGrounded: true, health: 1, state: 'STATIONARY', stateTimer: 0 },
        { id: '32', type: 'TURTLE', x: 1100, y: 100, vx: -1.2, vy: 0, width: 24, height: 24, direction: -1, isGrounded: false, health: 1, state: 'WALKING', stateTimer: 0 },
        { id: '33', type: 'ZOMBIE', x: 1500, y: 100, vx: -1.4, vy: 0, width: 24, height: 28, direction: -1, isGrounded: false, health: 1, state: 'WALKING', stateTimer: 0 },
        // Cloud illusion secret passage rewards at cols 54-55
        { id: 'sec_sky_c1', type: 'COIN', x: 54 * 32, y: 8 * 32, vx: 0, vy: 0, width: 24, height: 24, direction: 1, isGrounded: true, health: 1, state: 'STATIONARY', stateTimer: 0 },
        { id: 'sec_sky_c2', type: 'COIN', x: 55 * 32, y: 8 * 32, vx: 0, vy: 0, width: 24, height: 24, direction: 1, isGrounded: true, health: 1, state: 'STATIONARY', stateTimer: 0 }
      );
    } else if (selectedStage === '1-4') {
      // Ender Dragon fortress!
      g.actors.push(
        { id: '40', type: 'ZOMBIE', x: 300, y: 120, vx: -1.5, vy: 0, width: 24, height: 28, direction: -1, isGrounded: false, health: 1, state: 'WALKING', stateTimer: 0 },
        { id: '41', type: 'CREEPER', x: 650, y: 120, vx: 0, vy: 0, width: 24, height: 32, direction: -1, isGrounded: true, health: 1, state: 'STATIONARY', stateTimer: 0 },
        { id: '42', type: 'TURTLE', x: 950, y: 120, vx: -1.3, vy: 0, width: 24, height: 24, direction: -1, isGrounded: false, health: 1, state: 'WALKING', stateTimer: 0 }
      );

      // BOSS ENDER DRAGON activation area
      g.bossActive = true;
      g.bossHealth = 10;
      g.bossMaxHealth = 10;
      g.bossX = 150 * g.gridSize; // near column 150
      g.bossY = 4 * g.gridSize;
      g.bossVy = 1.5;
      g.bossDirection = -1;
      g.bossAttackTimer = 0;
    }

    // Pass first HUD refresh up info
    onScoreUpdate(g.score, g.coins, g.lives, g.marioForm, g.isStarActive);
    setInnerScore(0);
    setInnerCoins(0);
  };

  // Particle Emitter Helper
  const spawnParticles = (x: number, y: number, type: 'DEBRIS' | 'SHINE' | 'FIRE' | 'PORTAL' | 'EXPLOSION', color: string, count: number) => {
    const list = gameRef.current.particles;
    for (let i = 0; i < count; i++) {
      const vx = (Math.random() * 2 - 1) * (type === 'EXPLOSION' ? 3.5 : 1.8);
      const vy = (Math.random() * 2 - 1) * (type === 'EXPLOSION' ? 3.5 : 1.8) - (type === 'FIRE' ? 1.5 : 0);
      const size = Math.random() * (type === 'EXPLOSION' ? 6 : 4) + 2;
      const life = Math.random() * 15 + 15;
      list.push({
        x, y, vx, vy, size, life, maxLife: life, color, type
      });
    }
  };

  const enterSecretArea = () => {
    const g = gameRef.current;
    if (g.inSecretArea) return;

    // Save current status of main overworld
    g.secretSavedState = {
      blocks: [...g.blocks],
      actors: [...g.actors],
      playerX: g.player.x,
      playerY: g.player.y,
      cameraX: g.cameraX,
      worldCols: g.worldCols
    };

    audio.playSFX('POWER_UP');

    // Setup Secret Area Stage configurations
    g.inSecretArea = true;
    g.worldCols = 40; // Shorter boundary
    
    // Fill the Secret Subspace Map
    const bArray: Block[] = [];
    const rows = g.worldRows;
    const cols = g.worldCols;

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        let blockType: BlockType = 'AIR';
        let itemType: ActorType | undefined = undefined;

        // Shared boundaries
        if (c === 0 && r >= 3) blockType = 'BEDROCK';
        if (c === cols - 1 && r >= 3) blockType = 'BEDROCK';

        // Shared Standard Pipes
        // Entrance: column 4 & 5
        if (c === 4) {
          if (r === 11 || r === 12) blockType = 'PIPE_BODY_L';
          if (r === 10) blockType = 'PIPE_TOP_L';
        }
        if (c === 5) {
          if (r === 11 || r === 12) blockType = 'PIPE_BODY_R';
          if (r === 10) blockType = 'PIPE_TOP_R';
        }

        // Exit: column 34 & 35
        if (c === 34) {
          if (r === 11 || r === 12) blockType = 'PIPE_BODY_L';
          if (r === 10) blockType = 'PIPE_TOP_L';
        }
        if (c === 35) {
          if (r === 11 || r === 12) blockType = 'PIPE_BODY_R';
          if (r === 10) blockType = 'PIPE_TOP_R';
        }

        // STAGE-SPECIFIC DETAILED BLOCK DESIGN MAPS:
        if (stage === '1-1') {
          // Sunny Meadow: solid grass floor
          if (r >= 13) {
            blockType = 'GRASS';
          }
          // Bright bridges
          if (r === 8 && c >= 10 && c <= 28) {
            if (c % 4 === 0) {
              blockType = 'QUESTION_BLOCK';
              itemType = 'COIN';
            } else {
              blockType = 'BRICK';
            }
          }
          if (r === 5 && c >= 14 && c <= 24) {
            if (c % 3 === 0) {
              blockType = 'QUESTION_BLOCK';
              itemType = 'MUSHROOM';
            } else {
              blockType = 'BRICK';
            }
          }

        } else if (stage === '1-2') {
          // Amethyst Crystal Caves: solid stone floor, obsidian chunks
          if (r >= 13) {
            blockType = 'STONE';
          }
          // Breakable coal ores and glowing obsidian structures
          if (r === 8 && c >= 11 && c <= 27) {
            if (c === 15 || c === 23) {
              blockType = 'QUESTION_BLOCK';
              itemType = 'FLOWER';
            } else if (c % 2 === 1) {
              blockType = 'COAL_ORE';
            } else {
              blockType = 'BEDROCK';
            }
          }
          // Hidden safe-pocket cavity high up
          if (r === 4 && c >= 16 && c <= 22) {
            blockType = 'STONE';
          }

        } else if (stage === '1-3') {
          // Cloud Palace Sector: high altitude cloud platforms with large pit of nothingness
          // Only a small soft fallback deck at bottom
          if (r >= 13) {
            if (c >= 3 && c <= 8) blockType = 'BEDROCK';
            else if (c >= 31 && c <= 36) blockType = 'BEDROCK';
            else blockType = 'AIR'; // bottomless sky pit!
          }
          // Floating cloud bridges at heights
          if (r === 9 && c >= 9 && c <= 29) {
            if (c % 5 === 0) {
              blockType = 'QUESTION_BLOCK';
              itemType = 'STAR';
            } else {
              blockType = 'BRICK';
            }
          }
          // Ultra-high altitude coins bridge
          if (r === 5 && c >= 12 && c <= 26) {
            if (c % 2 === 0) {
              blockType = 'BRICK';
            }
          }

        } else if (stage === '1-4') {
          // Volcanic Magma Chamber: obsidian/netherrack base with hot magma pools
          if (r >= 13) {
            if (c >= 12 && c <= 26 && c % 4 !== 0) {
              blockType = 'LAVA';
            } else {
              blockType = 'OBSIDIAN';
            }
          }
          // High structures
          if (r === 8 && c >= 10 && c <= 28) {
            if (c % 4 === 0) {
              blockType = 'QUESTION_BLOCK';
              itemType = 'STAR';
            } else {
              blockType = 'OBSIDIAN';
            }
          }
          if (r === 5 && c >= 15 && c <= 23) {
            blockType = 'NETHERRACK';
          }
        }

        if (blockType !== 'AIR') {
          bArray.push({
            x: c,
            y: r,
            type: blockType,
            containsItem: itemType
          });
        }
      }
    }

    g.blocks = bArray;

    // Build specific rich collectibles and background actors for each secret stage
    let secActors: Actor[] = [];

    if (stage === '1-1') {
      secActors = [
        { id: 'sec_11_mush', type: 'MUSHROOM', x: 14 * 32, y: 7 * 32, vx: 0.8, vy: 0, width: 24, height: 24, direction: 1, isGrounded: true, health: 1, state: 'SPAWNING', stateTimer: 0 },
        // Simple floating gold coins
        { id: 'sc1_1', type: 'COIN', x: 10 * 32, y: 7 * 32, vx: 0, vy: 0, width: 24, height: 24, direction: 1, isGrounded: true, health: 1, state: 'STATIONARY', stateTimer: 0 },
        { id: 'sc1_2', type: 'COIN', x: 11 * 32, y: 7 * 32, vx: 0, vy: 0, width: 24, height: 24, direction: 1, isGrounded: true, health: 1, state: 'STATIONARY', stateTimer: 0 },
        { id: 'sc1_3', type: 'COIN', x: 12 * 32, y: 7 * 32, vx: 0, vy: 0, width: 24, height: 24, direction: 1, isGrounded: true, health: 1, state: 'STATIONARY', stateTimer: 0 },
        { id: 'sc1_4', type: 'COIN', x: 15 * 32, y: 4 * 32, vx: 0, vy: 0, width: 24, height: 24, direction: 1, isGrounded: true, health: 1, state: 'STATIONARY', stateTimer: 0 },
        { id: 'sc1_5', type: 'COIN', x: 17 * 32, y: 4 * 32, vx: 0, vy: 0, width: 24, height: 24, direction: 1, isGrounded: true, health: 1, state: 'STATIONARY', stateTimer: 0 },
        { id: 'sc1_6', type: 'COIN', x: 21 * 32, y: 4 * 32, vx: 0, vy: 0, width: 24, height: 24, direction: 1, isGrounded: true, health: 1, state: 'STATIONARY', stateTimer: 0 },
        { id: 'sc1_7', type: 'COIN', x: 23 * 32, y: 4 * 32, vx: 0, vy: 0, width: 24, height: 24, direction: 1, isGrounded: true, health: 1, state: 'STATIONARY', stateTimer: 0 },
        { id: 'sc1_8', type: 'COIN', x: 25 * 32, y: 7 * 32, vx: 0, vy: 0, width: 24, height: 24, direction: 1, isGrounded: true, health: 1, state: 'STATIONARY', stateTimer: 0 },
        { id: 'sc1_9', type: 'COIN', x: 27 * 32, y: 7 * 32, vx: 0, vy: 0, width: 24, height: 24, direction: 1, isGrounded: true, health: 1, state: 'STATIONARY', stateTimer: 0 }
      ];
    } else if (stage === '1-2') {
      secActors = [
        { id: 'sec_12_flw', type: 'FLOWER', x: 16 * 32, y: 7 * 32, vx: 0.0, vy: 0, width: 24, height: 24, direction: 1, isGrounded: true, health: 1, state: 'STATIONARY', stateTimer: 0 },
        // Slower moving turtle under crystals
        { id: 'sec_12_turt', type: 'TURTLE', x: 20 * 32, y: 7 * 32, vx: -0.6, vy: 0, width: 24, height: 24, direction: -1, isGrounded: true, health: 1, state: 'WALKING', stateTimer: 0 },
        // Rich high gold chest line
        { id: 'sc2_1', type: 'COIN', x: 17 * 32, y: 3 * 32, vx: 0, vy: 0, width: 24, height: 24, direction: 1, isGrounded: true, health: 1, state: 'STATIONARY', stateTimer: 0 },
        { id: 'sc2_2', type: 'COIN', x: 18 * 32, y: 3 * 32, vx: 0, vy: 0, width: 24, height: 24, direction: 1, isGrounded: true, health: 1, state: 'STATIONARY', stateTimer: 0 },
        { id: 'sc2_3', type: 'COIN', x: 19 * 32, y: 3 * 32, vx: 0, vy: 0, width: 24, height: 24, direction: 1, isGrounded: true, health: 1, state: 'STATIONARY', stateTimer: 0 },
        { id: 'sc2_4', type: 'COIN', x: 20 * 32, y: 3 * 32, vx: 0, vy: 0, width: 24, height: 24, direction: 1, isGrounded: true, health: 1, state: 'STATIONARY', stateTimer: 0 },
        { id: 'sc2_5', type: 'COIN', x: 21 * 32, y: 3 * 32, vx: 0, vy: 0, width: 24, height: 24, direction: 1, isGrounded: true, health: 1, state: 'STATIONARY', stateTimer: 0 },
        { id: 'sc3_1', type: 'COIN', x: 12 * 32, y: 7 * 32, vx: 0, vy: 0, width: 24, height: 24, direction: 1, isGrounded: true, health: 1, state: 'STATIONARY', stateTimer: 0 },
        { id: 'sc3_2', type: 'COIN', x: 26 * 32, y: 7 * 32, vx: 0, vy: 0, width: 24, height: 24, direction: 1, isGrounded: true, health: 1, state: 'STATIONARY', stateTimer: 0 }
      ];
    } else if (stage === '1-3') {
      secActors = [
        { id: 'sec_13_star', type: 'STAR', x: 18 * 32, y: 4 * 32, vx: 0.9, vy: -2, width: 24, height: 24, direction: 1, isGrounded: false, health: 1, state: 'SPAWNING', stateTimer: 0 },
        // Floating high-tension collectibles requiring timing and double jumping
        { id: 'sc3_v1', type: 'COIN', x: 12 * 32, y: 4 * 32, vx: 0, vy: 0, width: 24, height: 24, direction: 1, isGrounded: true, health: 1, state: 'STATIONARY', stateTimer: 0 },
        { id: 'sc3_v2', type: 'COIN', x: 14 * 32, y: 4 * 32, vx: 0, vy: 0, width: 24, height: 24, direction: 1, isGrounded: true, health: 1, state: 'STATIONARY', stateTimer: 0 },
        { id: 'sc3_v3', type: 'COIN', x: 16 * 32, y: 4 * 32, vx: 0, vy: 0, width: 24, height: 24, direction: 1, isGrounded: true, health: 1, state: 'STATIONARY', stateTimer: 0 },
        { id: 'sc3_v4', type: 'COIN', x: 22 * 32, y: 4 * 32, vx: 0, vy: 0, width: 24, height: 24, direction: 1, isGrounded: true, health: 1, state: 'STATIONARY', stateTimer: 0 },
        { id: 'sc3_v5', type: 'COIN', x: 24 * 32, y: 4 * 32, vx: 0, vy: 0, width: 24, height: 24, direction: 1, isGrounded: true, health: 1, state: 'STATIONARY', stateTimer: 0 },
        { id: 'sc3_v6', type: 'COIN', x: 26 * 32, y: 4 * 32, vx: 0, vy: 0, width: 24, height: 24, direction: 1, isGrounded: true, health: 1, state: 'STATIONARY', stateTimer: 0 },
        // High air clouds coins
        { id: 'sc3_h1', type: 'COIN', x: 13 * 32, y: 8 * 32, vx: 0, vy: 0, width: 24, height: 24, direction: 1, isGrounded: true, health: 1, state: 'STATIONARY', stateTimer: 0 },
        { id: 'sc3_h2', type: 'COIN', x: 19 * 32, y: 8 * 32, vx: 0, vy: 0, width: 24, height: 24, direction: 1, isGrounded: true, health: 1, state: 'STATIONARY', stateTimer: 0 },
        { id: 'sc3_h3', type: 'COIN', x: 25 * 32, y: 8 * 32, vx: 0, vy: 0, width: 24, height: 24, direction: 1, isGrounded: true, health: 1, state: 'STATIONARY', stateTimer: 0 }
      ];
    } else {
      // Stage 1-4: The Nether Lava vault (Max rewards, extreme risks)
      secActors = [
        { id: 'sec_14_mush', type: 'MUSHROOM', x: 16 * 32, y: 4 * 32, vx: 0.8, vy: 0, width: 24, height: 24, direction: 1, isGrounded: true, health: 1, state: 'SPAWNING', stateTimer: 0 },
        { id: 'sec_14_flw', type: 'FLOWER', x: 22 * 32, y: 4 * 32, vx: 0.0, vy: 0, width: 24, height: 24, direction: 1, isGrounded: true, health: 1, state: 'STATIONARY', stateTimer: 0 },
        // A sneaky active creeper guard
        { id: 'sec_14_crepe', type: 'CREEPER', x: 19 * 32, y: 12 * 32, vx: 0, vy: 0, width: 24, height: 24, direction: 1, isGrounded: true, health: 1, state: 'IDLE', stateTimer: 0 },
        // Multi gold rows crossing the dangerous hot springs
        { id: 'sc4_1', type: 'COIN', x: 13 * 32, y: 7 * 32, vx: 0, vy: 0, width: 24, height: 24, direction: 1, isGrounded: true, health: 1, state: 'STATIONARY', stateTimer: 0 },
        { id: 'sc4_2', type: 'COIN', x: 14 * 32, y: 7 * 32, vx: 0, vy: 0, width: 24, height: 24, direction: 1, isGrounded: true, health: 1, state: 'STATIONARY', stateTimer: 0 },
        { id: 'sc4_3', type: 'COIN', x: 15 * 32, y: 7 * 32, vx: 0, vy: 0, width: 24, height: 24, direction: 1, isGrounded: true, health: 1, state: 'STATIONARY', stateTimer: 0 },
        { id: 'sc4_4', type: 'COIN', x: 17 * 32, y: 7 * 32, vx: 0, vy: 0, width: 24, height: 24, direction: 1, isGrounded: true, health: 1, state: 'STATIONARY', stateTimer: 0 },
        { id: 'sc4_5', type: 'COIN', x: 23 * 32, y: 7 * 32, vx: 0, vy: 0, width: 24, height: 24, direction: 1, isGrounded: true, health: 1, state: 'STATIONARY', stateTimer: 0 },
        { id: 'sc4_6', type: 'COIN', x: 24 * 32, y: 7 * 32, vx: 0, vy: 0, width: 24, height: 24, direction: 1, isGrounded: true, health: 1, state: 'STATIONARY', stateTimer: 0 },
        { id: 'sc4_7', type: 'COIN', x: 25 * 32, y: 7 * 32, vx: 0, vy: 0, width: 24, height: 24, direction: 1, isGrounded: true, health: 1, state: 'STATIONARY', stateTimer: 0 }
      ];
    }

    g.actors = secActors;

    // Place the player neatly onto the entrance pipe
    g.player.x = 4.3 * 32;
    g.player.y = 8 * 32;
    g.player.vx = 0;
    g.player.vy = 0;
    g.cameraX = 0;

    spawnParticles(g.player.x + 14, g.player.y + 14, 'PORTAL', '#22c55e', 45);
  };

  const exitSecretArea = () => {
    const g = gameRef.current;
    if (!g.inSecretArea || !g.secretSavedState) return;

    // Retrieve and restore saved overworld setup state
    const saved = g.secretSavedState;
    g.blocks = saved.blocks;
    g.actors = saved.actors;
    g.worldCols = saved.worldCols;

    audio.playSFX('SPAWN');

    // Calculate downstream escape warp pipeline
    let targetX = saved.playerX + 16 * 32;
    let targetY = saved.playerY;

    if (stage === '1-1') {
      targetX = 68.3 * 32; // exit pipe column y=11
      targetY = 9 * 32;
    } else if (stage === '1-2') {
      targetX = 80.3 * 32; // exit pipe column y=10
      targetY = 8 * 32;
    } else if (stage === '1-3') {
      targetX = 60.3 * 32; // exit pipe column y=10
      targetY = 8 * 32;
    } else if (stage === '1-4') {
      targetX = 65.3 * 32; // exit pipe column y=10
      targetY = 8 * 32;
    }

    g.player.x = targetX;
    g.player.y = targetY;
    g.player.vx = 0;
    g.player.vy = -3.5; // Jump out elegantly
    g.cameraX = Math.max(0, targetX - 250);
    g.inSecretArea = false;
    g.secretSavedState = null;

    spawnParticles(g.player.x + 14, g.player.y + 14, 'SHINE', '#10b981', 45);
  };

  // main loops handler using standard Canvas Context
  useEffect(() => {
    let frameId: number;

    const gameLoop = () => {
      if (paused) {
        frameId = requestAnimationFrame(gameLoop);
        return;
      }

      updatePhysics();
      drawGame();

      frameId = requestAnimationFrame(gameLoop);
    };

    frameId = requestAnimationFrame(gameLoop);
    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [paused, stage]);

  // Collisions Helper (AABB block intersection resolver)
  const getBlockAtGrid = (col: number, row: number): Block | null => {
    const g = gameRef.current;
    if (col < 0 || col >= g.worldCols || row < 0 || row >= g.worldRows) return null;
    return g.blocks.find(b => b.x === col && b.y === row && !b.isBroken) || null;
  };

  // PHYSIC CALCULATIONS STEP
  const updatePhysics = () => {
    const g = gameRef.current;
    if (g.winSequence) {
      g.winSequenceTimer++;
      // Auto move right for happy dance flag sliding
      g.player.vx = 1.0;
      g.player.x += g.player.vx;
      g.player.vy = Math.min(3, g.player.vy + 0.3); // fall slowly
      g.player.y += g.player.vy;

      // Particle sparkles while celebrating
      if (g.winSequenceTimer % 3 === 0) {
        spawnParticles(g.player.x + 10, g.player.y + 10, 'SHINE', '#facc15', 2);
      }

      // Check if finished level flag walk
      if (g.winSequenceTimer > 120) {
        onVictory(g.score, g.coins);
      }
      return;
    }

    const p = g.player;

    // Star power-up ticking down
    if (g.isStarActive) {
      g.starTimer--;
      if (g.starTimer <= 0) {
        g.isStarActive = false;
        // Trigger music pitch update, reset to normal BGM
        audio.startMusic(stage);
        onScoreUpdate(g.score, g.coins, g.lives, g.marioForm, g.isStarActive);
      }
      // Glowing sparkles during run
      if (g.starTimer % 2 === 0) {
        const rainbowColors = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#ec4899'];
        const randomCol = rainbowColors[Math.floor(Math.random() * rainbowColors.length)];
        spawnParticles(p.x + Math.random() * p.width, p.y + Math.random() * p.height, 'SHINE', randomCol, 2);
      }
    }

    // Invisible timer flashing
    if (g.invincibleTimer > 0) {
      g.invincibleTimer--;
    }

    // Apply HORIZONTAL MOVEMENT & INERTIA
    const speed = g.marioForm === 'SMALL' ? 3.0 : 3.4;
    const accel = 0.22;
    const friction = 0.85;

    if (g.keys.left) {
      p.vx = Math.max(-speed, p.vx - accel);
      p.facing = -1;
      p.runAnimationTimer++;
    } else if (g.keys.right) {
      p.vx = Math.min(speed, p.vx + accel);
      p.facing = 1;
      p.runAnimationTimer++;
    } else {
      p.vx *= friction;
      if (Math.abs(p.vx) < 0.1) {
        p.vx = 0;
        p.runAnimationTimer = 0;
      }
    }

    // Horizontal collisions resolution
    p.x += p.vx;
    resolveCollisionsHorizontal();

    // Apply GRAVITY
    const gMultiplier = 0.32;
    p.vy = Math.min(9.8, p.vy + gMultiplier);
    p.y += p.vy;
    p.isGrounded = false;
    resolveCollisionsVertical();

    // Check warp pipelines (Green Channel secret hidden level entrance & exit)
    if (g.keys.down && p.isGrounded) {
      const gridX = Math.floor((p.x + p.width / 2) / g.gridSize);
      const gridY = Math.floor((p.y + p.height + 2) / g.gridSize);
      const blockStand = getBlockAtGrid(gridX, gridY);
      
      const isPipeBlock = blockStand && (
        blockStand.type === 'PIPE_TOP_L' || 
        blockStand.type === 'PIPE_TOP_R' || 
        blockStand.type === 'PIPE_BODY_L' || 
        blockStand.type === 'PIPE_BODY_R'
      );

      if (isPipeBlock) {
        if (g.inSecretArea) {
          if (gridX >= 32) {
            exitSecretArea();
          }
        } else {
          enterSecretArea();
        }
      }
    }

    // Check player bottomless pit death
    const deathY = g.worldRows * g.gridSize;
    if (p.y > deathY) {
      handlePlayerDeath();
      return;
    }

    // UPDATE DYNAMIC MONSTERS, FIREBALLS & ITEMS PATHS
    updateActors();
    updateFireballs();
    updateBouncingCoins();
    updateParticles();

    // SCROLL CAMERA ALONG WITH PLAYER SMOOTHLY
    const canvasWidth = canvasRef.current?.width || 800;
    const worldWidth = g.worldCols * g.gridSize;
    g.cameraX = Math.max(0, Math.min(worldWidth - canvasWidth, p.x - canvasWidth / 3.3));
  };

  // Helper check for core solid physical tiles, allowing bypass for secret passable block corridors
  const isBlockSolid = (block: Block): boolean => {
    // Walkthrough secret fake stones in Stage 1-2 Cave
    if (stage === '1-2') {
      if ((block.x === 72 || block.x === 73) && (block.y === 9 || block.y === 10)) {
        return false;
      }
    }
    // Walkthrough secret sky cloud in Stage 1-3
    if (stage === '1-3') {
      if ((block.x === 52 || block.x === 53) && (block.y === 8 || block.y === 9)) {
        return false;
      }
    }
    return isSolid(block.type);
  };

  // Check for hitting space from below to spawn a hidden lucky question block!
  const checkAndSpawnInvisibleBlock = (col: number, row: number): boolean => {
    const g = gameRef.current;
    if (g.inSecretArea) return false; // No invisible blocks inside secret rooms

    let match = false;
    let awardItem: ActorType = 'COIN';

    if (stage === '1-1') {
      // 1-1 invisible blocks
      if (col === 44 && row === 6) { match = true; awardItem = 'STAR';     } // High value hidden star!
      if (col === 112 && row === 6) { match = true; awardItem = 'COIN';    } // Hidden coin block!
    } else if (stage === '1-2') {
      // 1-2 invisible blocks
      if (col === 48 && row === 5) { match = true; awardItem = 'FLOWER';   } // Hidden cave fire power!
      if (col === 96 && row === 4) { match = true; awardItem = 'COIN';     } // Hidden mining coin block
    } else if (stage === '1-3') {
      // 1-3 invisible blocks
      if (col === 82 && row === 4) { match = true; awardItem = 'MUSHROOM'; } // High air hidden mushroom
      if (col === 115 && row === 4) { match = true; awardItem = 'STAR';    } // Sky runner star
    } else if (stage === '1-4') {
      // 1-4 invisible blocks
      if (col === 46 && row === 6) { match = true; awardItem = 'COIN';     } // Fiery shortcut block
      if (col === 92 && row === 5) { match = true; awardItem = 'FLOWER';   } // Extra dragon fire power!
    }

    if (match) {
      // Create a new QUESTION_BLOCK
      const newBlock: Block = {
        x: col,
        y: row,
        type: 'QUESTION_BLOCK',
        containsItem: awardItem,
        isRevealed: true
      };
      
      // Inject to blocks list so it becomes a solid tile instantly!
      g.blocks.push(newBlock);

      // Trigger the standard hit behavior
      handleBlockHit(newBlock);

      // Spawn portal blue-shine indicator particles
      spawnParticles(col * g.gridSize + 16, row * g.gridSize + 16, 'PORTAL', '#38bdf8', 20);
      return true;
    }

    return false;
  };

  // Horizontal Collision Solver
  const resolveCollisionsHorizontal = () => {
    const g = gameRef.current;
    const p = g.player;

    const leftCol = Math.floor(p.x / g.gridSize);
    const rightCol = Math.floor((p.x + p.width) / g.gridSize);
    const topRow = Math.floor(p.y / g.gridSize);
    const bottomRow = Math.floor((p.y + p.height - 1) / g.gridSize);

    // Left border wall
    if (p.x < 0) {
      p.x = 0;
      p.vx = 0;
    }

    for (let r = topRow; r <= bottomRow; r++) {
      // Left side collision
      const blockL = getBlockAtGrid(leftCol, r);
      if (blockL && isBlockSolid(blockL)) {
        p.x = (leftCol + 1) * g.gridSize;
        p.vx = 0;
      }
      // Right side collision
      const blockR = getBlockAtGrid(rightCol, r);
      if (blockR && isBlockSolid(blockR)) {
        p.x = rightCol * g.gridSize - p.width;
        p.vx = 0;
      }
    }
  };

  // Vertical Collision Solver (Blocks and platform lands)
  const resolveCollisionsVertical = () => {
    const g = gameRef.current;
    const p = g.player;

    const leftCol = Math.floor(p.x / g.gridSize);
    const rightCol = Math.floor((p.x + p.width - 1) / g.gridSize);
    const topRow = Math.floor(p.y / g.gridSize);
    const bottomRow = Math.floor((p.y + p.height) / g.gridSize);

    for (let c = leftCol; c <= rightCol; c++) {
      // Landing on block top
      const blockB = getBlockAtGrid(c, bottomRow);
      if (blockB && (isBlockSolid(blockB) || blockB.type === 'LAVA')) {
        // Lava causes injury or death
        if (blockB.type === 'LAVA') {
          handleHazardDamage();
          return;
        }

        p.y = bottomRow * g.gridSize - p.height;
        p.vy = 0;
        p.isGrounded = true;
        p.doubleJumpsUsed = 0; // reset double jump!
      }

      // Hitting block from below
      const blockT = getBlockAtGrid(c, topRow);
      if (blockT && isBlockSolid(blockT) && p.vy < 0) {
        // Bump coordinates
        p.y = (topRow + 1) * g.gridSize;
        p.vy = 0.5; // kick down speed
        handleBlockHit(blockT);
      } else if (!blockT && p.vy < 0) {
        // Check for hitting blank space underneath an invisible lucky block!
        const revealed = checkAndSpawnInvisibleBlock(c, topRow);
        if (revealed) {
          p.y = (topRow + 1) * g.gridSize;
          p.vy = 0.5; // bounce speed
        }
      }
    }
  };

  // Handle hitting a block from below
  const handleBlockHit = (block: Block) => {
    const g = gameRef.current;
    
    // Flag elements: bounce the block briefly
    if (block.type === 'QUESTION_BLOCK') {
      if (block.isHit) return; // Prevent double trigger during animation

      block.isHit = true;
      block.hitTimer = 10;

      // Infinite block for Ender Dragon boss arena to prevent softlocking!
      if (block.x === 141) {
        audio.playSFX('BLOCK_HIT');
        if (block.containsItem) {
          spawnItem(block.x, block.y - 1, block.containsItem);
        }
      } else {
        block.type = 'EMPTY_BLOCK'; // turns into cobblestone/bedrock style
        audio.playSFX('BLOCK_HIT');
        if (block.containsItem) {
          spawnItem(block.x, block.y - 1, block.containsItem);
        }
      }
    } else if (block.type === 'BRICK' || block.type === 'COAL_ORE') {
      if (g.marioForm !== 'SMALL') {
        // BREAK BLOCK!
        block.isBroken = true;
        audio.playSFX('BLOCK_BREAK');
        // broken block flying pixels!
        spawnParticles(block.x * g.gridSize + 16, block.y * g.gridSize + 16, 'DEBRIS', '#a16207', 8);
        g.score += 50;
        onScoreUpdate(g.score, g.coins, g.lives, g.marioForm, g.isStarActive);
      } else {
        // Small Mario can only bounce bricks
        block.isHit = true;
        block.hitTimer = 10;
        audio.playSFX('BLOCK_HIT');
      }
    }
  };

  // Spawns items out of brick/Lucky blocks
  const spawnItem = (col: number, row: number, type: ActorType) => {
    const g = gameRef.current;
    
    if (type === 'COIN') {
      // coins bounce directly and are collected instantly
      g.coins++;
      g.score += 200;
      audio.playSFX('COIN');
      g.bouncingCoins.push({
        x: col * g.gridSize + 8,
        y: row * g.gridSize + g.gridSize,
        vy: -4.5,
        life: 25
      });
      onScoreUpdate(g.score, g.coins, g.lives, g.marioForm, g.isStarActive);
    } else {
      // standard moving items (Mushrooms/flowers/stars) rise up
      audio.playSFX('SPAWN');
      g.actors.push({
        id: Math.random().toString(),
        type,
        x: col * g.gridSize + 4,
        y: row * g.gridSize,
        vx: type === 'FLOWER' ? 0 : 1.2, // flower is stationary
        vy: -2.0, // jump up effect on reveal
        width: 24,
        height: 24,
        direction: 1,
        isGrounded: false,
        health: 1,
        state: 'SPAWNING',
        stateTimer: 20
      });
    }
  };

  // UPDATE ENEMIES, ITEMS, POWERUPS MOVEMENTS
  const updateActors = () => {
    const g = gameRef.current;
    const p = g.player;

    g.actors = g.actors.filter((act) => {
      // Delete dead offscreen mobs
      if (act.y > g.worldRows * g.gridSize + 100) return false;

      // Special handling for boss fireballs to fly straight, check collision with player, and clear off-screen
      if (act.type === 'BOSS_FIRE') {
        act.x += act.vx;
        act.y += act.vy;

        // Draw magenta particle trail
        if (Math.random() < 0.4) {
          spawnParticles(act.x + 7, act.y + 7, 'FIRE', '#d946ef', 2);
        }

        // Damage player if colliding
        const isColliding = getIntersection(p, act);
        if (isColliding && !g.winSequence) {
          handleHazardDamage();
          return false; // destroy the fireball
        }

        // Keep or delete depending on screen bounds
        if (act.x < g.cameraX - 100 || act.x > g.cameraX + 1100 || act.y < -100 || act.y > g.worldRows * g.gridSize + 100) {
          return false;
        }
        return true;
      }

      // Spawning rise step
      if (act.state === 'SPAWNING') {
        act.y += act.vy;
        act.stateTimer--;
        if (act.stateTimer <= 0) {
          act.state = 'WALKING';
          act.vy = 0;
        }
        return true;
      }

      // GRAVITY on items/mobs (except static ones like flowers / stationary shells)
      if (act.type !== 'FLOWER' && act.type !== 'CREEPER') {
        act.vy = Math.min(8.0, act.vy + 0.3);
        act.y += act.vy;
        act.isGrounded = false;
        resolveActorVerticalCollision(act);
      }

      // Horizonal patrol movement
      if (act.type !== 'FLOWER' && act.state !== 'SHELL_STATIONARY') {
        // Slide or walk speed
        const currentVx = act.type === 'SHELL' || act.state === 'SHELL_SLIDING' ? act.direction * 5.2 : act.vx;
        act.x += currentVx;
        resolveActorHorizontalCollision(act, currentVx);
      }

      // CREEPER Proxmitiy Fuse Logic
      if (act.type === 'CREEPER') {
        const dx = Math.abs((p.x + p.width/2) - (act.x + act.width/2));
        const dy = Math.abs((p.y + p.height/2) - (act.y + act.height/2));
        
        if (dx < 70 && dy < 60) {
          // Player is close! Start ticking towards a blast!
          if (act.state !== 'EXPLODING') {
            act.state = 'EXPLODING';
            act.stateTimer = 45; // 45 frames fuse (approx 0.75 seconds)
          } else {
            act.stateTimer--;
            // Spark smoke trail particles
            if (act.stateTimer % 3 === 0) {
              spawnParticles(act.x + 12, act.y + 12, 'EXPLOSION', '#ffffff', 2);
            }
            if (act.stateTimer <= 0) {
              // EXPLODE CREEPER!
              audio.playSFX('EXPLODE');
              spawnParticles(act.x + 12, act.y + 12, 'EXPLOSION', '#22c55e', 24);
              
              // Damage radius
              const blastDx = Math.abs(p.x - act.x);
              const blastDy = Math.abs(p.y - act.y);
              if (blastDx < 75 && blastDy < 65) {
                handleHazardDamage();
              }
              // Kill creeper actor itself
              return false;
            }
          }
        } else {
          // Cool down if player escapes
          if (act.state === 'EXPLODING') {
            act.state = 'STATIONARY';
            act.stateTimer = 0;
          }
        }
      }

      // ENDER DRAGON BOSS PATTERNS (Phase 4)
      if (g.bossActive) {
        updateBossPattern();
      }

      // Player Collision Check against Actors!
      const isColliding = getIntersection(p, act);
      if (isColliding && !g.winSequence) {
        
        // IS IT AN ITEM (Mushroom, Flower, Star)?
        if (act.type === 'MUSHROOM') {
          g.marioForm = 'BIG';
          p.height = 36; // taller
          g.score += 1000;
          audio.playSFX('POWER_UP');
          onScoreUpdate(g.score, g.coins, g.lives, g.marioForm, g.isStarActive);
          spawnParticles(p.x + 10, p.y + 10, 'SHINE', '#ef4444', 12);
          return false; // delete mushroom
        }

        if (act.type === 'FLOWER') {
          g.marioForm = 'FIRE';
          p.height = 36;
          g.score += 1000;
          audio.playSFX('POWER_UP');
          onScoreUpdate(g.score, g.coins, g.lives, g.marioForm, g.isStarActive);
          spawnParticles(p.x + 10, p.y + 10, 'FIRE', '#f97316', 15);
          return false; // delete flower
        }

        if (act.type === 'STAR') {
          g.isStarActive = true;
          g.starTimer = 540; // 9 seconds
          g.score += 1000;
          audio.playSFX('POWER_UP');
          onScoreUpdate(g.score, g.coins, g.lives, g.marioForm, g.isStarActive);
          return false; // delete star
        }

        if (act.type === 'COIN') {
          g.coins += 1;
          g.score += 200;
          audio.playSFX('COIN');
          onScoreUpdate(g.score, g.coins, g.lives, g.marioForm, g.isStarActive);
          // Spawn nice sparkling gold particles
          spawnParticles(act.x + 12, act.y + 12, 'SHINE', '#ffd700', 10);
          return false; // delete coin from actors list
        }

        // IS IT AN ENEMY MOB?
        if (['ZOMBIE', 'TURTLE', 'SHELL', 'CREEPER'].includes(act.type)) {
          
          if (g.isStarActive) {
            // Instant vaporise enemy from Star power!
            audio.playSFX('STOMP');
            g.score += 200;
            onScoreUpdate(g.score, g.coins, g.lives, g.marioForm, g.isStarActive);
            spawnParticles(act.x + 12, act.y + 12, 'EXPLOSION', '#a855f7', 10);
            return false;
          }

          // Check if Mario is STOMPING from above
          const stompYThreshold = p.y + p.height - p.vy;
          const isStomping = p.vy > 0 && stompYThreshold <= act.y + 12;

          if (isStomping) {
            audio.playSFX('STOMP');
            p.vy = -5.0; // bounce back up
            g.score += 200;
            onScoreUpdate(g.score, g.coins, g.lives, g.marioForm, g.isStarActive);

            if (act.type === 'ZOMBIE') {
              // Zombie dies: breaks to block dust
              spawnParticles(act.x + 12, act.y + 12, 'DEBRIS', '#15803d', 10);
              return false;
            }

            if (act.type === 'TURTLE') {
              // Turtle collapses into custom stationary sea shell
              act.type = 'SHELL';
              act.state = 'SHELL_STATIONARY';
              act.vx = 0;
              act.height = 18;
              act.width = 18;
              act.y = act.y + 6; // adjust bottom scale
              return true;
            }

            if (act.type === 'SHELL') {
              if (act.state === 'SHELL_STATIONARY') {
                act.state = 'SHELL_SLIDING';
                act.direction = p.facing; // kick forward
                g.score += 100;
              } else {
                act.state = 'SHELL_STATIONARY';
                act.vx = 0;
              }
            }
          } else {
            // NOT STOMPING, MARIO TAKES DAMAGE!
            if (act.type === 'SHELL' && act.state === 'SHELL_STATIONARY') {
              // Just kick the shell gently if it is silent
              act.state = 'SHELL_SLIDING';
              act.direction = p.x < act.x ? 1 : -1;
              audio.playSFX('STOMP');
            } else {
              handleHazardDamage();
            }
          }
        }
      }

      // Shells sliding hits other enemies!
      if (act.type === 'SHELL' && act.state === 'SHELL_SLIDING') {
        g.actors.forEach((other) => {
          if (other.id !== act.id && getIntersection(act, other)) {
            // Smash other enemy!
            audio.playSFX('STOMP');
            spawnParticles(other.x + 12, other.y + 12, 'DEBRIS', '#ef4444', 8);
            other.y = 9999; // trigger deletion
          }
        });
      }

      return true;
    });

    // Handle end flag pole or end portal trigger
    const exitBlock = g.blocks.find(b => b.type === 'FLAG_POLE' || b.type === 'END_PORTAL');
    if (exitBlock) {
      const exitColPixels = exitBlock.x * g.gridSize;
      const dx = Math.abs((p.x + p.width/2) - (exitColPixels + 16));
      
      if (dx < 20 && p.y < 14 * g.gridSize) {
        // Trigger WIN SUCCESS sequence
        g.winSequence = true;
        g.winSequenceTimer = 0;
        audio.playSFX('WIN');
        onScoreUpdate(g.score + 2000, g.coins, g.lives, g.marioForm, g.isStarActive);
      }
    }
  };

  // Ender Dragon movement logic helper
  const updateBossPattern = () => {
    const g = gameRef.current;
    
    // Slow hovering up & down
    g.bossY += g.bossVy;
    if (g.bossY < 2 * g.gridSize || g.bossY > 7 * g.gridSize) {
      g.bossVy *= -1; // reverse hover
    }

    // Follow player horizontally but stay on the right side quarter
    const idealBossX = Math.max(145 * g.gridSize, Math.min(170 * g.gridSize, g.player.x + 350));
    g.bossX += (idealBossX - g.bossX) * 0.05; // smooth chase

    // Attack cooldown timers
    g.bossAttackTimer++;
    if (g.bossAttackTimer > 110) {
      g.bossAttackTimer = 0;
      // SPIT HEAVY LAVA FIREBALL directly at player!
      audio.playSFX('FIREBALL');
      const dx = g.player.x - g.bossX;
      const dy = g.player.y - g.bossY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      g.actors.push({
        id: Math.random().toString(),
        type: 'BOSS_FIRE' as ActorType,
        x: g.bossX,
        y: g.bossY + 20,
        vx: (dx / dist) * 4.5,
        vy: (dy / dist) * 4.5,
        width: 14,
        height: 14,
        direction: -1,
        isGrounded: false,
        health: 1,
        state: 'WALKING',
        stateTimer: 0
      });
      // Fire sparks
      spawnParticles(g.bossX, g.bossY + 20, 'FIRE', '#a21caf', 10);
    }

    // Is player bullet colliding with boss? Handled inside fireballs looping!
  };

  // Vertical Actor Solver against tiles
  const resolveActorVerticalCollision = (act: Actor) => {
    const g = gameRef.current;
    const colLeft = Math.floor(act.x / g.gridSize);
    const colRight = Math.floor((act.x + act.width) / g.gridSize);
    const colMid = Math.floor((act.x + act.width / 2) / g.gridSize);
    const rowBottom = Math.floor((act.y + act.height) / g.gridSize);

    // Solid landing check
    const blockB = getBlockAtGrid(colMid, rowBottom);
    if (blockB && isSolid(blockB.type)) {
      act.y = rowBottom * g.gridSize - act.height;
      act.vy = 0;
      act.isGrounded = true;
    }
  };

  // Horizontal Actor Solver against tiles and holes
  const resolveActorHorizontalCollision = (act: Actor, currentVx: number) => {
    const g = gameRef.current;
    const colCheck = currentVx > 0
      ? Math.floor((act.x + act.width) / g.gridSize)
      : Math.floor(act.x / g.gridSize);
    const rowMid = Math.floor((act.y + act.height / 2) / g.gridSize);

    const blockH = getBlockAtGrid(colCheck, rowMid);
    // patrol bounce back
    if (blockH && isSolid(blockH.type)) {
      act.vx *= -1;
      act.direction = act.direction === 1 ? -1 : 1;
      // adjust x spacing to prevent sticky glitching
      if (currentVx > 0) act.x = colCheck * g.gridSize - act.width - 2;
      else act.x = (colCheck + 1) * g.gridSize + 2;
    }

    // Turnaround on edge cliffs for smart patrols
    if (act.isGrounded && act.type !== 'SHELL') {
      const colEdgeCheck = act.direction === 1
        ? Math.floor((act.x + act.width + 4) / g.gridSize)
        : Math.floor((act.x - 4) / g.gridSize);
      const rowEdgeCheck = Math.floor((act.y + act.height + 4) / g.gridSize);
      
      const blockEdge = getBlockAtGrid(colEdgeCheck, rowEdgeCheck);
      if (!blockEdge || blockEdge.type === 'AIR') {
        act.vx *= -1;
        act.direction = act.direction === 1 ? -1 : 1;
      }
    }
  };

  // DAMAGE & RECOVERY LOGIC
  const handleHazardDamage = () => {
    const g = gameRef.current;
    
    // Star active makes us fully invincible
    if (g.isStarActive) return;

    // flashing damage immunity guard
    if (g.invincibleTimer > 0) return;

    if (g.marioForm === 'FIRE') {
      // shrink to big
      g.marioForm = 'BIG';
      g.player.height = 36;
      g.invincibleTimer = 90; // 1.5 seconds flash
      audio.playSFX('DAMAGE');
      onScoreUpdate(g.score, g.coins, g.lives, g.marioForm, g.isStarActive);
      spawnParticles(g.player.x + 10, g.player.y + 10, 'DEBRIS', '#ef4444', 8);
    } else if (g.marioForm === 'BIG') {
      // shrink to small
      g.marioForm = 'SMALL';
      g.player.height = 28;
      g.invincibleTimer = 90;
      audio.playSFX('DAMAGE');
      onScoreUpdate(g.score, g.coins, g.lives, g.marioForm, g.isStarActive);
      spawnParticles(g.player.x + 10, g.player.y + 10, 'DEBRIS', '#fbbf24', 8);
    } else {
      // Tiny Mario dies instantly
      handlePlayerDeath();
    }
  };

  // Sudden Pit falls or life counter depletion
  const handlePlayerDeath = () => {
    const g = gameRef.current;
    g.lives--;
    audio.playSFX('DAMAGE');
    audio.playSFX('DEATH');

    // Trigger parent visual updates
    onMinusLife();

    if (g.lives <= 0) {
      // GAME OVER SCREEN
      onGameOver(g.score, g.coins);
    } else {
      // Restart current level setup safely
      initLevel(stage);
    }
  };

  // UPDATE PLAYER FIREBALLS PHYSICS
  const updateFireballs = () => {
    const g = gameRef.current;
    
    g.fireballs = g.fireballs.filter((fb) => {
      fb.x += fb.vx;
      fb.vy = Math.min(6.0, fb.vy + 0.3); // gravity bouncyness
      fb.y += fb.vy;

      // collision with tiles to bounce
      const colCell = Math.floor(fb.x / g.gridSize);
      const rowCell = Math.floor(fb.y / g.gridSize);
      const rowBottom = Math.floor((fb.y + 8) / g.gridSize);

      const blockBottom = getBlockAtGrid(colCell, rowBottom);
      if (blockBottom && isSolid(blockBottom.type) && blockBottom.x !== 145) {
        fb.vy = -3.8; // bounce high!
        fb.y = rowBottom * g.gridSize - 9;
      }

      const blockSide = getBlockAtGrid(colCell, rowCell);
      if (blockSide && isSolid(blockSide.type) && blockSide.x !== 145) {
        // Explode fireball impact!
        spawnParticles(fb.x, fb.y, 'FIRE', '#f97316', 5);
        return false;
      }

      // Check collision against Enemies!
      let hitEnemy = false;
      g.actors.forEach((act) => {
        if (!hitEnemy && ['ZOMBIE', 'TURTLE', 'CREEPER'].includes(act.type)) {
          const dx = Math.abs(fb.x - act.x);
          const dy = Math.abs(fb.y - act.y);

          if (dx < act.width && dy < act.height) {
            hitEnemy = true;
            audio.playSFX('STOMP');
            g.score += 200;
            // disintegrate enemy
            spawnParticles(act.x + 12, act.y + 12, 'EXPLOSION', '#ca8a04', 12);
            act.y = 9999; // trigger removal
          }
        }
      });

      // Special Boss Hit detection for Ender Dragon
      if (g.bossActive && !hitEnemy) {
        const dx = Math.abs(fb.x - g.bossX - 32);
        const dy = Math.abs(fb.y - g.bossY - 24);

        if (dx < 48 && dy < 48) {
          hitEnemy = true;
          g.bossHealth--;
          audio.playSFX('BOSS_HIT');
          spawnParticles(fb.x, fb.y, 'EXPLOSION', '#a855f7', 15);
          
          if (g.bossHealth <= 0) {
            // DRAGON SLAIN! Huge scores + portal opens!
            g.bossActive = false;
            g.score += 10000;
            onScoreUpdate(g.score, g.coins, g.lives, g.marioForm, g.isStarActive);
            audio.playSFX('WIN');
            spawnParticles(g.bossX + 32, g.bossY + 24, 'EXPLOSION', '#ec4899', 50);
            
            // clear exit barrier blocks to open the End Portal!
            g.blocks = g.blocks.filter(b => b.x !== 145);
          }
        }
      }

      if (hitEnemy) return false;

      // Offscreen cleanup
      if (fb.x < g.cameraX || fb.x > g.cameraX + 900) return false;

      return true;
    });
  };

  // UPDATE COIN ANIMATIONS
  const updateBouncingCoins = () => {
    const g = gameRef.current;
    g.bouncingCoins = g.bouncingCoins.filter((coin) => {
      coin.y += coin.vy;
      coin.vy += 0.3; // coin gravity fall back
      coin.life--;
      return coin.life > 0;
    });
  };

  // UPDATE PARTICLE TAILS
  const updateParticles = () => {
    const g = gameRef.current;
    g.particles = g.particles.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      return p.life > 0;
    });
  };

  // Helper check for core solid physical tiles
  const isSolid = (type: BlockType): boolean => {
    return [
      'GRASS', 'DIRT', 'STONE', 'COAL_ORE', 'BRICK',
      'QUESTION_BLOCK', 'EMPTY_BLOCK', 'BEDROCK',
      'PIPE_TOP_L', 'PIPE_TOP_R', 'PIPE_BODY_L', 'PIPE_BODY_R',
      'OBSIDIAN', 'NETHERRACK'
    ].includes(type);
  };

  // Bounding boxes check
  const getIntersection = (r1: { x: number; y: number; width: number; height: number }, r2: { x: number; y: number; width: number; height: number }) => {
    return r1.x < r2.x + r2.width &&
           r1.x + r1.width > r2.x &&
           r1.y < r2.y + r2.height &&
           r1.y + r1.height > r2.y;
  };


  // =========================================================================
  // PIXELATED SHADED RENDERING ON 2D CANVAS HOOK
  // =========================================================================
  const drawGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const g = gameRef.current;
    const p = g.player;

    // Auto fit/set bounds
    const width = canvas.width;
    const height = canvas.height;

    // 1) BACKGROUND AMBIENT RENDERS
    if (g.inSecretArea) {
      if (stage === '1-1') {
        ctx.fillStyle = '#05180c'; // Emerald green backdrop
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#0d321c';
        for (let i = 0; i < 20; i++) {
          const cx = (i * 149) % (width + 100) - g.cameraX * 0.2;
          const cy = (i * 81) % height;
          ctx.fillRect(cx, cy, 32, 12);
        }
      } else if (stage === '1-2') {
        ctx.fillStyle = '#0c0714'; // Dark violet gem mine
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#1c122b';
        for (let i = 0; i < 20; i++) {
          const cx = (i * 149) % (width + 100) - g.cameraX * 0.2;
          const cy = (i * 81) % height;
          ctx.fillRect(cx, cy, 24, 24);
        }
      } else if (stage === '1-3') {
        ctx.fillStyle = '#061624'; // Cozy midnight cyan
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#0f2942';
        for (let i = 0; i < 20; i++) {
          const cx = (i * 149) % (width + 100) - g.cameraX * 0.2;
          const cy = (i * 81) % height;
          ctx.fillRect(cx, cy, 64, 16);
        }
      } else {
        ctx.fillStyle = '#210505'; // Lava dark red chamber
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#3a0c0c';
        for (let i = 0; i < 20; i++) {
          const cx = (i * 149) % (width + 100) - g.cameraX * 0.2;
          const cy = (i * 81) % height;
          ctx.fillRect(cx, cy, 40, 20);
        }
      }
    } else if (stage === '1-2') {
      // Underground Dark Cave
      ctx.fillStyle = '#101015';
      ctx.fillRect(0, 0, width, height);
      // Cave backing circular lines
      ctx.fillStyle = '#1a1a24';
      for (let i = 0; i < 50; i++) {
        const cx = (i * 123) % (width + 200) - g.cameraX * 0.3;
        const cy = (i * 97) % height;
        ctx.fillRect(cx, cy, 32, 16);
      }
    } else if (stage === '1-4') {
      // Nether Fortress Lava Chamber
      ctx.fillStyle = '#190a0a';
      ctx.fillRect(0, 0, width, height);
      // Obsidian pillars in back
      ctx.fillStyle = '#221526';
      for (let i = 0; i < 12; i++) {
        const colX = (i * 240) - g.cameraX * 0.2;
        ctx.fillRect(colX, 0, 48, height);
      }
    } else if (stage === '1-3') {
      // Sky blue heights
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(0, 0, width, height);
      // Clouds
      ctx.fillStyle = '#e0f2fe';
      for (let i = 0; i < 15; i++) {
        const cx = (i * 280) - g.cameraX * 0.45;
        const cy = (i * 85) % (height / 2);
        ctx.fillRect(cx, cy, 96, 24);
        ctx.fillRect(cx + 16, cy - 12, 64, 12);
      }
    } else {
      // Stage 1-1: Sunny grass clouds
      ctx.fillStyle = '#7299ff';
      ctx.fillRect(0, 0, width, height);

      // Distant pixel grass mountains
      ctx.fillStyle = '#86efac';
      for (let i = 0; i < 8; i++) {
        const mountX = (i * 350) - g.cameraX * 0.35;
        ctx.beginPath();
        ctx.moveTo(mountX, height);
        ctx.lineTo(mountX + 160, height - 120);
        ctx.lineTo(mountX + 320, height);
        ctx.fill();
      }

      // Voxel Sun
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(520 - g.cameraX * 0.1, 40, 48, 48);

      // Clouds
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 8; i++) {
        const cx = (i * 450) - g.cameraX * 0.5;
        const cy = 60 + (i * 40) % 80;
        ctx.fillRect(cx, cy, 110, 28);
        ctx.fillRect(cx + 20, cy - 12, 70, 16);
      }
    }

    // 2) TILE GRID DRAW (with Minecraft-inspired voxel bevel shading)
    ctx.save();
    ctx.translate(-g.cameraX, 0);

    const size = g.gridSize;

    g.blocks.forEach((block) => {
      if (block.isBroken) return;

      const bx = block.x * size;
      const by = block.y * size;

      // Filter off-screen blocks for performance
      if (bx + size < g.cameraX || bx > g.cameraX + width) return;

      // Hit bounce animation displacement
      let bOffset = 0;
      if (block.isHit && block.hitTimer) {
        block.hitTimer--;
        if (block.hitTimer > 5) bOffset = -(10 - block.hitTimer);
        else bOffset = -block.hitTimer;

        if (block.hitTimer <= 0) block.isHit = false;
      }

      // Draw Cube body based on texture type
      drawTexturedVoxelBlock(ctx, bx, by + bOffset, size, block.type);
    });

    // 3) COINS, PARTICLES, FIREBALLS
    // Floating coins
    ctx.fillStyle = '#fbbf24';
    g.bouncingCoins.forEach((coin) => {
      ctx.fillRect(coin.x, coin.y, 14, 14);
      // Gold frame line
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(coin.x + 2, coin.y + 2, 10, 10);
    });

    // Sparks and Debris particles
    g.particles.forEach((p) => {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });

    // Custom Red/Yellow Bouncing Fireballs
    g.fireballs.forEach((fb) => {
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(fb.x, fb.y, 8, 8);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(fb.x + 2, fb.y + 2, 4, 4);
    });

    // 4) ACTOR ENEMIES & ITEMS RENDERING
    g.actors.forEach((act) => {
      if (act.y > g.worldRows * size) return; // offscreen bottom boundary

      // ZOMBIE: Replaces Goomba
      if (act.type === 'ZOMBIE') {
        // Green skin head
        ctx.fillStyle = '#059669';
        ctx.fillRect(act.x + 4, act.y, 16, 14);
        ctx.fillStyle = '#000000'; // eyes/mouth
        ctx.fillRect(act.x + 7, act.y + 7, 2, 3);
        ctx.fillRect(act.x + 15, act.y + 7, 2, 3);

        // Blue Shirt
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(act.x, act.y + 14, act.width, 10);

        // Dark Pants
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(act.x + 4, act.y + 24, 16, 4);

        // Minecraft hands waving out
        ctx.fillStyle = '#059669';
        if (act.direction === 1) {
          ctx.fillRect(act.x + 20, act.y + 12, 6, 4);
        } else {
          ctx.fillRect(act.x - 2, act.y + 12, 6, 4);
        }
      }

      // TURTLE SHELL MONSTERS (REPLACES KOOPA SEA TURTLES)
      else if (act.type === 'TURTLE') {
        const frame = Math.floor(Date.now() / 150) % 2;

        // Shell body
        ctx.fillStyle = '#15803d';
        ctx.fillRect(act.x + 2, act.y + 6, act.width - 4, act.height - 6);
        ctx.strokeStyle = '#22c55e';
        ctx.strokeRect(act.x + 4, act.y + 8, act.width - 8, act.height - 10);

        // Yellow head
        ctx.fillStyle = '#facc15';
        if (act.direction === 1) {
          ctx.fillRect(act.x + 16, act.y, 8, 8);
          ctx.fillStyle = '#000';
          ctx.fillRect(act.x + 20, act.y + 2, 2, 2);
        } else {
          ctx.fillRect(act.x, act.y, 8, 8);
          ctx.fillStyle = '#000';
          ctx.fillRect(act.x + 2, act.y + 2, 2, 2);
        }

        // legs
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(act.x + 4 + (frame * 4), act.y + 20, 4, 4);
        ctx.fillRect(act.x + 14 - (frame * 4), act.y + 20, 4, 4);
      }

      // SHELL (STATIONARY OR SLIDING KICK BACK EVENT)
      else if (act.type === 'SHELL') {
        ctx.fillStyle = '#166534';
        ctx.fillRect(act.x, act.y, act.width, act.height);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(act.x + 2, act.y + 2, act.width - 4, act.height - 4);
        ctx.fillStyle = '#14532d';
        ctx.fillRect(act.x + 4, act.y + 4, 6, 6);
      }

      // CREEPER (HAZARD FUSE BOMBER REPLACES PIRANHA IN DRAWER)
      else if (act.type === 'CREEPER') {
        const isFusing = act.state === 'EXPLODING';
        // alternating white flash if exploding
        const flashTheme = isFusing && Math.floor(act.stateTimer / 4) % 2 === 0;

        ctx.fillStyle = flashTheme ? '#ffffff' : '#1fb34c';
        // green blocky torso
        ctx.fillRect(act.x + 5, act.y + 12, 14, 16);
        // tall green block head
        ctx.fillStyle = flashTheme ? '#ffffff' : '#15803d';
        ctx.fillRect(act.x + 3, act.y, 18, 12);

        // Creeper iconic dark pixel face
        ctx.fillStyle = '#000000';
        ctx.fillRect(act.x + 6, act.y + 3, 3, 3); // eye L
        ctx.fillRect(act.x + 15, act.y + 3, 3, 3); // eye R
        ctx.fillRect(act.x + 9, act.y + 6, 6, 5); // mouth core

        // feet
        ctx.fillStyle = '#166534';
        ctx.fillRect(act.x + 4, act.y + 28, 6, 4);
        ctx.fillRect(act.x + 14, act.y + 28, 6, 4);
      }

      // BOSS FIRE SPLASH DIRECT AT PLAYER
      else if (act.type === 'BOSS_FIRE') {
        ctx.fillStyle = '#701a75'; // dark ender dragon magenta
        ctx.fillRect(act.x, act.y, act.width, act.height);
        ctx.fillStyle = '#d946ef';
        ctx.fillRect(act.x + 3, act.y + 3, act.width - 6, act.height - 6);
      }

      // RED MUSHROOM UPGRADE
      else if (act.type === 'MUSHROOM') {
        // Red Cap
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(act.x, act.y, 24, 12);
        // white spots inside cap
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(act.x + 3, act.y + 3, 4, 4);
        ctx.fillRect(act.x + 16, act.y + 4, 4, 4);
        // stalk stems
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(act.x + 6, act.y + 12, 12, 12);
        ctx.fillStyle = '#000000'; // bead eyes
        ctx.fillRect(act.x + 8, act.y + 14, 2, 4);
        ctx.fillRect(act.x + 14, act.y + 14, 2, 4);
      }

      // POWER FIRE FLOWER
      else if (act.type === 'FLOWER') {
        // glowing fire stem
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(act.x + 10, act.y + 12, 4, 12);
        // circular flame petal
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(act.x + 4, act.y, 16, 12);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(act.x + 8, act.y + 3, 8, 6);
      }

      // STAR (INVINCIBILITY)
      else if (act.type === 'STAR') {
        const pulse = Math.floor(Date.now() / 100) % 2;
        ctx.fillStyle = pulse === 0 ? '#eab308' : '#fef08a';
        // draw voxel star shape
        ctx.fillRect(act.x + 8, act.y, 8, 24);
        ctx.fillRect(act.x, act.y + 8, 24, 8);
        ctx.fillRect(act.x + 4, act.y + 4, 16, 16);
      }

      // SPINNING GOLD COIN ACTOR (For secrets area)
      else if (act.type === 'COIN') {
        const spin = Math.floor(Date.now() / 150) % 3;
        ctx.fillStyle = '#facc15';
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 1.5;
        if (spin === 0) {
          ctx.fillRect(act.x + 5, act.y, 14, 24);
          ctx.strokeRect(act.x + 5, act.y, 14, 24);
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(act.x + 8, act.y + 4, 8, 16);
        } else if (spin === 1) {
          ctx.fillRect(act.x + 9, act.y, 6, 24);
          ctx.strokeRect(act.x + 9, act.y, 6, 24);
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(act.x + 11, act.y + 4, 2, 16);
        } else {
          ctx.fillRect(act.x + 2, act.y, 20, 24);
          ctx.strokeRect(act.x + 2, act.y, 20, 24);
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(act.x + 6, act.y + 4, 12, 16);
        }
      }

    });

    // 5) ENDER DRAGON BOSS HUGE MULTI-CUBE RENDER (Stage 1-4 End)
    if (g.bossActive) {
      drawEnderDragon(ctx, g.bossX, g.bossY, g.bossHealth, g.bossMaxHealth);
    }

    // 6) MARIO (PLAYER) DRAW (Steve Cubical Mashup)
    // Flashing effects for recovery / invincibility
    let displayPlayer = true;
    if (g.invincibleTimer > 0 && Math.floor(g.invincibleTimer / 3) % 2 === 0) {
      displayPlayer = false;
    }

    if (displayPlayer) {
      // Dynamic multicolor shimmer if star active
      let skinColor = '#fdba74';
      let overallTshirtColor = '#df3e3e';
      let overallPantsColor = '#1d4ed8';
      let hairCapColor = '#df3e3e';

      if (g.isStarActive) {
        const randSeed = Math.floor(Date.now() / 80) % 4;
        const colorPalette = [
          { s: '#fbbf24', t: '#ec4899', p: '#06b6d4', c: '#a855f7' },
          { s: '#f43f5e', t: '#10b981', p: '#f59e0b', c: '#ec4899' },
          { s: '#10b981', t: '#06b6d4', p: '#6366f1', c: '#22c55e' },
          { s: '#ec4899', t: '#eb5a3c', p: '#10b981', c: '#facc15' }
        ];
        skinColor = colorPalette[randSeed].s;
        overallTshirtColor = colorPalette[randSeed].t;
        overallPantsColor = colorPalette[randSeed].p;
        hairCapColor = colorPalette[randSeed].c;
      } else if (g.marioForm === 'FIRE') {
        // Fire Mario: White Cap and Suit with Red overalls
        skinColor = '#fdba74';
        hairCapColor = '#ffffff';
        overallTshirtColor = '#ffffff';
        overallPantsColor = '#df3e3e';
      }

      ctx.save();
      ctx.translate(p.x + p.width / 2, p.y + p.height / 2);
      if (p.facing === -1) {
        ctx.scale(-1, 1); // horizontal flip
      }

      // Height offsets depending on form size
      const pyScale = p.height;
      const pxScale = p.width;

      // Draw Voxel style Steve Mario Body
      // Head
      ctx.fillStyle = hairCapColor; // CAP TOP half
      ctx.fillRect(-8, -pyScale/2, 16, pyScale*0.25);
      
      ctx.fillStyle = skinColor; // Face block
      ctx.fillRect(-8, -pyScale/2 + pyScale*0.25, 14, pyScale*0.25);

      ctx.fillStyle = '#451a03'; // Brown Mustache block & pixel eyes
      ctx.fillRect(2, -pyScale/2 + pyScale*0.35, 4, pyScale*0.08); // eyes
      ctx.fillRect(0, -pyScale/2 + pyScale*0.42, 8, pyScale*0.08); // mustache

      // Chest Shirt Body
      ctx.fillStyle = overallTshirtColor;
      ctx.fillRect(-10, -pyScale/2 + pyScale*0.5, 20, pyScale*0.3);

      // Overalls Suspender Strap Pixels
      ctx.fillStyle = overallPantsColor;
      ctx.fillRect(-6, -pyScale/2 + pyScale*0.5, 4, pyScale*0.3);
      ctx.fillRect(2, -pyScale/2 + pyScale*0.5, 4, pyScale*0.3);

      // Pants bottom
      ctx.fillRect(-10, -pyScale/2 + pyScale*0.8, 20, pyScale*0.2);

      // Feet (Steve Shoes)
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-11, pyScale/2 - 4, 8, 4);
      ctx.fillRect(3, pyScale/2 - 4, 8, 4);

      // Jumping arm/hand offsets
      ctx.fillStyle = overallTshirtColor;
      if (!p.isGrounded) {
        ctx.fillRect(-14, -pyScale/2 + pyScale*0.3, 6, pyScale*0.22); // Arm raised high
      } else if (p.vx !== 0) {
        // running arm sway
        const runningSway = Math.sin(Date.now() / 90) * 8;
        ctx.fillRect(-14, -pyScale/2 + pyScale*0.5 + (runningSway/2), 5, pyScale*0.2);
      } else {
        ctx.fillRect(-14, -pyScale/2 + pyScale*0.5, 5, pyScale*0.2);
      }

      ctx.restore();
    }

    ctx.restore(); // reset camera translations

    // Draw Screen-persistent Screen HUD / overlays
    if (g.inSecretArea) {
      ctx.save();
      let overlayTitle = '⚡ SECRET MEADOWS / 绿色草场';
      let boxColor = 'rgba(9, 79, 31, 0.85)';
      let borderColor = '#10b981';
      let textColor = '#34d399';

      if (stage === '1-2') {
        overlayTitle = '💜 AMETHYST GEODE CAVE / 紫晶矿洞';
        boxColor = 'rgba(38, 16, 59, 0.85)';
        borderColor = '#a855f7';
        textColor = '#d8b4fe';
      } else if (stage === '1-3') {
        overlayTitle = '☁️ CLOUD PALACE vault / 云顶浮阁';
        boxColor = 'rgba(12, 45, 62, 0.85)';
        borderColor = '#0ea5e9';
        textColor = '#7dd3fc';
      } else if (stage === '1-4') {
        overlayTitle = '🔥 NETHER VOLCANIC VAULT / 熔岩秘穴';
        boxColor = 'rgba(61, 10, 10, 0.85)';
        borderColor = '#f43f5e';
        textColor = '#fca5a5';
      }

      ctx.fillStyle = boxColor;
      ctx.fillRect(16, 16, 260, 26);
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(16, 16, 260, 26);

      ctx.fillStyle = textColor;
      ctx.font = '10px "JetBrains Mono", var(--font-mono), monospace';
      ctx.fillText(overlayTitle, 26, 32);
      ctx.restore();
    }
  };

  // Dedicated draw engine for large Minecraft blocky Ender Dragon
  const drawEnderDragon = (
    ctx: CanvasRenderingContext2D,
    bx: number,
    by: number,
    health: number,
    maxHealth: number
  ) => {
    // Large square Body (Black)
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(bx, by + 12, 64, 48);
    ctx.strokeStyle = '#44403c';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(bx, by + 12, 64, 48);

    // Giant block head facing left
    ctx.fillStyle = '#111116';
    ctx.fillRect(bx - 24, by + 4, 28, 28);
    ctx.strokeStyle = '#52525b';
    ctx.strokeRect(bx - 24, by + 4, 28, 28);

    // Glowing Purple Dragon Eyes (Ender themes)
    ctx.fillStyle = '#c026d3';
    ctx.fillRect(bx - 18, by + 12, 5, 4);
    ctx.fillStyle = '#f5d0fe';
    ctx.fillRect(bx - 16, by + 13, 2, 2);

    // Tail block spikes
    ctx.fillStyle = '#3f3f46';
    ctx.fillRect(bx + 64, by + 20, 16, 16);
    ctx.fillRect(bx + 80, by + 24, 12, 12);

    // Large flapping Obsidian block wings
    const flap = Math.sin(Date.now() / 150) * 20;
    ctx.fillStyle = '#1e1b4b'; // deep navy/purple
    ctx.fillRect(bx + 16, by - 12 + flap, 32, 24);
    ctx.fillRect(bx + 24, by - 24 + flap, 16, 12);

    // HP Bar Overlay
    const barWidth = 100;
    const hpPercent = health / maxHealth;
    ctx.fillStyle = '#444';
    ctx.fillRect(bx - 16, by - 20, barWidth, 6);
    ctx.fillStyle = '#ec4899'; // magenta health
    ctx.fillRect(bx - 16, by - 20, barWidth * hpPercent, 6);
    
    // Tiny Boss tag
    ctx.fillStyle = '#ffffff';
    ctx.font = '7px var(--font-retro)';
    ctx.fillText('ENDER DRAGON BOSS', bx - 14, by - 24);
  };

  // Helper voxel block texture builders (No raw color squares, authentic shading!)
  const drawTexturedVoxelBlock = (ctx: CanvasRenderingContext2D, bx: number, by: number, size: number, type: BlockType) => {
    ctx.save();

    // Base Color Mapping
    let primaryColor = '#78716c';
    let shadowedColor = '#44403c';
    let highlightColor = '#a8a29e';
    let textureDrawStyle: 'GRASS_STEM' | 'DIRT_GRID' | 'STONE_CRACK' | 'COAL' | 'BRICK_LINES' | 'LUCKY_OR_GOLD' | 'EMPTY_COBBLE' | 'PIPE' | 'OBSIDIAN_NETHER' | 'NONE' = 'NONE';

    switch (type) {
      case 'GRASS':
        primaryColor = '#795548'; // dirt bottom half from design
        shadowedColor = '#5d4037'; // dark soil
        highlightColor = '#8d6e63'; // medium soil
        textureDrawStyle = 'GRASS_STEM';
        break;
      case 'DIRT':
        primaryColor = '#795548'; // dirt/soil
        shadowedColor = '#5d4037';
        highlightColor = '#8d6e63';
        textureDrawStyle = 'DIRT_GRID';
        break;
      case 'STONE':
        primaryColor = '#57534e';
        shadowedColor = '#292524';
        highlightColor = '#78716c';
        textureDrawStyle = 'STONE_CRACK';
        break;
      case 'COAL_ORE':
        primaryColor = '#44403c';
        shadowedColor = '#1c1917';
        highlightColor = '#57534e';
        textureDrawStyle = 'COAL';
        break;
      case 'BRICK':
        primaryColor = '#7c3a23'; // clay bricks from spec
        shadowedColor = '#522517';
        highlightColor = '#a0522d';
        textureDrawStyle = 'BRICK_LINES';
        break;
      case 'QUESTION_BLOCK':
        primaryColor = '#ffc107'; // bright questioning amber cube
        shadowedColor = '#bf9106';
        highlightColor = '#ffd54f';
        textureDrawStyle = 'LUCKY_OR_GOLD';
        break;
      case 'EMPTY_BLOCK':
        primaryColor = '#4b5563'; // gray cobble bedrock
        shadowedColor = '#1f2937';
        highlightColor = '#9ca3af';
        textureDrawStyle = 'EMPTY_COBBLE';
        break;
      case 'BEDROCK':
        primaryColor = '#1e293b';
        shadowedColor = '#0f172a';
        highlightColor = '#3b82f6';
        textureDrawStyle = 'EMPTY_COBBLE';
        break;
      case 'PIPE_TOP_L':
      case 'PIPE_TOP_R':
      case 'PIPE_BODY_L':
      case 'PIPE_BODY_R':
        primaryColor = '#2d8d2d'; // toxic dark green pipe from design
        shadowedColor = '#1a5d1a';
        highlightColor = '#1f6e1f';
        textureDrawStyle = 'PIPE';
        break;
      case 'OBSIDIAN':
        primaryColor = '#3b0764'; // dark void obsidian
        shadowedColor = '#1e1b4b';
        highlightColor = '#581c87';
        textureDrawStyle = 'OBSIDIAN_NETHER';
        break;
      case 'NETHERRACK':
        primaryColor = '#7f1d1d'; // bloody red netherrack
        shadowedColor = '#450a0a';
        highlightColor = '#991b1b';
        textureDrawStyle = 'OBSIDIAN_NETHER';
        break;
      case 'LAVA':
        primaryColor = '#ea580c';
        shadowedColor = '#c2410c';
        highlightColor = '#f97316';
        break;
      case 'FLAG_POLE':
        primaryColor = '#737373';
        shadowedColor = '#404040';
        highlightColor = '#a3a3a3';
        break;
      case 'FLAG':
        primaryColor = '#ef4444';
        shadowedColor = '#991b1b';
        highlightColor = '#f56565';
        break;
      case 'END_PORTAL':
        primaryColor = '#a21caf';
        shadowedColor = '#4a044e';
        highlightColor = '#d946ef';
        break;
    }

    // DRAW BASE CUBE
    ctx.fillStyle = primaryColor;
    ctx.fillRect(bx, by, size, size);

    // Beveled side shadows/lighting
    ctx.fillStyle = shadowedColor;
    ctx.fillRect(bx, by + size - 4, size, 4); // bottom shadow bevel
    ctx.fillRect(bx + size - 4, by, 4, size); // right side shadow

    ctx.fillStyle = highlightColor;
    ctx.fillRect(bx, by, size, 4); // top glow
    ctx.fillRect(bx, by, 4, size); // left glow

    // CUSTOM TEXTURE DETAILS INSIDE BLOCKS (Minecraft Pixels)
    if (textureDrawStyle === 'GRASS_STEM') {
      // Grass canopy top lid has a bright pixel-green Minecraft block lid!
      ctx.fillStyle = '#49a031';
      ctx.fillRect(bx, by, size, 9);
      ctx.fillStyle = '#3e8a2a';
      ctx.fillRect(bx, by + 9, size, 2); // dark transition lines

      // Voxel Grass stems hanging down
      ctx.fillStyle = '#1e5a14';
      ctx.fillRect(bx + 4, by + 9, 3, 4);
      ctx.fillRect(bx + 16, by + 9, 4, 3);
      ctx.fillRect(bx + 26, by + 9, 3, 5);
    } else if (textureDrawStyle === 'DIRT_GRID') {
      // dark specks
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(bx + 6, by + 8, 3, 3);
      ctx.fillRect(bx + 18, by + 22, 3, 3);
      ctx.fillRect(bx + 24, by + 12, 4, 4);
    } else if (textureDrawStyle === 'STONE_CRACK') {
      // Gray cobblestone cracks
      ctx.fillStyle = '#292524';
      ctx.fillRect(bx + 2, by + 8, 14, 2);
      ctx.fillRect(bx + 12, by + 10, 2, 8);
      ctx.fillRect(bx + 14, by + 18, 14, 2);
    } else if (textureDrawStyle === 'COAL') {
      // Dark energy ores scattered inside
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(bx + 4, by + 4, 6, 6);
      ctx.fillRect(bx + 18, by + 16, 8, 6);
      ctx.fillRect(bx + 8, by + 22, 4, 5);
    } else if (textureDrawStyle === 'BRICK_LINES') {
      // Clay lines
      ctx.fillStyle = '#522517';
      ctx.fillRect(bx, by + 10, size, 2);
      ctx.fillRect(bx, by + 20, size, 2);
      ctx.fillRect(bx + 10, by, 2, 10);
      ctx.fillRect(bx + 22, by + 10, 2, 10);
      ctx.fillRect(bx + 14, by + 20, 2, 10);
    } else if (textureDrawStyle === 'LUCKY_OR_GOLD') {
      // Question mark drawn in squares
      ctx.fillStyle = '#78350f'; // deep amber contrast
      // dot
      ctx.fillRect(bx + 14, by + 22, 4, 4);
      // stem & hook
      ctx.fillRect(bx + 14, by + 14, 4, 4);
      ctx.fillRect(bx + 14, by + 8, 10, 4);
      ctx.fillRect(bx + 20, by + 12, 4, 3);
      ctx.fillRect(bx + 8, by + 8, 8, 4);

      // tiny corners studs
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(bx + 3, by + 3, 3, 3);
      ctx.fillRect(bx + size - 6, by + 3, 3, 3);
      ctx.fillRect(bx + 3, by + size - 6, 3, 3);
      ctx.fillRect(bx + size - 6, by + size - 6, 3, 3);
    } else if (textureDrawStyle === 'EMPTY_COBBLE') {
      ctx.fillStyle = '#111827';
      ctx.fillRect(bx + 4, by + 4, 4, 4);
      ctx.fillRect(bx + 20, by + 20, 5, 5);
      ctx.fillRect(bx + 12, by + 14, 4, 4);
    } else if (textureDrawStyle === 'PIPE') {
      // Pipe metallic glare lines
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(bx + 4, by, 4, size);
      ctx.fillStyle = '#14532d';
      ctx.fillRect(bx + size - 8, by, 4, size);
    } else if (textureDrawStyle === 'OBSIDIAN_NETHER') {
      // Purple Nether portal residue
      ctx.fillStyle = '#581c87';
      ctx.fillRect(bx + 6, by + 6, 2, 2);
      ctx.fillRect(bx + 20, by + 18, 3, 3);
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(bx + 14, by + 10, 3, 3);
    }

    ctx.restore();
  };

  // Trigger from parents or touch joystick
  useEffect(() => {
    // Expose keys handler of current turn if active
    (window as any).marioControlsTrigger = handleTouchAction;
    return () => {
      delete (window as any).marioControlsTrigger;
    };
  }, [paused]);

  return (
    <div className="relative border-4 border-[#3a3b45] bg-[#0c0d12] shadow-[8px_8px_0px_#000]">
      {/* High precision retro HTML5 Screen canvas */}
      <canvas
        ref={canvasRef}
        width={768}
        height={480}
        className="block max-w-full h-auto mx-auto image-render-pixelated bg-[#bae6fd]"
        style={{ imageRendering: 'pixelated' }}
        id="game_viewport_canvas"
      />
    </div>
  );
}
