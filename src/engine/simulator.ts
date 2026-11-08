import { BitVector, ComponentInstance, LogicValue, Wire } from '../types/circuit';
import { COMPONENT_METADATA } from './components';
import { evaluateGate, resolveBus } from './logic';

/**
 * logdev-Ultimate - Netlist Propagation Simulator
 * 
 * Performs topological and iterative discrete digital logic simulation.
 * Key properties:
 * 1. 4-state logic evaluation ('0', '1', 'Z', 'X')
 * 2. Multi-driver contention resolution (opposite active drivers resolve to 'X')
 * 3. Bus width mismatch detection across electrical nets
 * 4. Iteration limit protection against infinite sequential oscillations
 */
export class Simulator {
  private components: Map<string, ComponentInstance> = new Map();
  private wires: Wire[] = [];
  // Store values per component:portId -> BitVector
  private pinValues: Map<string, BitVector> = new Map();
  // Store resolved electrical net values per component:portId
  private netValues: Map<string, BitVector> = new Map();
  // Sequential states (e.g. flip flop previous clock state)
  private prevClockStates: Map<string, LogicValue> = new Map();
  // Max propagation iterations before detecting oscillation
  private readonly MAX_ITERATIONS = 50;

  /**
   * Initializes and loads circuit components and wiring into the simulator.
   */
  public setCircuit(components: ComponentInstance[], wires: Wire[]) {
    this.components.clear();
    for (const c of components) {
      this.components.set(c.id, { ...c });
    }
    this.wires = [...wires];

    // Clean up stale pin values
    const validKeys = new Set<string>();

    for (const c of components) {
      const meta = COMPONENT_METADATA[c.type];
      if (!meta) continue;
      const ports = meta.getPorts(c.inputs, c.bitWidth);
      for (const p of ports) {
        const key = this.getPinKey(c.id, p.id);
        validKeys.add(key);

        const currentVal = this.pinValues.get(key);
        // If port width changed or pin not initialized yet
        if (!currentVal || currentVal.length !== p.bitWidth) {
          if (c.type === 'PIN_INPUT' || c.type === 'SWITCH' || c.type === 'BUTTON') {
            const initial = c.state?.value || Array(p.bitWidth).fill('0');
            this.pinValues.set(key, initial);
          } else if (c.type === 'CONSTANT') {
            const val = c.state?.value || ['1'];
            this.pinValues.set(key, val);
          } else if (c.type === 'CLOCK') {
            const val = c.state?.value || ['0'];
            this.pinValues.set(key, val);
          } else {
            this.pinValues.set(key, Array(p.bitWidth).fill('Z'));
          }
        }
      }
    }

    // Remove obsolete keys from pinValues & netValues
    for (const k of Array.from(this.pinValues.keys())) {
      if (!validKeys.has(k)) {
        this.pinValues.delete(k);
        this.netValues.delete(k);
      }
    }
  }

  private getPinKey(componentId: string, portId: string): string {
    return `${componentId}:${portId}`;
  }

  public getPinValue(componentId: string, portId: string): BitVector {
    const key = this.getPinKey(componentId, portId);
    return this.pinValues.get(key) || ['Z'];
  }

  public getNetValue(componentId: string, portId: string): BitVector {
    const key = this.getPinKey(componentId, portId);
    const netVal = this.netValues.get(key);
    if (!netVal) return this.getPinValue(componentId, portId);
    const comp = this.components.get(componentId);
    if (!comp) return netVal;
    const meta = COMPONENT_METADATA[comp.type];
    if (!meta) return netVal;
    const port = meta.getPorts(comp.inputs, comp.bitWidth).find(p => p.id === portId);
    if (port && netVal.length !== port.bitWidth) {
      return Array(port.bitWidth).fill('X');
    }
    return netVal;
  }

  public setPinValue(componentId: string, portId: string, value: BitVector) {
    const key = this.getPinKey(componentId, portId);
    this.pinValues.set(key, [...value]);
    const comp = this.components.get(componentId);
    if (comp) {
      if (!comp.state) comp.state = {};
      comp.state.value = [...value];
    }
  }

  /**
   * Builds electrical nets from wires.
   * All connected ports belong to the same Net.
   */
  private buildNets(): string[][] {
    const parent = new Map<string, string>();

    const find = (i: string): string => {
      const p = parent.get(i);
      if (!p || p === i) {
        parent.set(i, i);
        return i;
      }
      const root = find(p);
      parent.set(i, root);
      return root;
    };

    const union = (i: string, j: string) => {
      const rootI = find(i);
      const rootJ = find(j);
      if (rootI !== rootJ) {
        parent.set(rootI, rootJ);
      }
    };

    // Add all wire connections
    for (const w of this.wires) {
      const fromKey = this.getPinKey(w.from.componentId, w.from.portId);
      const toKey = this.getPinKey(w.to.componentId, w.to.portId);
      union(fromKey, toKey);
    }

    const groups = new Map<string, string[]>();
    for (const [key] of this.pinValues.entries()) {
      const root = find(key);
      if (!groups.has(root)) {
        groups.set(root, []);
      }
      groups.get(root)!.push(key);
    }

    return Array.from(groups.values());
  }

  /**
   * Executes a propagation step across the netlist.
   * Returns true if any pin value changed.
   */
  public step(): boolean {
    let globalChanged = false;
    let iteration = 0;

    const nets = this.buildNets();

    while (iteration < this.MAX_ITERATIONS) {
      let iterationChanged = false;

      // 1. Evaluate component transfer functions (Inputs -> Outputs)
      for (const [id, comp] of this.components.entries()) {
        const meta = COMPONENT_METADATA[comp.type];
        if (!meta) continue;

        switch (comp.type) {
          case 'AND':
          case 'OR':
          case 'NOT':
          case 'NAND':
          case 'NOR':
          case 'XOR':
          case 'XNOR':
          case 'BUFFER':
          case 'TRISTATE': {
            const inputCount = comp.inputs || 2;
            const inputs: BitVector[] = [];
            if (comp.type === 'NOT' || comp.type === 'BUFFER') {
              inputs.push(this.getPinValue(id, 'in'));
            } else if (comp.type === 'TRISTATE') {
              inputs.push(this.getPinValue(id, 'in'));
              inputs.push(this.getPinValue(id, 'enable'));
            } else {
              for (let i = 0; i < inputCount; i++) {
                inputs.push(this.getPinValue(id, `in${i}`));
              }
            }
            const outVal = evaluateGate(comp.type, inputs);
            const currentOut = this.getPinValue(id, 'out');
            if (!this.areVectorsEqual(outVal, currentOut)) {
              this.pinValues.set(this.getPinKey(id, 'out'), outVal);
              iterationChanged = true;
            }
            break;
          }

          case 'SPLITTER': {
            // Check combined bus vs individual bits
            const combinedVal = this.getPinValue(id, 'combined');
            const bit0Val = this.getPinValue(id, 'bit0');
            const bit1Val = this.getPinValue(id, 'bit1');

            // If combined has valid signals, drive bit0 and bit1
            if (combinedVal.length >= 2 && (combinedVal[0] !== 'Z' || combinedVal[1] !== 'Z')) {
              const b0: BitVector = [combinedVal[0]];
              const b1: BitVector = [combinedVal[1]];
              if (!this.areVectorsEqual(b0, bit0Val)) {
                this.pinValues.set(this.getPinKey(id, 'bit0'), b0);
                iterationChanged = true;
              }
              if (!this.areVectorsEqual(b1, bit1Val)) {
                this.pinValues.set(this.getPinKey(id, 'bit1'), b1);
                iterationChanged = true;
              }
            } else if (bit0Val[0] !== 'Z' || bit1Val[0] !== 'Z') {
              // Drive combined from individual bits
              const merged: BitVector = [bit0Val[0] || '0', bit1Val[0] || '0'];
              if (!this.areVectorsEqual(merged, combinedVal)) {
                this.pinValues.set(this.getPinKey(id, 'combined'), merged);
                iterationChanged = true;
              }
            }
            break;
          }

          case 'MULTIPLEXER': {
            const in0 = this.getPinValue(id, 'in0');
            const in1 = this.getPinValue(id, 'in1');
            const sel = this.getPinValue(id, 'sel')[0] || '0';
            let outVal: BitVector = ['Z'];
            if (sel === '0') outVal = in0;
            else if (sel === '1') outVal = in1;
            else outVal = ['X'];

            const currentOut = this.getPinValue(id, 'out');
            if (!this.areVectorsEqual(outVal, currentOut)) {
              this.pinValues.set(this.getPinKey(id, 'out'), outVal);
              iterationChanged = true;
            }
            break;
          }

          case 'DEMULTIPLEXER': {
            const inVal = this.getPinValue(id, 'in');
            const sel = this.getPinValue(id, 'sel')[0] || '0';
            const width = inVal.length;
            const zVector = Array(width).fill('0') as BitVector;

            const out0 = sel === '0' ? inVal : zVector;
            const out1 = sel === '1' ? inVal : zVector;

            if (!this.areVectorsEqual(out0, this.getPinValue(id, 'out0'))) {
              this.pinValues.set(this.getPinKey(id, 'out0'), out0);
              iterationChanged = true;
            }
            if (!this.areVectorsEqual(out1, this.getPinValue(id, 'out1'))) {
              this.pinValues.set(this.getPinKey(id, 'out1'), out1);
              iterationChanged = true;
            }
            break;
          }

          case 'D_FLIP_FLOP': {
            const d = this.getPinValue(id, 'd')[0] || '0';
            const clk = this.getPinValue(id, 'clk')[0] || '0';
            const prevClk = this.prevClockStates.get(id) || '0';
            let stored = comp.state?.q || '0';

            // Rising edge detection
            if (prevClk === '0' && clk === '1') {
              stored = d;
              if (!comp.state) comp.state = {};
              comp.state.q = stored;
            }
            this.prevClockStates.set(id, clk);

            const qVal: BitVector = [stored];
            const qBarVal: BitVector = [stored === '1' ? '0' : '1'];

            if (!this.areVectorsEqual(qVal, this.getPinValue(id, 'q'))) {
              this.pinValues.set(this.getPinKey(id, 'q'), qVal);
              iterationChanged = true;
            }
            if (!this.areVectorsEqual(qBarVal, this.getPinValue(id, 'qBar'))) {
              this.pinValues.set(this.getPinKey(id, 'qBar'), qBarVal);
              iterationChanged = true;
            }
            break;
          }

          case 'REGISTER': {
            const bitWidth = comp.bitWidth || 4;
            const d = this.getPinValue(id, 'd');
            const clk = this.getPinValue(id, 'clk')[0] || '0';
            const en = this.getPinValue(id, 'en')[0] || '1';
            const prevClk = this.prevClockStates.get(id) || '0';
            let stored = comp.state?.q || Array(bitWidth).fill('0');

            if (prevClk === '0' && clk === '1' && en === '1') {
              stored = [...d];
              if (!comp.state) comp.state = {};
              comp.state.q = stored;
            }
            this.prevClockStates.set(id, clk);

            if (!this.areVectorsEqual(stored, this.getPinValue(id, 'q'))) {
              this.pinValues.set(this.getPinKey(id, 'q'), stored);
              iterationChanged = true;
            }
            break;
          }

          case 'PIN_INPUT':
          case 'SWITCH':
          case 'BUTTON':
          case 'CONSTANT':
          case 'CLOCK': {
            const outVal = comp.state?.value || ['0'];
            if (!this.areVectorsEqual(outVal, this.getPinValue(id, 'out'))) {
              this.pinValues.set(this.getPinKey(id, 'out'), outVal);
              iterationChanged = true;
            }
            break;
          }

          default:
            break;
        }
      }

      // 2. Propagate across connected electrical nets (Resolve multi-driver / floating / width check)
      for (const net of nets) {
        if (net.length <= 1) continue;

        // Verify bus width consistency across connected ports
        const portWidths: number[] = [];
        for (const pinKey of net) {
          const [compId, portId] = pinKey.split(':');
          const comp = this.components.get(compId);
          if (!comp) continue;
          const meta = COMPONENT_METADATA[comp.type];
          if (!meta) continue;
          const port = meta.getPorts(comp.inputs, comp.bitWidth).find(p => p.id === portId);
          if (port) portWidths.push(port.bitWidth);
        }

        const isWidthMismatch = portWidths.some(w => w !== portWidths[0]);
        let resolved: BitVector;

        if (isWidthMismatch) {
          // Bus width mismatch produces error X on the net
          const maxWidth = Math.max(...portWidths);
          resolved = Array(maxWidth).fill('X');
        } else {
          // Gather all output pins driving this net
          const drivers: BitVector[] = [];
          for (const pinKey of net) {
            const [compId, portId] = pinKey.split(':');
            const comp = this.components.get(compId);
            if (!comp) continue;
            const meta = COMPONENT_METADATA[comp.type];
            if (!meta) continue;
            const port = meta.getPorts(comp.inputs, comp.bitWidth).find(p => p.id === portId);
            if (port && (port.type === 'out' || port.type === 'inout')) {
              const val = this.pinValues.get(pinKey);
              if (val) drivers.push(val);
            }
          }
          resolved = resolveBus(drivers);
        }

        // Store resolved net value for all connected ports
        for (const pinKey of net) {
          this.netValues.set(pinKey, resolved);

          const [compId, portId] = pinKey.split(':');
          const comp = this.components.get(compId);
          if (!comp) continue;
          const meta = COMPONENT_METADATA[comp.type];
          if (!meta) continue;
          const port = meta.getPorts(comp.inputs, comp.bitWidth).find(p => p.id === portId);
          if (port && (port.type === 'in' || port.type === 'inout' || isWidthMismatch)) {
            const current = this.pinValues.get(pinKey) || [];
            // Match port width if resolving mismatch
            const targetVal = resolved.length === port.bitWidth ? resolved : Array(port.bitWidth).fill('X');
            if (!this.areVectorsEqual(targetVal, current)) {
              this.pinValues.set(pinKey, targetVal);
              iterationChanged = true;
            }
          }
        }
      }

      if (iterationChanged) {
        globalChanged = true;
      } else {
        break; // Settled
      }

      iteration++;
    }

    return globalChanged;
  }

  private areVectorsEqual(a: BitVector, b: BitVector): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
}
