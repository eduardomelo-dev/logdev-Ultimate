import { CircuitState } from '../types/circuit';
import { routeOrthogonalWire } from '../canvas/wireRouter';

export const fullAdderDemo: CircuitState = {
  components: [
    // Inputs
    { id: 'pinA', type: 'PIN_INPUT', x: 80, y: 100, label: 'A', state: { value: ['1'] } },
    { id: 'pinB', type: 'PIN_INPUT', x: 80, y: 180, label: 'B', state: { value: ['1'] } },
    { id: 'pinCin', type: 'PIN_INPUT', x: 80, y: 260, label: 'Cin', state: { value: ['0'] } },

    // Gates
    { id: 'xor1', type: 'XOR', x: 220, y: 120, label: 'XOR 1', inputs: 2 },
    { id: 'xor2', type: 'XOR', x: 380, y: 140, label: 'XOR 2 (Soma)', inputs: 2 },
    { id: 'and1', type: 'AND', x: 220, y: 220, label: 'AND 1', inputs: 2 },
    { id: 'and2', type: 'AND', x: 380, y: 240, label: 'AND 2', inputs: 2 },
    { id: 'or1', type: 'OR', x: 500, y: 230, label: 'OR 1 (Cout)', inputs: 2 },

    // Outputs
    { id: 'sumOut', type: 'PIN_OUTPUT', x: 620, y: 145, label: 'Soma (S)' },
    { id: 'coutOut', type: 'PIN_OUTPUT', x: 620, y: 235, label: 'Carry Out (Cout)' },
  ],
  wires: [
    // A to xor1 in0 & and1 in0
    {
      id: 'w_a_xor',
      from: { componentId: 'pinA', portId: 'out' },
      to: { componentId: 'xor1', portId: 'in0' },
      points: routeOrthogonalWire({ x: 120, y: 120 }, { x: 220, y: 137 }),
    },
    {
      id: 'w_a_and',
      from: { componentId: 'pinA', portId: 'out' },
      to: { componentId: 'and1', portId: 'in0' },
      points: routeOrthogonalWire({ x: 120, y: 120 }, { x: 220, y: 237 }),
    },
    // B to xor1 in1 & and1 in1
    {
      id: 'w_b_xor',
      from: { componentId: 'pinB', portId: 'out' },
      to: { componentId: 'xor1', portId: 'in1' },
      points: routeOrthogonalWire({ x: 120, y: 200 }, { x: 220, y: 153 }),
    },
    {
      id: 'w_b_and',
      from: { componentId: 'pinB', portId: 'out' },
      to: { componentId: 'and1', portId: 'in1' },
      points: routeOrthogonalWire({ x: 120, y: 200 }, { x: 220, y: 253 }),
    },
    // xor1 out to xor2 in0 & and2 in0
    {
      id: 'w_xor1_xor2',
      from: { componentId: 'xor1', portId: 'out' },
      to: { componentId: 'xor2', portId: 'in0' },
      points: routeOrthogonalWire({ x: 280, y: 145 }, { x: 380, y: 157 }),
    },
    {
      id: 'w_xor1_and2',
      from: { componentId: 'xor1', portId: 'out' },
      to: { componentId: 'and2', portId: 'in0' },
      points: routeOrthogonalWire({ x: 280, y: 145 }, { x: 380, y: 257 }),
    },
    // Cin to xor2 in1 & and2 in1
    {
      id: 'w_cin_xor2',
      from: { componentId: 'pinCin', portId: 'out' },
      to: { componentId: 'xor2', portId: 'in1' },
      points: routeOrthogonalWire({ x: 120, y: 280 }, { x: 380, y: 173 }),
    },
    {
      id: 'w_cin_and2',
      from: { componentId: 'pinCin', portId: 'out' },
      to: { componentId: 'and2', portId: 'in1' },
      points: routeOrthogonalWire({ x: 120, y: 280 }, { x: 380, y: 273 }),
    },
    // xor2 out to sumOut
    {
      id: 'w_xor2_sum',
      from: { componentId: 'xor2', portId: 'out' },
      to: { componentId: 'sumOut', portId: 'in' },
      points: routeOrthogonalWire({ x: 440, y: 165 }, { x: 620, y: 165 }),
    },
    // and1 & and2 to or1
    {
      id: 'w_and1_or',
      from: { componentId: 'and1', portId: 'out' },
      to: { componentId: 'or1', portId: 'in0' },
      points: routeOrthogonalWire({ x: 280, y: 245 }, { x: 500, y: 247 }),
    },
    {
      id: 'w_and2_or',
      from: { componentId: 'and2', portId: 'out' },
      to: { componentId: 'or1', portId: 'in1' },
      points: routeOrthogonalWire({ x: 440, y: 265 }, { x: 500, y: 263 }),
    },
    // or1 to coutOut
    {
      id: 'w_or_cout',
      from: { componentId: 'or1', portId: 'out' },
      to: { componentId: 'coutOut', portId: 'in' },
      points: routeOrthogonalWire({ x: 560, y: 255 }, { x: 620, y: 255 }),
    },
  ],
};

export const srLatchDemo: CircuitState = {
  components: [
    { id: 'pinR', type: 'PIN_INPUT', x: 80, y: 100, label: 'Reset (R)', state: { value: ['0'] } },
    { id: 'pinS', type: 'PIN_INPUT', x: 80, y: 220, label: 'Set (S)', state: { value: ['1'] } },
    { id: 'nor1', type: 'NOR', x: 220, y: 110, label: 'NOR 1', inputs: 2 },
    { id: 'nor2', type: 'NOR', x: 220, y: 210, label: 'NOR 2', inputs: 2 },
    { id: 'probeQ', type: 'PROBE', x: 380, y: 115, label: 'Q' },
    { id: 'probeQBar', type: 'PROBE', x: 380, y: 215, label: '~Q' },
  ],
  wires: [
    {
      id: 'w_r_nor1',
      from: { componentId: 'pinR', portId: 'out' },
      to: { componentId: 'nor1', portId: 'in0' },
      points: routeOrthogonalWire({ x: 120, y: 120 }, { x: 220, y: 127 }),
    },
    {
      id: 'w_s_nor2',
      from: { componentId: 'pinS', portId: 'out' },
      to: { componentId: 'nor2', portId: 'in1' },
      points: routeOrthogonalWire({ x: 120, y: 240 }, { x: 220, y: 243 }),
    },
    {
      id: 'w_nor1_q',
      from: { componentId: 'nor1', portId: 'out' },
      to: { componentId: 'probeQ', portId: 'in' },
      points: routeOrthogonalWire({ x: 280, y: 135 }, { x: 380, y: 135 }),
    },
    {
      id: 'w_nor2_qbar',
      from: { componentId: 'nor2', portId: 'out' },
      to: { componentId: 'probeQBar', portId: 'in' },
      points: routeOrthogonalWire({ x: 280, y: 235 }, { x: 380, y: 235 }),
    },
    // Cross feedback: nor1 out to nor2 in0
    {
      id: 'w_feedback_q_nor2',
      from: { componentId: 'nor1', portId: 'out' },
      to: { componentId: 'nor2', portId: 'in0' },
      points: routeOrthogonalWire({ x: 280, y: 135 }, { x: 220, y: 227 }),
    },
    // Cross feedback: nor2 out to nor1 in1
    {
      id: 'w_feedback_qbar_nor1',
      from: { componentId: 'nor2', portId: 'out' },
      to: { componentId: 'nor1', portId: 'in1' },
      points: routeOrthogonalWire({ x: 280, y: 235 }, { x: 220, y: 143 }),
    },
  ],
};

export const clockCounterDemo: CircuitState = {
  components: [
    { id: 'clk1', type: 'CLOCK', x: 80, y: 120, label: 'CLK', state: { value: ['0'] } },
    { id: 'dff1', type: 'D_FLIP_FLOP', x: 200, y: 100, label: 'D-FF 1' },
    { id: 'dff2', type: 'D_FLIP_FLOP', x: 340, y: 100, label: 'D-FF 2' },
    { id: 'led1', type: 'LED', x: 480, y: 100, label: 'Bit 0' },
    { id: 'led2', type: 'LED', x: 480, y: 180, label: 'Bit 1' },
  ],
  wires: [
    {
      id: 'w_clk_dff1',
      from: { componentId: 'clk1', portId: 'out' },
      to: { componentId: 'dff1', portId: 'clk' },
      points: routeOrthogonalWire({ x: 120, y: 140 }, { x: 200, y: 145 }),
    },
    {
      id: 'w_dff1_feedback',
      from: { componentId: 'dff1', portId: 'qBar' },
      to: { componentId: 'dff1', portId: 'd' },
      points: routeOrthogonalWire({ x: 260, y: 145 }, { x: 200, y: 115 }),
    },
    {
      id: 'w_dff1_led1',
      from: { componentId: 'dff1', portId: 'q' },
      to: { componentId: 'led1', portId: 'in' },
      points: routeOrthogonalWire({ x: 260, y: 115 }, { x: 480, y: 120 }),
    },
  ],
};
