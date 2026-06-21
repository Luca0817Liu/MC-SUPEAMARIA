/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GameState = 'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'VICTORY';

export type StageName = '1-1' | '1-2' | '1-3' | '1-4';

export type MarioForm = 'SMALL' | 'BIG' | 'FIRE';

export type ActorType =
  | 'ZOMBIE'       // Replaces Goomba: standard walking mob
  | 'TURTLE'       // Replaces Koopa: walks, retreats to shell: can be kicked
  | 'SHELL'        // Replaces Koopa Shell: sliding shell
  | 'CREEPER'      // Replaces Piranha Plant: stationary/popping hazard that explodes if close!
  | 'BOSS'         // Ender Dragon - 1-4 BOSS
  | 'MUSHROOM'     // Minecraft Red Mushroom item
  | 'STAR'         // Minecraft Star key item
  | 'FLOWER'       // Fire Flower replacement (Minecraft Fire Rose/Core)
  | 'COIN'         // Minecraft Gold Coin block / bouncing coin
  | 'FIREBALL'     // Fireballs thrown by fire state
  | 'BOSS_FIRE';   // Fire balls shot by the Ender Dragon

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  type: 'DEBRIS' | 'SHINE' | 'FIRE' | 'PORTAL' | 'EXPLOSION';
}

export interface BouncingCoin {
  x: number;
  y: number;
  vy: number;
  life: number;
}

export interface Actor {
  id: string;
  type: ActorType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  direction: 1 | -1;
  isGrounded: boolean;
  health: number; // For Boss or general hitpoints
  state: string;  // e.g. 'WALKING', 'SHELL_STATIONARY', 'SHELL_SLIDING', 'EXPLODING', 'CHARGING'
  stateTimer: number; // Timer for specific states (like Creeper exploding)
  deathTimer?: number; // Visual spin-out or squash timer before removal
  isInvulnerable?: boolean;
}

export interface Block {
  x: number; // Grid column index
  y: number; // Grid row index
  type: BlockType;
  containsItem?: ActorType; // MUSHROOM, FLOWER, STAR, COIN
  coinCount?: number;     // For multi-coin blocks
  isHit?: boolean;        // Visual bounce flag
  hitTimer?: number;      // Animation timer for bounce
  isBroken?: boolean;     // For brick blocks after Mario breaks them
  isRevealed?: boolean;   // For hidden blocks
}

export type BlockType =
  | 'AIR'
  | 'GRASS'          // Green topped MC block
  | 'DIRT'           // Dirt block
  | 'STONE'          // Cave Stone block
  | 'COAL_ORE'       // Brick replacement in underground
  | 'BRICK'          // Classic smashable brick
  | 'QUESTION_BLOCK' // Block that spawns items (looks like MC Lucky Block / Gold Question block)
  | 'EMPTY_BLOCK'    // Already hit block (looks like MC cobblestone or bed-rock)
  | 'BEDROCK'        // Unbreakable obstacle
  | 'PIPE_TOP_L'     // Pipe left side top
  | 'PIPE_TOP_R'     // Pipe right side top
  | 'PIPE_BODY_L'    // Pipe body left side
  | 'PIPE_BODY_R'    // Pipe body right side
  | 'OBSIDIAN'       // Castle block (1-4 Nether theme)
  | 'NETHERRACK'     // Nether castle brick
  | 'LAVA'           // Danger block (castle hazard)
  | 'FLAG_POLE'      // Minecraft fence post as flagpole
  | 'FLAG'           // Minecraft flag graphic
  | 'END_PORTAL';    // Portal block at level end

export interface GameSettings {
  gravity: number;
  playerSpeed: number;
  playerJumpForce: number;
  gridSize: number; // pixel width/height of standard grid cell (e.g. 32 or 48)
  canvasWidth: number;
  canvasHeight: number;
}

export interface ControlKeys {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  fire: boolean;
  pause: boolean;
}
