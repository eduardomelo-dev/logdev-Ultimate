import { Simulator } from './simulator';
import { COMPONENT_METADATA } from './components';
import { ComponentInstance, CircuitState, LogicValue, Wire } from '../types/circuit';

const MAX_INPUTS = 8;
const MAX_COMPONENTS = 200;
const SEQUENTIAL_TYPES = new Set(['CLOCK', 'D_FLIP_FLOP', 'REGISTER']);

export interface LogicAnalysisRow {
  inputs: boolean[];
  outputs: LogicValue[];
}

export interface KarnaughMap {
  rowVariables: string[];
  columnVariables: string[];
  rowLabels: string[];
  columnLabels: string[];
  values: LogicValue[][];
}

export interface LogicAnalysisOutput {
  id: string;
  name: string;
  expression: string;
  karnaughMap?: KarnaughMap;
}

export interface LogicAnalysisResult {
  inputs: Array<{ id: string; name: string; variable: string }>;
  outputs: LogicAnalysisOutput[];
  rows: LogicAnalysisRow[];
}

export class LogicAnalysisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LogicAnalysisError';
  }
}

function isInputSource(component: ComponentInstance): boolean {
  return component.type === 'PIN_INPUT' || component.type === 'SWITCH' || component.type === 'BUTTON';
}

function isOutputSink(component: ComponentInstance): boolean {
  return component.type === 'PIN_OUTPUT' || component.type === 'PROBE';
}

function connectedPortIds(wires: Wire[], componentId: string): Set<string> {
  const ports = new Set<string>();
  for (const wire of wires) {
    if (wire.from.componentId === componentId) ports.add(wire.from.portId);
    if (wire.to.componentId === componentId) ports.add(wire.to.portId);
  }
  return ports;
}

function grayCode(index: number): number {
  return index ^ (index >> 1);
}

function grayLabels(count: number, variables: string[]): string[] {
  const length = 1 << count;
  return Array.from({ length }, (_, index) => {
    const code = grayCode(index);
    return variables.map((_, bit) => (code >> (count - bit - 1)) & 1).join('');
  });
}

function mintermBits(minterm: number, width: number): string {
  return minterm.toString(2).padStart(width, '0');
}

function combineImplicants(a: string, b: string): string | undefined {
  let differingIndex = -1;
  for (let index = 0; index < a.length; index++) {
    if (a[index] === b[index]) continue;
    if (a[index] === '-' || b[index] === '-' || differingIndex !== -1) return undefined;
    differingIndex = index;
  }
  if (differingIndex === -1) return undefined;
  return `${a.slice(0, differingIndex)}-${a.slice(differingIndex + 1)}`;
}

function implicantCovers(pattern: string, minterm: number, width: number): boolean {
  const bits = mintermBits(minterm, width);
  return pattern.split('').every((bit, index) => bit === '-' || bit === bits[index]);
}

function literalCount(pattern: string): number {
  return pattern.length - [...pattern].filter(bit => bit === '-').length;
}

function primeImplicants(minterms: number[], width: number): string[] {
  let current = new Set(minterms.map(minterm => mintermBits(minterm, width)));
  const primes = new Set<string>();

  while (current.size > 0) {
    const patterns = [...current];
    const combined = new Set<string>();
    const used = new Set<string>();
    for (let i = 0; i < patterns.length; i++) {
      for (let j = i + 1; j < patterns.length; j++) {
        const merged = combineImplicants(patterns[i], patterns[j]);
        if (merged) {
          combined.add(merged);
          used.add(patterns[i]);
          used.add(patterns[j]);
        }
      }
    }
    for (const pattern of patterns) {
      if (!used.has(pattern)) primes.add(pattern);
    }
    current = combined;
  }

  return [...primes].sort();
}

function chooseMinimumCover(primes: string[], minterms: number[], width: number): string[] {
  const coverage = new Map(primes.map(pattern => [
    pattern,
    new Set(minterms.filter(minterm => implicantCovers(pattern, minterm, width))),
  ]));
  const candidates = new Map(minterms.map(minterm => [
    minterm,
    primes.filter(pattern => coverage.get(pattern)!.has(minterm)),
  ]));
  let best: string[] | undefined;
  let bestTermCount = Infinity;
  let bestLiteralCount = Infinity;

  const search = (covered: Set<number>, selected: string[], literals: number) => {
    if (covered.size === minterms.length) {
      if (selected.length < bestTermCount ||
        (selected.length === bestTermCount && literals < bestLiteralCount)) {
        best = [...selected];
        bestTermCount = selected.length;
        bestLiteralCount = literals;
      }
      return;
    }
    if (selected.length > bestTermCount ||
      (selected.length === bestTermCount && literals >= bestLiteralCount)) return;

    const uncovered = minterms.filter(minterm => !covered.has(minterm));
    const next = uncovered.reduce((chosen, minterm) =>
      candidates.get(minterm)!.length < candidates.get(chosen)!.length ? minterm : chosen
    , uncovered[0]);

    for (const pattern of candidates.get(next)!) {
      if (selected.includes(pattern)) continue;
      const nextCovered = new Set(covered);
      for (const minterm of coverage.get(pattern)!) nextCovered.add(minterm);
      search(nextCovered, [...selected, pattern], literals + literalCount(pattern));
    }
  };

  search(new Set(), [], 0);
  return best ?? [];
}

function expressionFor(values: boolean[], variables: string[]): string {
  const minterms = values.flatMap((value, index) => value ? [index] : []);
  if (minterms.length === 0) return '0';
  if (minterms.length === values.length) return '1';

  const patterns = chooseMinimumCover(
    primeImplicants(minterms, variables.length),
    minterms,
    variables.length
  );
  return patterns.map(pattern => {
    const literals = [...pattern].flatMap((bit, index) =>
      bit === '-' ? [] : [bit === '1' ? variables[index] : `¬${variables[index]}`]
    );
    return literals.length ? literals.join(' · ') : '1';
  }).join(' + ');
}

function createKarnaughMap(
  outputValues: boolean[],
  variables: string[]
): KarnaughMap | undefined {
  if (variables.length > 4) return undefined;
  const rowCount = Math.ceil(variables.length / 2);
  const columnCount = Math.floor(variables.length / 2);
  const rowVariables = variables.slice(0, rowCount);
  const columnVariables = variables.slice(rowCount);
  const rowLabels = grayLabels(rowCount, rowVariables);
  const columnLabels = grayLabels(columnCount, columnVariables);
  const values = rowLabels.map(rowLabel =>
    columnLabels.map(columnLabel => {
      const bits = `${rowLabel}${columnLabel}` || '0';
      const index = bits ? parseInt(bits, 2) : 0;
      return outputValues[index] ? '1' : '0';
    })
  );

  return { rowVariables, columnVariables, rowLabels, columnLabels, values };
}

export function analyzeCombinationalCircuit(circuit: CircuitState): LogicAnalysisResult {
  if (circuit.components.length > MAX_COMPONENTS) {
    throw new LogicAnalysisError(`A análise está limitada a ${MAX_COMPONENTS} componentes por circuito.`);
  }

  const unsupported = circuit.components.find(component => SEQUENTIAL_TYPES.has(component.type));
  if (unsupported) {
    throw new LogicAnalysisError('A análise atual aceita apenas circuitos combinacionais; remova clock e componentes sequenciais.');
  }

  const componentById = new Map(circuit.components.map(component => [component.id, component]));
  for (const wire of circuit.wires) {
    const from = componentById.get(wire.from.componentId);
    const to = componentById.get(wire.to.componentId);
    if (!from || !to) {
      throw new LogicAnalysisError('Há fios conectados a componentes inexistentes; corrija o circuito antes de analisar.');
    }
    const fromPort = COMPONENT_METADATA[from.type]?.getPorts(from.inputs, from.bitWidth, from)
      .find(port => port.id === wire.from.portId);
    const toPort = COMPONENT_METADATA[to.type]?.getPorts(to.inputs, to.bitWidth, to)
      .find(port => port.id === wire.to.portId);
    if (!fromPort || !toPort) {
      throw new LogicAnalysisError('Há fios conectados a portas inexistentes; corrija o circuito antes de analisar.');
    }
    if (fromPort.bitWidth !== 1 || toPort.bitWidth !== 1) {
      throw new LogicAnalysisError('A análise booleana da primeira versão aceita apenas portas de 1 bit.');
    }
  }

  const inputs = circuit.components.filter(component =>
    isInputSource(component) && connectedPortIds(circuit.wires, component.id).has('out')
  );
  const outputs = circuit.components.filter(component =>
    isOutputSink(component) && connectedPortIds(circuit.wires, component.id).has('in')
  );
  if (inputs.length === 0) {
    throw new LogicAnalysisError('Conecte pelo menos uma entrada ao circuito para gerar a tabela-verdade.');
  }
  if (outputs.length === 0) {
    throw new LogicAnalysisError('Conecte um Pino de Saída ou uma Sonda para analisar as funções.');
  }
  if (inputs.some(component => (component.bitWidth ?? 1) !== 1)) {
    throw new LogicAnalysisError('Cada entrada deve ter 1 bit; barramentos ainda não podem ser variáveis da tabela.');
  }
  if (inputs.length > MAX_INPUTS) {
    throw new LogicAnalysisError(`A análise suporta até ${MAX_INPUTS} entradas conectadas (${1 << MAX_INPUTS} linhas).`);
  }

  const variables = inputs.map((_, index) => String.fromCharCode(65 + index));
  const rows: LogicAnalysisRow[] = [];

  for (let combination = 0; combination < 1 << inputs.length; combination++) {
    const inputValues = variables.map((_, index) =>
      Boolean((combination >> (inputs.length - index - 1)) & 1)
    );
    const simulator = new Simulator();
    const isolatedComponents = circuit.components.map(component => ({
      ...component,
      state: component.state ? JSON.parse(JSON.stringify(component.state)) : undefined,
    }));
    simulator.setCircuit(isolatedComponents, circuit.wires);
    inputs.forEach((input, index) => {
      simulator.setPinValue(input.id, 'out', [inputValues[index] ? '1' : '0']);
    });
    simulator.step();
    simulator.step();

    const diagnostics = simulator.getDiagnostics();
    if (diagnostics.length > 0) {
      const diagnostic = diagnostics[0];
      throw new LogicAnalysisError(
        `Não foi possível estabilizar a combinação ${combination + 1} (${diagnostic.type}, componentes: ${diagnostic.componentIds.join(', ')}): ${diagnostic.message}`
      );
    }

    const outputValues = outputs.map(output => simulator.getPinValue(output.id, 'in')[0] ?? 'Z');
    if (outputValues.some(value => value !== '0' && value !== '1')) {
      throw new LogicAnalysisError('A análise encontrou saídas X ou Z; verifique fios desconectados, conflitos e portas tri-state.');
    }
    rows.push({ inputs: inputValues, outputs: outputValues });
  }

  const outputResults = outputs.map((output, outputIndex) => {
    const values = rows.map(row => row.outputs[outputIndex] === '1');
    return {
      id: output.id,
      name: output.label || COMPONENT_METADATA[output.type].name,
      expression: expressionFor(values, variables),
      karnaughMap: createKarnaughMap(values, variables),
    };
  });

  return {
    inputs: inputs.map((input, index) => ({
      id: input.id,
      name: input.label || COMPONENT_METADATA[input.type].name,
      variable: variables[index],
    })),
    outputs: outputResults,
    rows,
  };
}
