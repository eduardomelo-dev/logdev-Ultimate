/**
 * logdev-Ultimate - Core Circuit Types & Digital Logic Definitions
 */

/**
 * 4-state logic value standard:
 * - '0': Low / False (0V / Terra)
 * - '1': High / True (VCC / 5V)
 * - 'Z': High Impedance / Tri-State / Floating (Desconectado)
 * - 'X': Contention / Conflict / Unknown Error (Curto-circuito ou erro de barramento)
 */
export type LogicValue = '0' | '1' | 'Z' | 'X';

/**
 * Vector of discrete logic values representing a multi-bit electrical bus (1 a 32 bits).
 */
export type BitVector = LogicValue[];

/**
 * Standard combinational logic gate types supported by the simulation engine.
 */
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

/**
 * Categorization used in the component library palette.
 */
export type ComponentCategory = 'wiring' | 'gates' | 'plexers' | 'memory' | 'io';

/**
 * Comprehensive list of supported digital circuit primitives.
 */
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

/**
 * Cardinal orientation for component placement and rendering on the canvas.
 */
export type Direction = 'NORTH' | 'EAST' | 'SOUTH' | 'WEST';

/**
 * Electrical connection port on a component instance.
 */
export interface Port {
  /** Unique identifier for the port within its component (e.g. 'in0', 'out', 'clk') */
  id: string;
  /** Human-readable display label */
  name: string;
  /** Directionality of the port: input ('in'), output ('out') or bidirectional ('inout') */
  type: 'in' | 'out' | 'inout';
  /** Electrical width of the signal in bits (1-32) */
  bitWidth: number;
  /** Coordinate X offset relative to component origin */
  relX: number;
  /** Coordinate Y offset relative to component origin */
  relY: number;
}

/**
 * Individual instance of a component placed on the schematic canvas.
 */
export interface ComponentInstance {
  /** Unique identifier */
  id: string;
  /** Digital component type */
  type: ComponentType;
  /** Canvas X coordinate snapped to grid */
  x: number;
  /** Canvas Y coordinate snapped to grid */
  y: number;
  /** Visual orientation */
  direction?: Direction;
  /** User-defined text label */
  label?: string;
  /** Bus width (for pins, registers, constants) */
  bitWidth?: number;
  /** Number of inputs (for multi-input gates, e.g. 2-8) */
  inputs?: number;
  /** Runtime state dictionary (values, flip-flop memory cells, toggle switches) */
  state?: Record<string, any>;
}

/**
 * 2D coordinate point on the canvas world space.
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Terminal endpoint of a wire referencing a specific component port.
 */
export interface WireEndpoint {
  componentId: string;
  portId: string;
}

/**
 * Electrical conductor connecting two component ports via Manhattan orthogonal routing.
 */
export interface Wire {
  /** Unique wire identifier */
  id: string;
  /** Origin port endpoint */
  from: WireEndpoint;
  /** Destination port endpoint */
  to: WireEndpoint;
  /** List of orthogonal coordinate vertices forming the wire path */
  points: Point[];
  /** Signal width in bits */
  bitWidth?: number;
}

/**
 * Complete serializable schematic state containing all components and netlist connections.
 */
export interface CircuitState {
  components: ComponentInstance[];
  wires: Wire[];
}

export interface SimulationDiagnostic {
  type: 'contention' | 'width-mismatch' | 'oscillation';
  message: string;
  componentIds: string[];
}
