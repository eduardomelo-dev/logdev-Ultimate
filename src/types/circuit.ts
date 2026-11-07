export type LogicValue = '0' | '1' | 'Z' | 'X';
export type BitVector = LogicValue[];

export type GateType = 
  | 'AND' 
  | 'OR' 
  | 'NOT' 
  | 'NAND' 
  | 'NOR' 
  | 'XOR' 
  | 'XNOR' 
  | 'BUFFER' 
  | 'TRISTATE';

export type ComponentCategory = 'wiring' | 'gates' | 'plexers' | 'memory' | 'io';

export type ComponentType = 
  | GateType
  | 'PIN_INPUT'
  | 'PIN_OUTPUT'
  | 'CLOCK'
  | 'CONSTANT'
  | 'PROBE'
  | 'SPLITTER'
  | 'MULTIPLEXER'
  | 'DEMULTIPLEXER'
  | 'D_FLIP_FLOP'
  | 'REGISTER'
  | 'BUTTON'
  | 'SWITCH'
  | 'LED'
  | 'SEVEN_SEGMENT'
  | 'HEX_DISPLAY';

export type Direction = 'NORTH' | 'EAST' | 'SOUTH' | 'WEST';

export interface Port {
  id: string;
  name: string;
  type: 'in' | 'out' | 'inout';
  bitWidth: number;
  relX: number; // relative to component x
  relY: number; // relative to component y
}

export interface ComponentInstance {
  id: string;
  type: ComponentType;
  x: number;
  y: number;
  direction?: Direction;
  label?: string;
  bitWidth?: number;
  inputs?: number;
  state?: Record<string, any>; // e.g. internal value, memory cell, toggle state
}

export interface Point {
  x: number;
  y: number;
}

export interface WireEndpoint {
  componentId: string;
  portId: string;
}

export interface Wire {
  id: string;
  from: WireEndpoint;
  to: WireEndpoint;
  points: Point[];
  bitWidth?: number;
}

export interface CircuitState {
  components: ComponentInstance[];
  wires: Wire[];
}
