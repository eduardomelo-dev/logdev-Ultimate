import React, { useEffect, useMemo, useState } from 'react';
import { Play, Plus, Trash2 } from 'lucide-react';
import { runTestVectors, TestVector, TestVectorError, TestVectorResult, getTestVectorSignals } from '../engine/testVectors';
import { ComponentInstance, CircuitState, LogicValue } from '../types/circuit';
import { COMPONENT_METADATA } from '../engine/components';
import { useCircuitStore } from '../store/circuitStore';

const MAX_TEST_VECTORS = 64;
const LOGIC_VALUES: LogicValue[] = ['0', '1', 'X', 'Z'];

function isLogicValue(value: string): value is LogicValue {
  return LOGIC_VALUES.some(candidate => candidate === value);
}

function isOneBit(component: ComponentInstance, portId: string): boolean {
  return COMPONENT_METADATA[component.type]?.getPorts(component.inputs, component.bitWidth, component)
    .find(port => port.id === portId)?.bitWidth === 1;
}

function createVector(inputs: ComponentInstance[], outputs: ComponentInstance[]): TestVector {
  return {
    inputs: inputs.reduce<Record<string, LogicValue>>((values, input) => {
      values[input.id] = '0';
      return values;
    }, {}),
    expectedOutputs: outputs.reduce<Record<string, LogicValue>>((values, output) => {
      values[output.id] = '0';
      return values;
    }, {}),
  };
}

export const TestVectorPanel: React.FC = () => {
  const { components, wires } = useCircuitStore();
  const circuit: CircuitState = { components, wires };
  const signals = useMemo(() => getTestVectorSignals(circuit), [components, wires]);
  const supportedInputs = signals.inputs.filter(input => isOneBit(input, 'out'));
  const supportedOutputs = signals.outputs.filter(output => isOneBit(output, 'in'));
  const circuitSignature = JSON.stringify([
    components.map(({ id, type, inputs, bitWidth, label }) => ({ id, type, inputs, bitWidth, label })),
    wires.map(({ from, to }) => ({ from, to })),
  ]);
  const [vectors, setVectors] = useState<TestVector[]>([]);
  const [results, setResults] = useState<TestVectorResult[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setVectors([createVector(supportedInputs, supportedOutputs)]);
    setResults(null);
    setError('');
  }, [circuitSignature]);

  const updateVector = (
    index: number,
    field: 'inputs' | 'expectedOutputs',
    signalId: string,
    value: LogicValue
  ) => {
    setVectors(current => current.map((vector, vectorIndex) =>
      vectorIndex === index
        ? { ...vector, [field]: { ...vector[field], [signalId]: value } }
        : vector
    ));
    setResults(null);
  };

  const run = () => {
    try {
      setResults(runTestVectors(circuit, vectors));
      setError('');
    } catch (cause) {
      setResults(null);
      setError(cause instanceof TestVectorError || cause instanceof Error
        ? cause.message
        : 'Erro inesperado ao executar os vetores.');
    }
  };

  const addVector = () => {
    if (vectors.length >= MAX_TEST_VECTORS) return;
    setVectors(current => [...current, createVector(supportedInputs, supportedOutputs)]);
    setResults(null);
  };

  const passingCount = results?.filter(result => result.passed).length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Vetores de teste
          </h3>
          <p className="mt-1 text-[11px] text-slate-500">
            Defina entradas e saídas esperadas. As linhas são executadas em sequência em uma simulação isolada.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={addVector}
            disabled={vectors.length >= MAX_TEST_VECTORS || supportedInputs.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar vetor
          </button>
          <button
            onClick={run}
            disabled={vectors.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-800/80 bg-emerald-950/50 px-3 py-2 text-xs font-medium text-emerald-200 transition hover:bg-emerald-900/50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Play className="h-3.5 w-3.5" />
            Executar
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-amber-900/70 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
          {error}
        </div>
      )}

      {(supportedInputs.length === 0 || supportedOutputs.length === 0) && !error && (
        <p className="rounded-lg border border-slate-800 bg-slate-950/50 p-4 text-xs text-slate-500">
          Conecte entradas controláveis e Pinos de Saída ou Sondas de 1 bit para montar vetores.
        </p>
      )}

      <div className="max-h-[55vh] overflow-auto rounded-lg border border-slate-800">
        <table className="w-full border-collapse text-center text-xs">
          <thead className="sticky top-0 bg-slate-800 text-slate-300">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              {supportedInputs.map(input => (
                <th key={`input-${input.id}`} className="min-w-24 px-2 py-2">
                  {input.label || COMPONENT_METADATA[input.type].name}
                </th>
              ))}
              {supportedOutputs.map(output => (
                <th key={`expected-${output.id}`} className="min-w-24 border-l border-slate-700 px-2 py-2">
                  {output.label || COMPONENT_METADATA[output.type].name} esperado
                </th>
              ))}
              {results && supportedOutputs.map(output => (
                <th key={`actual-${output.id}`} className="min-w-20 px-2 py-2">
                  {output.label || COMPONENT_METADATA[output.type].name} obtido
                </th>
              ))}
              <th className="px-3 py-2">Resultado</th>
              <th className="px-2 py-2" aria-label="Remover vetor" />
            </tr>
          </thead>
          <tbody>
            {vectors.map((vector, index) => {
              const result = results?.[index];
              return (
                <tr key={index} className="border-t border-slate-800 text-slate-300 even:bg-slate-800/25">
                  <th className="px-3 py-2 text-left font-mono">{index + 1}</th>
                  {supportedInputs.map(input => (
                    <td key={`input-${input.id}`} className="px-2 py-1.5">
                      <select
                        aria-label={`Vetor ${index + 1} entrada ${input.label || input.id}`}
                        value={vector.inputs[input.id]}
                        onChange={event => {
                          const value = event.currentTarget.value;
                          if (isLogicValue(value)) updateVector(index, 'inputs', input.id, value);
                        }}
                        className="rounded border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-slate-100"
                      >
                        {LOGIC_VALUES.map(value => <option key={value} value={value}>{value}</option>)}
                      </select>
                    </td>
                  ))}
                  {supportedOutputs.map(output => (
                    <td key={`expected-${output.id}`} className="border-l border-slate-800 px-2 py-1.5">
                      <select
                        aria-label={`Vetor ${index + 1} esperado ${output.label || output.id}`}
                        value={vector.expectedOutputs[output.id]}
                        onChange={event => {
                          const value = event.currentTarget.value;
                          if (isLogicValue(value)) updateVector(index, 'expectedOutputs', output.id, value);
                        }}
                        className="rounded border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-slate-100"
                      >
                        {LOGIC_VALUES.map(value => <option key={value} value={value}>{value}</option>)}
                      </select>
                    </td>
                  ))}
                  {results && supportedOutputs.map(output => (
                    <td key={`actual-${output.id}`} className="px-2 py-1.5 font-mono text-slate-200">
                      {result?.actualOutputs[output.id] ?? '—'}
                    </td>
                  ))}
                  <td className="px-2 py-1.5">
                    {result ? (
                      <span
                        title={result.diagnostic}
                        className={`rounded px-2 py-1 text-[10px] font-semibold ${
                          result.passed
                            ? 'bg-emerald-950 text-emerald-300'
                            : 'bg-red-950 text-red-300'
                        }`}
                      >
                        {result.passed ? 'PASSOU' : 'FALHOU'}
                      </span>
                    ) : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="px-2 py-1.5">
                    <button
                      onClick={() => {
                        if (vectors.length <= 1) return;
                        setVectors(current => current.filter((_, vectorIndex) => vectorIndex !== index));
                        setResults(null);
                      }}
                      disabled={vectors.length <= 1}
                      aria-label={`Remover vetor ${index + 1}`}
                      className="rounded p-1 text-slate-500 transition hover:bg-red-950/40 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {results && (
        <div role="status" className="text-xs text-slate-300">
          {passingCount} de {results.length} vetores passaram.
        </div>
      )}
      <p className="text-[11px] text-slate-500">
        Até {MAX_TEST_VECTORS} vetores por execução; valores 0, 1, X e Z são aceitos. Clock pode ser controlado como entrada.
      </p>
    </div>
  );
};
