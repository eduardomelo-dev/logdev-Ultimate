import { ComponentCategory, ComponentType, Port } from '../types/circuit';

export interface ComponentMetadata {
  type: ComponentType;
  name: string;
  category: ComponentCategory;
  description: string;
  width: number;
  height: number;
  getPorts: (inputs?: number, bitWidth?: number) => Port[];
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
    getPorts: () => [
      { id: 'combined', name: 'Barramento', type: 'inout', bitWidth: 2, relX: 0, relY: 30 },
      { id: 'bit0', name: 'Bit 0', type: 'inout', bitWidth: 1, relX: 20, relY: 10 },
      { id: 'bit1', name: 'Bit 1', type: 'inout', bitWidth: 1, relX: 20, relY: 50 },
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

  // --- PLEXERS ---
  MULTIPLEXER: {
    type: 'MULTIPLEXER',
    name: 'Multiplexador (MUX)',
    category: 'plexers',
    description: 'Seleciona entre múltiplas entradas de dados',
    width: 50,
    height: 60,
    getPorts: (_, bitWidth = 1) => [
      { id: 'in0', name: 'Entrada 0', type: 'in', bitWidth, relX: 0, relY: 15 },
      { id: 'in1', name: 'Entrada 1', type: 'in', bitWidth, relX: 0, relY: 45 },
      { id: 'sel', name: 'Seleção', type: 'in', bitWidth: 1, relX: 25, relY: 60 },
      { id: 'out', name: 'Saída', type: 'out', bitWidth, relX: 50, relY: 30 },
    ],
  },
  DEMULTIPLEXER: {
    type: 'DEMULTIPLEXER',
    name: 'Demultiplexador (DEMUX)',
    category: 'plexers',
    description: 'Encaminha a entrada para uma das saídas',
    width: 50,
    height: 60,
    getPorts: (_, bitWidth = 1) => [
      { id: 'in', name: 'Entrada', type: 'in', bitWidth, relX: 0, relY: 30 },
      { id: 'sel', name: 'Seleção', type: 'in', bitWidth: 1, relX: 25, relY: 60 },
      { id: 'out0', name: 'Saída 0', type: 'out', bitWidth, relX: 50, relY: 15 },
      { id: 'out1', name: 'Saída 1', type: 'out', bitWidth, relX: 50, relY: 45 },
    ],
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
};
