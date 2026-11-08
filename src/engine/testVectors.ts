import { CircuitState, ComponentInstance, LogicValue } from '../types/circuit';
import { COMPONENT_METADATA } from './components';
import { Simulator } from './simulator';

const MAX_COMPONENTS = 200;
const MAX_INPUTS = 8;
const MAX_OUTPUTS = 8;
const MAX_TEST_VECTORS = 64;

export interface TestVector {
  inputs: Record<string, LogicValue>;
  expectedOutputs: Record<string, LogicValue>;
}

export interface TestVectorResult {
  actualOutputs: Record<string, LogicValue>;
  passed: boolean;
  diagnostic?: string;
}

export interface TestVectorSignals {
  inputs: ComponentInstance[];
  outputs: ComponentInstance[];
}

export class TestVectorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TestVectorError';
  }
}

function connectedPortIds(circuit: CircuitState, componentId: string): Set<string> {
  const ports = new Set<string>();
  for (const wire of circuit.wires) {
    if (wire.from.componentId === componentId) ports.add(wire.from.portId);
    if (wire.to.componentId === componentId) ports.add(wire.to.portId);
  }
  return ports;
}

export function getTestVectorSignals(circuit: CircuitState): TestVectorSignals {
  const inputs = circuit.components.filter(component =>
    ['PIN_INPUT', 'SWITCH', 'BUTTON', 'CLOCK'].includes(component.type) &&
    connectedPortIds(circuit, component.id).has('out')
  );
  const outputs = circuit.components.filter(component =>
    ['PIN_OUTPUT', 'PROBE'].includes(component.type) &&
    connectedPortIds(circuit, component.id).has('in')
  );
  return { inputs, outputs };
}

function cloneComponents(components: ComponentInstance[]): ComponentInstance[] {
  return components.map(component => ({
    ...component,
    state: component.state ? JSON.parse(JSON.stringify(component.state)) : undefined,
  }));
}

function validateCircuit(circuit: CircuitState, vectors: TestVector[]): TestVectorSignals {
  if (circuit.components.length > MAX_COMPONENTS) {
    throw new TestVectorError(`A execução está limitada a ${MAX_COMPONENTS} componentes por circuito.`);
  }
  if (vectors.length === 0 || vectors.length > MAX_TEST_VECTORS) {
    throw new TestVectorError(`Informe de 1 a ${MAX_TEST_VECTORS} vetores de teste.`);
  }

  for (const wire of circuit.wires) {
    const from = circuit.components.find(component => component.id === wire.from.componentId);
    const to = circuit.components.find(component => component.id === wire.to.componentId);
    if (!from || !to) {
      throw new TestVectorError('Há fios conectados a componentes inexistentes; corrija o circuito antes de testar.');
    }
    const fromPort = COMPONENT_METADATA[from.type]?.getPorts(from.inputs, from.bitWidth, from)
      .find(port => port.id === wire.from.portId);
    const toPort = COMPONENT_METADATA[to.type]?.getPorts(to.inputs, to.bitWidth, to)
      .find(port => port.id === wire.to.portId);
    if (!fromPort || !toPort) {
      throw new TestVectorError('Há fios conectados a portas inexistentes; corrija o circuito antes de testar.');
    }
    if (fromPort.bitWidth !== 1 || toPort.bitWidth !== 1) {
      throw new TestVectorError('Os vetores de teste desta versão aceitam somente circuitos de 1 bit.');
    }
  }

  const signals = getTestVectorSignals(circuit);
  if (signals.inputs.length === 0 || signals.outputs.length === 0) {
    throw new TestVectorError('Conecte pelo menos uma entrada controlável e um Pino de Saída ou uma Sonda.');
  }
  if (signals.inputs.length > MAX_INPUTS || signals.outputs.length > MAX_OUTPUTS) {
    throw new TestVectorError(`O limite é de ${MAX_INPUTS} entradas e ${MAX_OUTPUTS} saídas por circuito.`);
  }

  for (const vector of vectors) {
    for (const input of signals.inputs) {
      if (!['0', '1', 'X', 'Z'].includes(vector.inputs[input.id])) {
        throw new TestVectorError(`Selecione um valor lógico para a entrada "${input.label || input.id}" em cada vetor.`);
      }
    }
    for (const output of signals.outputs) {
      if (!['0', '1', 'X', 'Z'].includes(vector.expectedOutputs[output.id])) {
        throw new TestVectorError(`Selecione o valor esperado para a saída "${output.label || output.id}" em cada vetor.`);
      }
    }
  }

  return signals;
}

export function runTestVectors(
  circuit: CircuitState,
  vectors: TestVector[]
): TestVectorResult[] {
  const signals = validateCircuit(circuit, vectors);
  const simulator = new Simulator();
  simulator.setCircuit(cloneComponents(circuit.components), circuit.wires);
  simulator.step();
  simulator.step();

  return vectors.map(vector => {
    signals.inputs.forEach(input => {
      simulator.setPinValue(input.id, 'out', [vector.inputs[input.id]]);
    });
    simulator.step();
    simulator.step();

    const actualOutputs: Record<string, LogicValue> = {};
    for (const output of signals.outputs) {
      actualOutputs[output.id] = simulator.getPinValue(output.id, 'in')[0] ?? 'Z';
    }
    const diagnostic = simulator.getDiagnostics()[0]?.message;
    const passed = signals.outputs.every(output =>
      actualOutputs[output.id] === vector.expectedOutputs[output.id]
    ) && !diagnostic;

    return {
      actualOutputs,
      passed,
      ...(diagnostic ? { diagnostic } : {}),
    };
  });
}
