import { BitVector, ComponentInstance, LogicValue, SimulationDiagnostic, Wire } from '../types/circuit';
import { COMPONENT_METADATA } from './components';
import { getPortWorldPosition } from './componentGeometry';
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
  private subcircuitSimulators: Map<string, Simulator> = new Map();
  private wires: Wire[] = [];
  // Store values per component:portId -> BitVector
  private pinValues: Map<string, BitVector> = new Map();
  // Store resolved electrical net values per component:portId
  private netValues: Map<string, BitVector> = new Map();
  // Sequential states (e.g. flip flop previous clock state)
  private prevClockStates: Map<string, LogicValue> = new Map();
  private diagnostics: SimulationDiagnostic[] = [];
  // Max propagation iterations before detecting oscillation
  private readonly MAX_ITERATIONS = 50;

  /**
   * Initializes and loads circuit components and wiring into the simulator.
   */
  public setCircuit(components: ComponentInstance[], wires: Wire[]) {
    this.components.clear();
    this.subcircuitSimulators.clear();
    for (const c of components) {
      this.components.set(c.id, {
        ...c,
        state: c.state ? { ...c.state } : undefined,
      });
      if (c.type === 'SUBCIRCUIT' && c.subcircuit) {
        const childSimulator = new Simulator();
        childSimulator.setCircuit(c.subcircuit.circuit.components, c.subcircuit.circuit.wires);
        childSimulator.step();
        childSimulator.step();
        this.subcircuitSimulators.set(c.id, childSimulator);
      }
    }
    this.wires = [...wires];

    // Clean up stale pin values
    const validKeys = new Set<string>();
    const validSequentialIds = new Set(
      components
        .filter(component => ['D_FLIP_FLOP', 'REGISTER', 'RAM'].includes(component.type))
        .map(component => component.id)
    );

    for (const c of components) {
      const meta = COMPONENT_METADATA[c.type];
      if (!meta) continue;
      const ports = meta.getPorts(c.inputs, c.bitWidth, c);
      for (const p of ports) {
        const key = this.getPinKey(c.id, p.id);
        validKeys.add(key);

        const currentVal = this.pinValues.get(key);
        if (p.type === 'in' || p.type === 'inout') {
          this.pinValues.set(key, Array(p.bitWidth).fill('Z'));
        } else if (c.type === 'PIN_INPUT' || c.type === 'SWITCH' || c.type === 'BUTTON') {
          this.pinValues.set(
            key,
            this.normalizeVector(c.state?.value, p.bitWidth, '0')
          );
        } else if (c.type === 'CONSTANT') {
          this.pinValues.set(key, this.normalizeVector(c.state?.value, p.bitWidth, '1'));
        } else if (c.type === 'CLOCK') {
          this.pinValues.set(key, this.normalizeVector(c.state?.value, p.bitWidth, '0'));
        } else if (!currentVal || currentVal.length !== p.bitWidth) {
          this.pinValues.set(key, Array(p.bitWidth).fill('Z'));
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
    for (const id of this.prevClockStates.keys()) {
      if (!validSequentialIds.has(id)) this.prevClockStates.delete(id);
    }
  }

  private getPinKey(componentId: string, portId: string): string {
    return JSON.stringify([componentId, portId]);
  }

  private getEndpointFromKey(key: string): [string, string] {
    const endpoint: unknown = JSON.parse(key);
    if (!Array.isArray(endpoint) || endpoint.length !== 2
      || typeof endpoint[0] !== 'string' || typeof endpoint[1] !== 'string') {
      throw new Error('A simulação encontrou uma chave de porta inválida.');
    }
    return [endpoint[0], endpoint[1]];
  }

  private normalizeVector(value: unknown, width: number, fallback: LogicValue): BitVector {
    const vector = Array.isArray(value) && value.length > 0
      ? value as BitVector
      : Array(width).fill(fallback) as BitVector;
    return Array.from({ length: width }, (_, index) => vector[index] ?? 'Z');
  }

  private decodeSelector(value: BitVector, outputCount: number): number | null {
    let selectedIndex = 0;
    for (let bit = 0; bit < value.length; bit++) {
      if (value[bit] !== '0' && value[bit] !== '1') return null;
      if (value[bit] === '1') selectedIndex += 2 ** bit;
    }
    return selectedIndex < outputCount ? selectedIndex : outputCount;
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
    const port = meta.getPorts(comp.inputs, comp.bitWidth, comp).find(p => p.id === portId);
    if (port && netVal.length !== port.bitWidth) {
      return Array(port.bitWidth).fill('X');
    }
    return netVal;
  }

  public getDiagnostics(): SimulationDiagnostic[] {
    return this.diagnostics.map(diagnostic => ({
      ...diagnostic,
      componentIds: [...diagnostic.componentIds],
    }));
  }

  public getComponentState(componentId: string): ComponentInstance['state'] | undefined {
    const state = this.components.get(componentId)?.state;
    return state ? JSON.parse(JSON.stringify(state)) : undefined;
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

    // Explicit endpoints always connect; only marked junctions bridge wire interiors.
    for (const w of this.wires) {
      const fromKey = this.getPinKey(w.from.componentId, w.from.portId);
      const toKey = this.getPinKey(w.to.componentId, w.to.portId);
      union(fromKey, toKey);
    }

    const junctions = [...this.components.values()]
      .filter(component => component.type === 'JUNCTION')
      .map(component => ({
        key: this.getPinKey(component.id, 'node'),
        position: getPortWorldPosition(component, 'node'),
      }))
      .filter((junction): junction is { key: string; position: { x: number; y: number } } =>
        junction.position !== undefined
      );

    for (const junction of junctions) {
      for (const wire of this.wires) {
        const liesOnWire = wire.points.some((point, index) => {
          if (index === 0) return false;
          const start = wire.points[index - 1];
          const end = point;
          const cross = (junction.position.x - start.x) * (end.y - start.y)
            - (junction.position.y - start.y) * (end.x - start.x);
          if (Math.abs(cross) > 0.01) return false;
          return junction.position.x >= Math.min(start.x, end.x) - 0.01
            && junction.position.x <= Math.max(start.x, end.x) + 0.01
            && junction.position.y >= Math.min(start.y, end.y) - 0.01
            && junction.position.y <= Math.max(start.y, end.y) + 0.01;
        });
        if (liesOnWire) {
          union(junction.key, this.getPinKey(wire.from.componentId, wire.from.portId));
          union(junction.key, this.getPinKey(wire.to.componentId, wire.to.portId));
        }
      }
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
    const diagnostics = new Map<string, SimulationDiagnostic>();

    this.netValues.clear();
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

          case 'ADDER': {
            const bitWidth = comp.bitWidth ?? 4;
            const operandA = this.getPinValue(id, 'a');
            const operandB = this.getPinValue(id, 'b');
            const carryIn = this.getPinValue(id, 'carryIn')[0] ?? 'Z';
            const knownBinaryInputs = carryIn === '0' || carryIn === '1'
              ? [...operandA, ...operandB].every(value => value === '0' || value === '1')
              : false;
            let sum: BitVector;
            let carryOut: LogicValue;

            if (!knownBinaryInputs) {
              sum = Array(bitWidth).fill('X');
              carryOut = 'X';
            } else {
              let carry = Number(carryIn);
              sum = Array.from({ length: bitWidth }, (_, bit) => {
                const total = Number(operandA[bit]) + Number(operandB[bit]) + carry;
                carry = total >> 1;
                return (total & 1 ? '1' : '0') as LogicValue;
              });
              carryOut = carry ? '1' : '0';
            }

            const outputs: Array<[string, BitVector]> = [
              ['sum', sum],
              ['carryOut', [carryOut]],
            ];
            for (const [portId, value] of outputs) {
              if (!this.areVectorsEqual(value, this.getPinValue(id, portId))) {
                this.pinValues.set(this.getPinKey(id, portId), value);
                iterationChanged = true;
              }
            }
            break;
          }

          case 'SPLITTER': {
            const bitWidth = Math.max(2, Math.min(32, Math.floor(comp.bitWidth ?? 2)));
            const combinedVal = this.getPinValue(id, 'combined');
            const bitValues = Array.from({ length: bitWidth }, (_, bit) =>
              this.getPinValue(id, `bit${bit}`)
            );

            if (combinedVal.some(value => value !== 'Z')) {
              for (let bit = 0; bit < bitWidth; bit++) {
                const value: BitVector = [combinedVal[bit] ?? 'X'];
                const portId = `bit${bit}`;
                if (!this.areVectorsEqual(value, this.getPinValue(id, portId))) {
                  this.pinValues.set(this.getPinKey(id, portId), value);
                  iterationChanged = true;
                }
              }
            } else if (bitValues.some(value => value[0] !== 'Z')) {
              const merged = bitValues.map(value => value[0] ?? 'Z');
              if (!this.areVectorsEqual(merged, combinedVal)) {
                this.pinValues.set(this.getPinKey(id, 'combined'), merged);
                iterationChanged = true;
              }
            }
            break;
          }

          case 'MULTIPLEXER': {
            const inputCount = Math.max(2, Math.min(8, Math.floor(comp.inputs ?? 2)));
            const selectedIndex = this.decodeSelector(this.getPinValue(id, 'sel'), inputCount);
            const outVal = selectedIndex === null || selectedIndex >= inputCount
              ? Array(comp.bitWidth ?? 1).fill('X') as BitVector
              : this.getPinValue(id, `in${selectedIndex}`);

            const currentOut = this.getPinValue(id, 'out');
            if (!this.areVectorsEqual(outVal, currentOut)) {
              this.pinValues.set(this.getPinKey(id, 'out'), outVal);
              iterationChanged = true;
            }
            break;
          }

          case 'DEMULTIPLEXER': {
            const outputCount = Math.max(2, Math.min(8, Math.floor(comp.inputs ?? 2)));
            const inVal = this.getPinValue(id, 'in');
            const selectedIndex = this.decodeSelector(this.getPinValue(id, 'sel'), outputCount);
            for (let outputIndex = 0; outputIndex < outputCount; outputIndex++) {
              const output = selectedIndex === null
                ? Array(inVal.length).fill('X') as BitVector
                : selectedIndex === outputIndex
                  ? inVal
                  : Array(inVal.length).fill('0') as BitVector;
              const portId = `out${outputIndex}`;
              if (!this.areVectorsEqual(output, this.getPinValue(id, portId))) {
                this.pinValues.set(this.getPinKey(id, portId), output);
                iterationChanged = true;
              }
            }
            break;
          }

          case 'DECODER': {
            const selectWidth = Math.max(1, Math.min(5, Math.floor(comp.bitWidth ?? 2)));
            const outputCount = 2 ** selectWidth;
            const enabled = this.getPinValue(id, 'enable')[0] ?? 'Z';
            const selectedIndex = this.decodeSelector(this.getPinValue(id, 'sel'), outputCount);
            for (let outputIndex = 0; outputIndex < outputCount; outputIndex++) {
              const value: BitVector = enabled === '0'
                ? ['0']
                : enabled !== '1' || selectedIndex === null
                  ? ['X']
                  : [selectedIndex === outputIndex ? '1' : '0'];
              const portId = `out${outputIndex}`;
              if (!this.areVectorsEqual(value, this.getPinValue(id, portId))) {
                this.pinValues.set(this.getPinKey(id, portId), value);
                iterationChanged = true;
              }
            }
            break;
          }

          case 'PRIORITY_ENCODER': {
            const inputCount = Math.max(2, Math.min(32, Math.floor(comp.bitWidth ?? 4)));
            const requestValues = this.getPinValue(id, 'in');
            const codeWidth = Math.ceil(Math.log2(inputCount));
            let selectedIndex = -1;
            let unknownHigherPriority = false;
            let resultCode: BitVector;
            let valid: LogicValue;

            for (let index = inputCount - 1; index >= 0; index--) {
              const request = requestValues[index] ?? 'Z';
              if (request === '1') {
                selectedIndex = index;
                break;
              }
              if (request !== '0') unknownHigherPriority = true;
            }

            if (selectedIndex >= 0) {
              valid = '1';
              resultCode = unknownHigherPriority
                ? Array(codeWidth).fill('X') as BitVector
                : Array.from({ length: codeWidth }, (_, bit) =>
                    (selectedIndex & (1 << bit) ? '1' : '0') as LogicValue
                  );
            } else if (unknownHigherPriority) {
              valid = 'X';
              resultCode = Array(codeWidth).fill('X') as BitVector;
            } else {
              valid = '0';
              resultCode = Array(codeWidth).fill('0') as BitVector;
            }

            const outputs: Array<[string, BitVector]> = [
              ['code', resultCode],
              ['valid', [valid]],
            ];
            for (const [portId, value] of outputs) {
              if (!this.areVectorsEqual(value, this.getPinValue(id, portId))) {
                this.pinValues.set(this.getPinKey(id, portId), value);
                iterationChanged = true;
              }
            }
            break;
          }

          case 'SUBCIRCUIT': {
            const childSimulator = this.subcircuitSimulators.get(id);
            if (!childSimulator || !comp.subcircuit) break;

            for (const port of comp.subcircuit.ports) {
              if (port.direction === 'in') {
                childSimulator.setPinValue(
                  port.pinComponentId,
                  'out',
                  this.getPinValue(id, port.id)
                );
              }
            }
            childSimulator.step();
            childSimulator.step();

            for (const port of comp.subcircuit.ports) {
              if (port.direction !== 'out') continue;
              const output = childSimulator.getPinValue(port.pinComponentId, 'in');
              const current = this.getPinValue(id, port.id);
              if (!this.areVectorsEqual(output, current)) {
                this.pinValues.set(this.getPinKey(id, port.id), output);
                iterationChanged = true;
              }
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

          case 'RAM':
          case 'ROM': {
            const addressBits = Math.max(1, Math.min(5, Math.floor(comp.inputs ?? 2)));
            const bitWidth = Math.max(1, Math.min(32, Math.floor(comp.bitWidth ?? 8)));
            const cellCount = 2 ** addressBits;
            const memory: BitVector[] = Array.from({ length: cellCount }, (_, address) =>
              this.normalizeVector(comp.state?.memory?.[address], bitWidth, '0')
            );
            if (!comp.state) comp.state = {};
            comp.state.memory = memory;

            const addressVector = this.getPinValue(id, 'addr');
            const address = this.decodeSelector(addressVector, cellCount);
            let dataOut: BitVector;
            if (address === null || address >= cellCount) {
              dataOut = Array(bitWidth).fill('X');
            } else {
              dataOut = [...memory[address]];
            }

            if (comp.type === 'RAM') {
              const clk = this.getPinValue(id, 'clk')[0] ?? 'Z';
              const prevClk = this.prevClockStates.get(id) ?? '0';
              const writeEnable = this.getPinValue(id, 'writeEnable')[0] ?? 'Z';
              if (prevClk === '0' && clk === '1' && writeEnable === '1'
                && address !== null && address < cellCount) {
                memory[address] = this.normalizeVector(this.getPinValue(id, 'dataIn'), bitWidth, 'X');
                comp.state.memory = memory;
                dataOut = [...memory[address]];
              }
              this.prevClockStates.set(id, clk);
            }

            if (!this.areVectorsEqual(dataOut, this.getPinValue(id, 'dataOut'))) {
              this.pinValues.set(this.getPinKey(id, 'dataOut'), dataOut);
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
          const [compId, portId] = this.getEndpointFromKey(pinKey);
          const comp = this.components.get(compId);
          if (!comp) continue;
          const meta = COMPONENT_METADATA[comp.type];
          if (!meta) continue;
          const port = meta.getPorts(comp.inputs, comp.bitWidth, comp).find(p => p.id === portId);
          if (port) portWidths.push(port.bitWidth);
        }

        const isWidthMismatch = portWidths.some(w => w !== portWidths[0]);
        let resolved: BitVector;
        const componentIds = [...new Set(net.map(pinKey => pinKey.split(':')[0]))];

        if (isWidthMismatch) {
          // Bus width mismatch produces error X on the net
          const maxWidth = Math.max(...portWidths);
          resolved = Array(maxWidth).fill('X');
          diagnostics.set(net[0], {
            type: 'width-mismatch',
            message: `Larguras de barramento incompatíveis (${[...new Set(portWidths)].join(' e ')} bits).`,
            componentIds,
          });
        } else {
          // Gather all output pins driving this net
          const drivers: BitVector[] = [];
          for (const pinKey of net) {
            const [compId, portId] = this.getEndpointFromKey(pinKey);
            const comp = this.components.get(compId);
            if (!comp) continue;
            const meta = COMPONENT_METADATA[comp.type];
            if (!meta) continue;
            const port = meta.getPorts(comp.inputs, comp.bitWidth, comp).find(p => p.id === portId);
            if (port && (port.type === 'out' || port.type === 'inout')) {
              const val = this.pinValues.get(pinKey);
              if (val) drivers.push(val);
            }
          }
          resolved = drivers.length > 0
            ? resolveBus(drivers)
            : Array(portWidths[0] ?? 1).fill('Z');
          if (resolved.includes('X')) {
            diagnostics.set(net[0], {
              type: 'contention',
              message: 'Sinal X detectado nesta conexão; verifique os drivers e a lógica conectada.',
              componentIds,
            });
          }
        }

        // Store resolved net value for all connected ports
        for (const pinKey of net) {
          this.netValues.set(pinKey, resolved);

          const [compId, portId] = this.getEndpointFromKey(pinKey);
          const comp = this.components.get(compId);
          if (!comp) continue;
          const meta = COMPONENT_METADATA[comp.type];
          if (!meta) continue;
          const port = meta.getPorts(comp.inputs, comp.bitWidth, comp).find(p => p.id === portId);
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

    if (iteration >= this.MAX_ITERATIONS) {
      diagnostics.set('oscillation', {
        type: 'oscillation',
        message: 'A simulação atingiu o limite de propagação; verifique ciclos combinacionais.',
        componentIds: [...this.components.keys()],
      });
    }
    this.diagnostics = [...diagnostics.values()];

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
