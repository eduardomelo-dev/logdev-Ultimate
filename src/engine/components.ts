import { ComponentCategory, ComponentInstance, ComponentType, Port } from '../types/circuit';

export interface ComponentMetadata {
  type: ComponentType;
  name: string;
  category: ComponentCategory;
  description: string;
  width: number;
  height: number;
  getPorts: (inputs?: number, bitWidth?: number, component?: ComponentInstance) => Port[];
}

export const COMPONENT_METADATA: Record<ComponentType, ComponentMetadata> = {
  // --- WIRING ---
  PIN_INPUT: {
    type: 'PIN_INPUT',
    name: 'Pino de Entrada',
    category: 'wiring',
    description: 'Fornece sinal binário ou barramento manual',
    width: 40,
    height: 40,
    getPorts: (_, bitWidth = 1) => [
      { id: 'out', name: 'Saída', type: 'out', bitWidth, relX: 40, relY: 20 },
    ],
  },
  PIN_OUTPUT: {
    type: 'PIN_OUTPUT',
    name: 'Pino de Saída',
    category: 'wiring',
    description: 'Lê e exibe o sinal de uma conexão',
    width: 40,
    height: 40,
    getPorts: (_, bitWidth = 1) => [
      { id: 'in', name: 'Entrada', type: 'in', bitWidth, relX: 0, relY: 20 },
    ],
  },
  CLOCK: {
    type: 'CLOCK',
    name: 'Clock',
    category: 'wiring',
    description: 'Gera pulsos oscilantes periódicos',
    width: 40,
    height: 40,
    getPorts: () => [
      { id: 'out', name: 'Clock', type: 'out', bitWidth: 1, relX: 40, relY: 20 },
    ],
  },
  CONSTANT: {
    type: 'CONSTANT',
    name: 'Constante',
    category: 'wiring',
    description: 'Emite um valor lógico fixo (0 ou 1)',
    width: 40,
    height: 40,
    getPorts: (_, bitWidth = 1) => [
      { id: 'out', name: 'Constante', type: 'out', bitWidth, relX: 40, relY: 20 },
    ],
  },
  PROBE: {
    type: 'PROBE',
    name: 'Sonda (Probe)',
    category: 'wiring',
    description: 'Mede e exibe o valor lógico do fio em tempo real',
    width: 40,
    height: 40,
    getPorts: (_, bitWidth = 1) => [
      { id: 'in', name: 'Entrada', type: 'in', bitWidth, relX: 0, relY: 20 },
    ],
  },
  SPLITTER: {
    type: 'SPLITTER',
    name: 'Divisor / Unificador',
    category: 'wiring',
    description: 'Separa barramentos ou junta fios individuais',
    width: 20,
    height: 60,
    getPorts: (_, bitWidth = 2) => {
      const width = Math.max(2, Math.min(32, Math.floor(bitWidth)));
      const height = Math.max(60, (width - 1) * 20 + 20);
      return [
        { id: 'combined', name: `Barramento (${width} bits)`, type: 'inout', bitWidth: width, relX: 0, relY: height / 2 },
        ...Array.from({ length: width }, (_, index): Port => ({
          id: `bit${index}`,
          name: `Bit ${index}`,
          type: 'inout',
          bitWidth: 1,
          relX: 20,
          relY: 10 + index * 20,
        })),
      ];
    },
  },
  JUNCTION: {
    type: 'JUNCTION',
    name: 'Junção',
    category: 'wiring',
    description: 'Une fios que passam por este ponto e permite criar ramificações',
    width: 20,
    height: 20,
    getPorts: (_, bitWidth = 1) => [
      { id: 'node', name: 'Junção', type: 'inout', bitWidth, relX: 10, relY: 10 },
    ],
  },

  // --- GATES ---
  AND: {
    type: 'AND',
    name: 'Porta AND',
    category: 'gates',
    description: 'Saída 1 se todas as entradas forem 1',
    width: 60,
    height: 50,
    getPorts: (inputs = 2, bitWidth = 1) => {
      const ports: Port[] = [];
      const step = 50 / (inputs + 1);
      for (let i = 0; i < inputs; i++) {
        ports.push({
          id: `in${i}`,
          name: `Entrada ${i}`,
          type: 'in',
          bitWidth,
          relX: 0,
          relY: Math.round(step * (i + 1)),
        });
      }
      ports.push({ id: 'out', name: 'Saída', type: 'out', bitWidth, relX: 60, relY: 25 });
      return ports;
    },
  },
  OR: {
    type: 'OR',
    name: 'Porta OR',
    category: 'gates',
    description: 'Saída 1 se qualquer entrada for 1',
    width: 60,
    height: 50,
    getPorts: (inputs = 2, bitWidth = 1) => {
      const ports: Port[] = [];
      const step = 50 / (inputs + 1);
      for (let i = 0; i < inputs; i++) {
        ports.push({
          id: `in${i}`,
          name: `Entrada ${i}`,
          type: 'in',
          bitWidth,
          relX: 0,
          relY: Math.round(step * (i + 1)),
        });
      }
      ports.push({ id: 'out', name: 'Saída', type: 'out', bitWidth, relX: 60, relY: 25 });
      return ports;
    },
  },
  NOT: {
    type: 'NOT',
    name: 'Porta NOT (Inversor)',
    category: 'gates',
    description: 'Inverte o sinal lógico de entrada',
    width: 60,
    height: 40,
    getPorts: (_, bitWidth = 1) => [
      { id: 'in', name: 'Entrada', type: 'in', bitWidth, relX: 0, relY: 20 },
      { id: 'out', name: 'Saída', type: 'out', bitWidth, relX: 60, relY: 20 },
    ],
  },
  NAND: {
    type: 'NAND',
    name: 'Porta NAND',
    category: 'gates',
    description: 'Inverso da porta AND',
    width: 60,
    height: 50,
    getPorts: (inputs = 2, bitWidth = 1) => {
      const ports: Port[] = [];
      const step = 50 / (inputs + 1);
      for (let i = 0; i < inputs; i++) {
        ports.push({
          id: `in${i}`,
          name: `Entrada ${i}`,
          type: 'in',
          bitWidth,
          relX: 0,
          relY: Math.round(step * (i + 1)),
        });
      }
      ports.push({ id: 'out', name: 'Saída', type: 'out', bitWidth, relX: 60, relY: 25 });
      return ports;
    },
  },
  NOR: {
    type: 'NOR',
    name: 'Porta NOR',
    category: 'gates',
    description: 'Inverso da porta OR',
    width: 60,
    height: 50,
    getPorts: (inputs = 2, bitWidth = 1) => {
      const ports: Port[] = [];
      const step = 50 / (inputs + 1);
      for (let i = 0; i < inputs; i++) {
        ports.push({
          id: `in${i}`,
          name: `Entrada ${i}`,
          type: 'in',
          bitWidth,
          relX: 0,
          relY: Math.round(step * (i + 1)),
        });
      }
      ports.push({ id: 'out', name: 'Saída', type: 'out', bitWidth, relX: 60, relY: 25 });
      return ports;
    },
  },
  XOR: {
    type: 'XOR',
    name: 'Porta XOR',
    category: 'gates',
    description: 'Saída 1 se o número de entradas 1 for ímpar',
    width: 60,
    height: 50,
    getPorts: (inputs = 2, bitWidth = 1) => {
      const ports: Port[] = [];
      const step = 50 / (inputs + 1);
      for (let i = 0; i < inputs; i++) {
        ports.push({
          id: `in${i}`,
          name: `Entrada ${i}`,
          type: 'in',
          bitWidth,
          relX: 0,
          relY: Math.round(step * (i + 1)),
        });
      }
      ports.push({ id: 'out', name: 'Saída', type: 'out', bitWidth, relX: 60, relY: 25 });
      return ports;
    },
  },
  XNOR: {
    type: 'XNOR',
    name: 'Porta XNOR',
    category: 'gates',
    description: 'Inverso da porta XOR',
    width: 60,
    height: 50,
    getPorts: (inputs = 2, bitWidth = 1) => {
      const ports: Port[] = [];
      const step = 50 / (inputs + 1);
      for (let i = 0; i < inputs; i++) {
        ports.push({
          id: `in${i}`,
          name: `Entrada ${i}`,
          type: 'in',
          bitWidth,
          relX: 0,
          relY: Math.round(step * (i + 1)),
        });
      }
      ports.push({ id: 'out', name: 'Saída', type: 'out', bitWidth, relX: 60, relY: 25 });
      return ports;
    },
  },
  BUFFER: {
    type: 'BUFFER',
    name: 'Buffer',
    category: 'gates',
    description: 'Repassa o sinal inalterado',
    width: 50,
    height: 40,
    getPorts: (_, bitWidth = 1) => [
      { id: 'in', name: 'Entrada', type: 'in', bitWidth, relX: 0, relY: 20 },
      { id: 'out', name: 'Saída', type: 'out', bitWidth, relX: 50, relY: 20 },
    ],
  },
  TRISTATE: {
    type: 'TRISTATE',
    name: 'Buffer Tri-State',
    category: 'gates',
    description: 'Buffer controlado por sinal de habilitação',
    width: 50,
    height: 40,
    getPorts: (_, bitWidth = 1) => [
      { id: 'in', name: 'Dados', type: 'in', bitWidth, relX: 0, relY: 20 },
      { id: 'enable', name: 'Habilitar', type: 'in', bitWidth: 1, relX: 25, relY: 40 },
      { id: 'out', name: 'Saída', type: 'out', bitWidth, relX: 50, relY: 20 },
    ],
  },

  // --- ARITHMETIC ---
  ADDER: {
    type: 'ADDER',
    name: 'Somador',
    category: 'arithmetic',
    description: 'Soma dois barramentos com carry de entrada e saída',
    width: 90,
    height: 80,
    getPorts: (_, bitWidth = 4) => [
      { id: 'a', name: 'A', type: 'in', bitWidth, relX: 0, relY: 20 },
      { id: 'b', name: 'B', type: 'in', bitWidth, relX: 0, relY: 40 },
      { id: 'carryIn', name: 'Carry in', type: 'in', bitWidth: 1, relX: 0, relY: 60 },
      { id: 'sum', name: 'Soma', type: 'out', bitWidth, relX: 90, relY: 30 },
      { id: 'carryOut', name: 'Carry out', type: 'out', bitWidth: 1, relX: 90, relY: 60 },
    ],
  },

  // --- PLEXERS ---
  MULTIPLEXER: {
    type: 'MULTIPLEXER',
    name: 'Multiplexador (MUX)',
    category: 'plexers',
    description: 'Seleciona entre 2, 4 ou 8 entradas de dados',
    width: 50,
    height: 60,
    getPorts: (inputs = 2, bitWidth = 1) => {
      const inputCount = Math.max(2, Math.min(8, Math.floor(inputs)));
      const height = Math.max(60, (inputCount + 1) * 20);
      const ports: Port[] = Array.from({ length: inputCount }, (_, index) => ({
        id: `in${index}`,
        name: `Entrada ${index}`,
        type: 'in',
        bitWidth,
        relX: 0,
        relY: Math.round(height * (index + 1) / (inputCount + 1)),
      }));
      ports.push(
        { id: 'sel', name: 'Seleção', type: 'in', bitWidth: Math.ceil(Math.log2(inputCount)), relX: 25, relY: height },
        { id: 'out', name: 'Saída', type: 'out', bitWidth, relX: 50, relY: height / 2 },
      );
      return ports;
    },
  },
  DEMULTIPLEXER: {
    type: 'DEMULTIPLEXER',
    name: 'Demultiplexador (DEMUX)',
    category: 'plexers',
    description: 'Encaminha a entrada para 2, 4 ou 8 saídas',
    width: 50,
    height: 60,
    getPorts: (inputs = 2, bitWidth = 1) => {
      const outputCount = Math.max(2, Math.min(8, Math.floor(inputs)));
      const height = Math.max(60, (outputCount + 1) * 20);
      const ports: Port[] = [
        { id: 'in', name: 'Entrada', type: 'in', bitWidth, relX: 0, relY: height / 2 },
        { id: 'sel', name: 'Seleção', type: 'in', bitWidth: Math.ceil(Math.log2(outputCount)), relX: 25, relY: height },
      ];
      ports.push(...Array.from({ length: outputCount }, (_, index) => ({
        id: `out${index}`,
        name: `Saída ${index}`,
        type: 'out' as const,
        bitWidth,
        relX: 50,
        relY: Math.round(height * (index + 1) / (outputCount + 1)),
      })));
      return ports;
    },
  },
  DECODER: {
    type: 'DECODER',
    name: 'Decodificador',
    category: 'plexers',
    description: 'Ativa uma saída one-hot conforme o endereço binário',
    width: 80,
    height: 80,
    getPorts: (_, bitWidth = 2) => {
      const selectWidth = Math.max(1, Math.min(5, Math.floor(bitWidth)));
      const outputCount = 2 ** selectWidth;
      const height = Math.max(80, (outputCount + 1) * 12);
      return [
        { id: 'sel', name: 'Endereço', type: 'in', bitWidth: selectWidth, relX: 0, relY: height / 2 },
        { id: 'enable', name: 'Habilitar', type: 'in', bitWidth: 1, relX: 40, relY: height },
        ...Array.from({ length: outputCount }, (_, index): Port => ({
          id: `out${index}`,
          name: `Saída ${index}`,
          type: 'out',
          bitWidth: 1,
          relX: 80,
          relY: Math.round(height * (index + 1) / (outputCount + 1)),
        })),
      ];
    },
  },
  PRIORITY_ENCODER: {
    type: 'PRIORITY_ENCODER',
    name: 'Codificador Prioritário',
    category: 'plexers',
    description: 'Codifica em binário a entrada ativa de maior índice',
    width: 80,
    height: 80,
    getPorts: (_, bitWidth = 4) => {
      const inputCount = Math.max(2, Math.min(32, Math.floor(bitWidth)));
      const codeWidth = Math.ceil(Math.log2(inputCount));
      const height = Math.max(80, (inputCount + 1) * 12);
      return [
        { id: 'in', name: 'Solicitações', type: 'in', bitWidth: inputCount, relX: 0, relY: height / 2 },
        { id: 'code', name: 'Código', type: 'out', bitWidth: codeWidth, relX: 80, relY: height / 2 - 12 },
        { id: 'valid', name: 'Válido', type: 'out', bitWidth: 1, relX: 80, relY: height / 2 + 12 },
      ];
    },
  },

  // --- MEMORY ---
  D_FLIP_FLOP: {
    type: 'D_FLIP_FLOP',
    name: 'Flip-Flop D',
    category: 'memory',
    description: 'Armazena 1 bit sincronizado na borda de subida do clock',
    width: 60,
    height: 60,
    getPorts: () => [
      { id: 'd', name: 'D (Dados)', type: 'in', bitWidth: 1, relX: 0, relY: 15 },
      { id: 'clk', name: 'Clock', type: 'in', bitWidth: 1, relX: 0, relY: 45 },
      { id: 'q', name: 'Q', type: 'out', bitWidth: 1, relX: 60, relY: 15 },
      { id: 'qBar', name: '~Q', type: 'out', bitWidth: 1, relX: 60, relY: 45 },
    ],
  },
  REGISTER: {
    type: 'REGISTER',
    name: 'Registrador Multi-bit',
    category: 'memory',
    description: 'Armazena barramento com sinal de clock e escrita',
    width: 70,
    height: 60,
    getPorts: (_, bitWidth = 4) => [
      { id: 'd', name: 'D (Entrada)', type: 'in', bitWidth, relX: 0, relY: 15 },
      { id: 'clk', name: 'Clock', type: 'in', bitWidth: 1, relX: 0, relY: 45 },
      { id: 'en', name: 'Write Enable', type: 'in', bitWidth: 1, relX: 35, relY: 60 },
      { id: 'q', name: 'Q (Saída)', type: 'out', bitWidth, relX: 70, relY: 30 },
    ],
  },

  // --- INPUT/OUTPUT ---
  BUTTON: {
    type: 'BUTTON',
    name: 'Botão Pulsador',
    category: 'io',
    description: 'Emite 1 momentaneamente enquanto pressionado',
    width: 40,
    height: 40,
    getPorts: () => [
      { id: 'out', name: 'Saída', type: 'out', bitWidth: 1, relX: 40, relY: 20 },
    ],
  },
  SWITCH: {
    type: 'SWITCH',
    name: 'Chave Alavanca (Switch)',
    category: 'io',
    description: 'Chave liga/desliga com estado retido',
    width: 40,
    height: 40,
    getPorts: () => [
      { id: 'out', name: 'Saída', type: 'out', bitWidth: 1, relX: 40, relY: 20 },
    ],
  },
  LED: {
    type: 'LED',
    name: 'LED Individual',
    category: 'io',
    description: 'Acende quando o sinal for 1',
    width: 40,
    height: 40,
    getPorts: () => [
      { id: 'in', name: 'Anodo', type: 'in', bitWidth: 1, relX: 0, relY: 20 },
    ],
  },
  SEVEN_SEGMENT: {
    type: 'SEVEN_SEGMENT',
    name: 'Display 7 Segmentos',
    category: 'io',
    description: 'Display de 7 segmentos controlado individualmente (A-G + Ponto)',
    width: 60,
    height: 80,
    getPorts: () => [
      { id: 'a', name: 'Seg A', type: 'in', bitWidth: 1, relX: 10, relY: 0 },
      { id: 'b', name: 'Seg B', type: 'in', bitWidth: 1, relX: 20, relY: 0 },
      { id: 'c', name: 'Seg C', type: 'in', bitWidth: 1, relX: 30, relY: 0 },
      { id: 'd', name: 'Seg D', type: 'in', bitWidth: 1, relX: 40, relY: 0 },
      { id: 'e', name: 'Seg E', type: 'in', bitWidth: 1, relX: 10, relY: 80 },
      { id: 'f', name: 'Seg F', type: 'in', bitWidth: 1, relX: 20, relY: 80 },
      { id: 'g', name: 'Seg G', type: 'in', bitWidth: 1, relX: 30, relY: 80 },
      { id: 'dp', name: 'Ponto DP', type: 'in', bitWidth: 1, relX: 40, relY: 80 },
    ],
  },
  HEX_DISPLAY: {
    type: 'HEX_DISPLAY',
    name: 'Display Hexadecimal',
    category: 'io',
    description: 'Decodifica e exibe valor numérico de 4 bits em Hex (0-F)',
    width: 60,
    height: 80,
    getPorts: () => [
      { id: 'in', name: 'Entrada (4 bits)', type: 'in', bitWidth: 4, relX: 30, relY: 80 },
    ],
  },
  SUBCIRCUIT: {
    type: 'SUBCIRCUIT',
    name: 'Subcircuito',
    category: 'wiring',
    description: 'Bloco hierárquico reutilizável criado a partir de uma seleção',
    width: 120,
    height: 60,
    getPorts: (_, __, component) => {
      const ports = component?.subcircuit?.ports ?? [];
      const inputCount = ports.filter(port => port.direction === 'in').length;
      const outputCount = ports.filter(port => port.direction === 'out').length;
      const count = Math.max(inputCount, outputCount);
      const height = Math.max(60, (count + 1) * 20);
      let inputIndex = 0;
      let outputIndex = 0;

      return ports.map(port => {
        const sideCount = port.direction === 'in' ? inputCount : outputCount;
        const index = port.direction === 'in' ? inputIndex++ : outputIndex++;
        return {
          id: port.id,
          name: port.name,
          type: port.direction,
          bitWidth: port.bitWidth,
          relX: port.direction === 'in' ? 0 : 120,
          relY: Math.round(height * (index + 1) / (sideCount + 1)),
        };
      });
    },
  },
};
