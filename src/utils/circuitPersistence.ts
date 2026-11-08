import { COMPONENT_METADATA } from '../engine/components';
import { CircuitState, ComponentInstance, Wire } from '../types/circuit';

export const AUTOSAVE_STORAGE_KEY = 'logdev-ultimate:autosave:v1';

const DIRECTIONS = ['NORTH', 'EAST', 'SOUTH', 'WEST'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isComponentInstance(value: unknown): value is ComponentInstance {
  if (!isRecord(value)) return false;
  const state = value.state;
  const validState = state === undefined || (
    isRecord(state)
    && (state.value === undefined || isLogicVector(state.value))
    && (state.q === undefined || isLogicVector(state.q) || isLogicValue(state.q))
  );
  return typeof value.id === 'string' && value.id.length > 0
    && typeof value.type === 'string'
    && Object.prototype.hasOwnProperty.call(COMPONENT_METADATA, value.type)
    && typeof value.x === 'number' && Number.isFinite(value.x)
    && typeof value.y === 'number' && Number.isFinite(value.y)
    && (value.direction === undefined
      || (typeof value.direction === 'string' && DIRECTIONS.some(direction => direction === value.direction)))
    && (value.label === undefined || typeof value.label === 'string')
    && (value.bitWidth === undefined
      || (typeof value.bitWidth === 'number'
        && Number.isInteger(value.bitWidth) && value.bitWidth >= 1 && value.bitWidth <= 32))
    && (value.inputs === undefined
      || (typeof value.inputs === 'number'
        && Number.isInteger(value.inputs) && value.inputs >= 2 && value.inputs <= 8))
    && validState;
}

function isLogicValue(value: unknown): boolean {
  return value === '0' || value === '1' || value === 'X' || value === 'Z';
}

function isLogicVector(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0 && value.every(isLogicValue);
}

function isPoint(value: unknown): value is { x: number; y: number } {
  return isRecord(value)
    && typeof value.x === 'number' && Number.isFinite(value.x)
    && typeof value.y === 'number' && Number.isFinite(value.y);
}

function isEndpoint(value: unknown): value is { componentId: string; portId: string } {
  return isRecord(value) && typeof value.componentId === 'string' && typeof value.portId === 'string';
}

export function parseCircuitData(data: unknown): CircuitState {
  const root = isRecord(data) && isRecord(data.circuit) ? data.circuit : data;
  if (!isRecord(root) || !Array.isArray(root.components) || !Array.isArray(root.wires)) {
    throw new Error('O arquivo não contém uma estrutura de circuito válida.');
  }

  if (!root.components.every(isComponentInstance)) {
    throw new Error('O circuito contém componentes inválidos.');
  }
  const components = root.components;
  const componentMap = new Map(components.map(component => [component.id, component]));
  if (componentMap.size !== components.length) {
    throw new Error('O circuito contém identificadores de componente duplicados.');
  }

  const validWires = root.wires.every((wire): wire is Wire => {
    if (!isRecord(wire) || typeof wire.id !== 'string'
      || (wire.bitWidth !== undefined
        && (typeof wire.bitWidth !== 'number' || !Number.isInteger(wire.bitWidth)
          || wire.bitWidth < 1 || wire.bitWidth > 32))
      || !isEndpoint(wire.from) || !isEndpoint(wire.to)
      || !Array.isArray(wire.points) || wire.points.length < 2
      || !wire.points.every(isPoint)) return false;

    const fromEndpoint = wire.from;
    const toEndpoint = wire.to;
    const fromComponent = componentMap.get(fromEndpoint.componentId);
    const toComponent = componentMap.get(toEndpoint.componentId);
    if (!fromComponent || !toComponent) return false;
    return COMPONENT_METADATA[fromComponent.type]
      .getPorts(fromComponent.inputs, fromComponent.bitWidth)
      .some(port => port.id === fromEndpoint.portId)
      && COMPONENT_METADATA[toComponent.type]
        .getPorts(toComponent.inputs, toComponent.bitWidth)
        .some(port => port.id === toEndpoint.portId);
  });
  if (!validWires) {
    throw new Error('O circuito contém conexões ou pontos de fio inválidos.');
  }
  const wires = root.wires;
  if (new Set(wires.map(wire => wire.id)).size !== wires.length) {
    throw new Error('O circuito contém identificadores de conexão duplicados.');
  }

  return { components, wires };
}

export function serializeCircuitData(circuit: CircuitState): string {
  return JSON.stringify({ version: 1, savedAt: new Date().toISOString(), circuit });
}
