export type Position = { x: number; y: number };
export type Direction = 'up' | 'down' | 'left' | 'right' | 'stay';

export type AgentConfig = {
  id: string;
  name: string;
  color: string;
  emoji: string;
};

export type AgentState = {
  id: string;
  name: string;
  color: string;
  emoji: string;
  pos: Position;
  health: number;
  score: number;
  alive: boolean;
  kills: number;
};

export type Resource = {
  id: string;
  pos: Position;
  value: number;
  type: 'coin' | 'gem' | 'power';
};

export type GameConfig = {
  width: number;
  height: number;
  maxTurns: number;
  resourceCount: number;
  seed?: number;
};

export type MoveAction = {
  type: 'move';
  agentId: string;
  dir: Direction;
};

export type GameEvent = {
  turn: number;
  type: 'move' | 'collect' | 'attack' | 'death' | 'spawn';
  agentId?: string;
  targetId?: string;
  pos?: Position;
  value?: number;
  message: string;
};

export type GameState = {
  config: GameConfig;
  turn: number;
  agents: AgentState[];
  resources: Resource[];
  events: GameEvent[];
  history: GameStateSnapshot[];
  winnerId?: string;
  isOver: boolean;
  seed: number;
};

export type GameStateSnapshot = {
  turn: number;
  agents: AgentState[];
  resources: Resource[];
  events: GameEvent[];
};

export type AgentAction = {
  agentId: string;
  dir: Direction;
};

export interface AgentStrategy {
  id: string;
  name: string;
  description: string;
  color: string;
  emoji: string;
  decide: (state: GameState, agentId: string) => Direction;
}
