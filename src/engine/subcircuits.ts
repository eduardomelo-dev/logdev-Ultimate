import { getComponentDimensions, getPortWorldPosition } from './componentGeometry';
import { COMPONENT_METADATA } from './components';
import { routeOrthogonalWire } from '../canvas/wireRouter';
import { CircuitState, ComponentInstance, SubcircuitPort, Wire, WireEndpoint } from '../types/circuit';

export interface ExtractedSubcircuit {
  circuit: CircuitState;
  subcircuitId: string;
}

interface BoundaryConnection {
  inside: WireEndpoint;
  port: SubcircuitPort;
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function cloneComponent(component: ComponentInstance): ComponentInstance {
  return {
    ...component,
    state: component.state ? JSON.parse(JSON.stringify(component.state)) : undefined,
    subcircuit: component.subcircuit
      ? JSON.parse(JSON.stringify(component.subcircuit))
      : undefined,
  };
}

function translatedPoint(point: { x: number; y: number }, offsetX: number, offsetY: number) {
  return { x: point.x + offsetX, y: point.y + offsetY };
}

function translatedEndpoint(
  endpoint: WireEndpoint,
  selectedIds: Set<string>,
  subcircuitId: string,
  boundary: BoundaryConnection[]
): WireEndpoint {
  if (!selectedIds.has(endpoint.componentId)) return endpoint;
  const connection = boundary.find(item =>
    item.inside.componentId === endpoint.componentId && item.inside.portId === endpoint.portId
  );
  return connection
    ? { componentId: subcircuitId, portId: connection.port.id }
    : endpoint;
}

export function extractSubcircuit(
  circuit: CircuitState,
  selectedComponentIds: string[],
  name = 'Subcircuito'
): ExtractedSubcircuit {
  const selectedIds = new Set(selectedComponentIds);
  const selectedComponents = circuit.components.filter(component => selectedIds.has(component.id));
  if (selectedComponents.length === 0) {
    throw new Error('Selecione pelo menos um componente para criar um subcircuito.');
  }
  if (selectedComponents.length !== selectedIds.size) {
    throw new Error('A seleção contém componentes que não existem no circuito atual.');
  }
  if (selectedComponents.some(component => component.type === 'SUBCIRCUIT')) {
    throw new Error('Não é possível extrair um subcircuito que já contém outro subcircuito nesta etapa.');
  }

  const minX = Math.min(...selectedComponents.map(component => component.x));
  const minY = Math.min(...selectedComponents.map(component => component.y));
  const maxX = Math.max(...selectedComponents.map(component =>
    component.x + getComponentDimensions(component).width
  ));
  const selectedComponentSet = new Set(selectedComponents.map(component => component.id));
  const selectedById = new Map(selectedComponents.map(component => [component.id, component]));
  const boundary: BoundaryConnection[] = [];
  const interfacePortByEndpoint = new Map<string, SubcircuitPort>();
  let inputIndex = 0;
  let outputIndex = 0;

  for (const wire of circuit.wires) {
    const fromSelected = selectedComponentSet.has(wire.from.componentId);
    const toSelected = selectedComponentSet.has(wire.to.componentId);
    if (fromSelected === toSelected) continue;

    const inside = fromSelected ? wire.from : wire.to;
    const component = selectedById.get(inside.componentId);
    if (!component) continue;
    const port = COMPONENT_METADATA[component.type]
      .getPorts(component.inputs, component.bitWidth, component)
      .find(candidate => candidate.id === inside.portId);
    if (!port) {
      throw new Error(`A porta "${inside.portId}" do componente selecionado não existe.`);
    }
    if (port.type === 'inout') {
      throw new Error('Desconecte ou trate manualmente portas bidirecionais antes de extrair o subcircuito.');
    }

    const endpointKey = `${inside.componentId}:${inside.portId}`;
    let interfacePort = interfacePortByEndpoint.get(endpointKey);
    if (!interfacePort) {
      const direction = port.type;
      const index = direction === 'in' ? ++inputIndex : ++outputIndex;
      const baseName = component.label?.trim()
        ? `${component.label.trim()} ${port.name}`
        : port.name;
      interfacePort = {
        id: `${direction === 'in' ? 'in' : 'out'}_${index}`,
        name: baseName,
        direction,
        bitWidth: port.bitWidth,
        pinComponentId: createId(direction === 'in' ? 'pin_input' : 'pin_output'),
      };
      interfacePortByEndpoint.set(endpointKey, interfacePort);
    }
    boundary.push({ inside, port: interfacePort });
  }

  if (boundary.length === 0) {
    throw new Error('A seleção precisa ter pelo menos uma conexão externa para criar portas de interface.');
  }

  const subcircuitId = createId('subcircuit');
  const marginX = 200;
  const marginY = 80;
  const contentWidth = maxX - minX;
  const innerComponents = selectedComponents.map(component => ({
    ...cloneComponent(component),
    x: component.x - minX + marginX,
    y: component.y - minY + marginY,
  }));
  const innerWires = circuit.wires
    .filter(wire =>
      selectedComponentSet.has(wire.from.componentId)
      && selectedComponentSet.has(wire.to.componentId)
    )
    .map(wire => ({
      ...wire,
      from: { ...wire.from },
      to: { ...wire.to },
      points: wire.points.map(point => translatedPoint(point, -minX + marginX, -minY + marginY)),
    }));

  const interfacePins = new Map<string, ComponentInstance>();
  let inputPinIndex = 0;
  let outputPinIndex = 0;
  for (const port of new Set(boundary.map(connection => connection.port))) {
    const directionIndex = port.direction === 'in' ? inputPinIndex++ : outputPinIndex++;
    const type = port.direction === 'in' ? 'PIN_INPUT' : 'PIN_OUTPUT';
    const x = port.direction === 'in' ? 40 : contentWidth + marginX + 80;
    const y = marginY + directionIndex * 60;
    interfacePins.set(port.id, {
      id: port.pinComponentId,
      type,
      x,
      y,
      direction: 'EAST',
      label: port.name,
      bitWidth: port.bitWidth,
      state: { value: Array(port.bitWidth).fill('0') },
    });
  }

  const childComponents = [...interfacePins.values(), ...innerComponents];
  const childComponentById = new Map(childComponents.map(component => [component.id, component]));
  for (const connection of boundary) {
    const pin = interfacePins.get(connection.port.id);
    const insideComponent = childComponentById.get(connection.inside.componentId);
    if (!pin || !insideComponent) continue;

    const originalInsidePosition = getPortWorldPosition(
      selectedById.get(connection.inside.componentId)!,
      connection.inside.portId
    );
    if (!originalInsidePosition) {
      throw new Error('Não foi possível localizar uma porta conectada dentro do subcircuito.');
    }
    const translatedInside = translatedPoint(
      originalInsidePosition,
      -minX + marginX,
      -minY + marginY
    );
    const pinPortId = connection.port.direction === 'in' ? 'out' : 'in';
    const pinPosition = getPortWorldPosition(pin, pinPortId);
    if (!pinPosition) throw new Error('Não foi possível posicionar uma porta de interface.');

    const from = connection.port.direction === 'in'
      ? { componentId: pin.id, portId: pinPortId }
      : { componentId: insideComponent.id, portId: connection.inside.portId };
    const to = connection.port.direction === 'in'
      ? { componentId: insideComponent.id, portId: connection.inside.portId }
      : { componentId: pin.id, portId: pinPortId };
    const fromPoint = connection.port.direction === 'in' ? pinPosition : translatedInside;
    const toPoint = connection.port.direction === 'in' ? translatedInside : pinPosition;
    innerWires.push({
      id: createId('wire'),
      from,
      to,
      points: routeOrthogonalWire(fromPoint, toPoint),
      bitWidth: connection.port.bitWidth,
    });
  }

  for (const wire of innerWires) {
    if (wire.points.length >= 2) continue;
    const fromComponent = childComponentById.get(wire.from.componentId);
    const toComponent = childComponentById.get(wire.to.componentId);
    const fromPoint = fromComponent && getPortWorldPosition(fromComponent, wire.from.portId);
    const toPoint = toComponent && getPortWorldPosition(toComponent, wire.to.portId);
    if (!fromPoint || !toPoint) {
      throw new Error('Não foi possível reconstruir uma conexão interna do subcircuito.');
    }
    wire.points = routeOrthogonalWire(fromPoint, toPoint);
  }

  const subcircuitPorts = [...interfacePortByEndpoint.values()];
  const subcircuit: ComponentInstance = {
    id: subcircuitId,
    type: 'SUBCIRCUIT',
    x: minX,
    y: minY,
    direction: 'EAST',
    label: name,
    subcircuit: {
      name,
      circuit: { components: childComponents, wires: innerWires },
      ports: subcircuitPorts,
    },
  };

  const nextComponents = circuit.components.filter(component => !selectedComponentSet.has(component.id));
  const insertionIndex = Math.min(
    circuit.components.findIndex(component => selectedComponentSet.has(component.id)),
    nextComponents.length
  );
  nextComponents.splice(insertionIndex, 0, subcircuit);

  const nextWires: Wire[] = [];
  for (const wire of circuit.wires) {
    const fromSelected = selectedComponentSet.has(wire.from.componentId);
    const toSelected = selectedComponentSet.has(wire.to.componentId);
    if (fromSelected && toSelected) continue;

    const from = translatedEndpoint(wire.from, selectedComponentSet, subcircuitId, boundary);
    const to = translatedEndpoint(wire.to, selectedComponentSet, subcircuitId, boundary);
    const fromComponent = nextComponents.find(component => component.id === from.componentId);
    const toComponent = nextComponents.find(component => component.id === to.componentId);
    const fromPoint = fromComponent && getPortWorldPosition(fromComponent, from.portId);
    const toPoint = toComponent && getPortWorldPosition(toComponent, to.portId);
    if (!fromPoint || !toPoint) {
      throw new Error('Não foi possível religar um fio externo ao subcircuito.');
    }
    nextWires.push({
      ...wire,
      from,
      to,
      points: routeOrthogonalWire(fromPoint, toPoint),
    });
  }

  return {
    circuit: { components: nextComponents, wires: nextWires },
    subcircuitId,
  };
}
