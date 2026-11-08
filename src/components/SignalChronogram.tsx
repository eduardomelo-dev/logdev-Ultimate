import React, { useMemo } from 'react';
import { COMPONENT_METADATA } from '../engine/components';
import { LogicValue, WireEndpoint } from '../types/circuit';
import { getSignalTraceKey, useCircuitStore } from '../store/circuitStore';

interface SignalOption extends WireEndpoint {
  key: string;
  label: string;
}

const MAX_SELECTED_SIGNALS = 8;
const SAMPLE_SPACING = 28;

function getSignalLevel(value: LogicValue): number {
  if (value === '1') return 9;
  if (value === '0') return 35;
  return 22;
}

function getSignalColor(value: LogicValue): string {
  if (value === '1') return '#4ade80';
  if (value === '0') return '#94a3b8';
  if (value === 'X') return '#f87171';
  return '#38bdf8';
}

export const SignalChronogram: React.FC = () => {
  const {
    components,
    wires,
    tracedSignals,
    signalHistory,
    setTracedSignals,
  } = useCircuitStore();

  const options = useMemo(() => {
    const componentById = new Map(components.map(component => [component.id, component]));
    const endpoints = new Map<string, WireEndpoint>();
    for (const wire of wires) {
      endpoints.set(getSignalTraceKey(wire.from), wire.from);
      endpoints.set(getSignalTraceKey(wire.to), wire.to);
    }

    return [...endpoints.values()].flatMap(endpoint => {
      const component = componentById.get(endpoint.componentId);
      if (!component) return [];
      const metadata = COMPONENT_METADATA[component.type];
      if (!metadata) return [];
      const port = metadata.getPorts(component.inputs, component.bitWidth, component)
        .find(candidate => candidate.id === endpoint.portId);
      if (!port || port.bitWidth !== 1) return [];
      return [{
        ...endpoint,
        key: getSignalTraceKey(endpoint),
        label: `${component.label || metadata.name} · ${port.name}`,
      }];
    });
  }, [components, wires]);

  const selectedKeys = new Set(tracedSignals.map(getSignalTraceKey));
  const toggleSignal = (option: SignalOption, checked: boolean) => {
    const next = checked
      ? [...tracedSignals, { componentId: option.componentId, portId: option.portId }]
      : tracedSignals.filter(signal => getSignalTraceKey(signal) !== option.key);
    setTracedSignals(next);
  };

  return (
    <div className="space-y-5">
      <section>
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Sinais monitorados
            </h3>
            <p className="mt-1 text-[11px] text-slate-500">
              Selecione até {MAX_SELECTED_SIGNALS} portas de 1 bit; cada linha mostra até 300 amostras.
            </p>
          </div>
          <span className="shrink-0 text-[11px] text-slate-500">
            {signalHistory.length} amostras
          </span>
        </div>

        {options.length > 0 ? (
          <div className="grid max-h-40 gap-1 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/50 p-2 sm:grid-cols-2">
            {options.map(option => {
              const checked = selectedKeys.has(option.key);
              return (
                <label
                  key={option.key}
                  className="flex min-w-0 items-center gap-2 rounded px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-800/70"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!checked && tracedSignals.length >= MAX_SELECTED_SIGNALS}
                    onChange={event => toggleSignal(option, event.target.checked)}
                    className="accent-emerald-500"
                  />
                  <span className="truncate" title={option.label}>{option.label}</span>
                </label>
              );
            })}
          </div>
        ) : (
          <p className="rounded-lg border border-slate-800 bg-slate-950/50 p-4 text-xs text-slate-500">
            O circuito não possui portas conectadas de 1 bit para monitorar.
          </p>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Cronograma
        </h3>
        {tracedSignals.length === 0 ? (
          <p className="rounded-lg border border-slate-800 bg-slate-950/50 p-5 text-center text-xs text-slate-500">
            Marque um sinal acima. As amostras serão capturadas a cada tick da simulação.
          </p>
        ) : (
          <div className="max-h-[45vh] space-y-3 overflow-auto rounded-lg border border-slate-800 bg-slate-950/60 p-3">
            {tracedSignals.map(signal => {
              const key = getSignalTraceKey(signal);
              const option = options.find(candidate => candidate.key === key);
              const width = Math.max(220, signalHistory.length * SAMPLE_SPACING + 24);
              const values = signalHistory.map(sample => sample.values[key]?.[0] ?? 'Z');
              return (
                <div key={key} className="grid min-w-0 grid-cols-[150px_minmax(0,1fr)] items-center gap-3 border-b border-slate-800/70 pb-3 last:border-0">
                  <div className="truncate text-xs text-slate-300" title={option?.label || key}>
                    {option?.label || key}
                  </div>
                  <div className="overflow-x-auto">
                    <svg
                      width={width}
                      height="48"
                      role="img"
                      aria-label={`Cronograma de ${option?.label || key}`}
                    >
                      <line x1="12" y1="9" x2={width - 8} y2="9" stroke="#334155" strokeDasharray="2 4" />
                      <line x1="12" y1="35" x2={width - 8} y2="35" stroke="#334155" strokeDasharray="2 4" />
                      {values.map((value, index) => {
                        const x = 12 + index * SAMPLE_SPACING;
                        const nextX = x + SAMPLE_SPACING;
                        const y = getSignalLevel(value);
                        const nextValue = values[index + 1];
                        return (
                          <g key={`${key}-${index}`}>
                            {index === 0 && (
                              <circle cx={x} cy={y} r="2.5" fill={getSignalColor(value)} />
                            )}
                            {nextValue !== undefined && (
                              <path
                                d={`M ${x} ${y} H ${nextX} V ${getSignalLevel(nextValue)}`}
                                fill="none"
                                stroke={getSignalColor(value)}
                                strokeWidth="2"
                                strokeLinejoin="round"
                              />
                            )}
                            {value === 'X' || value === 'Z' ? (
                              <text
                                x={x + 4}
                                y="25"
                                fill={getSignalColor(value)}
                                fontSize="9"
                              >
                                {value}
                              </text>
                            ) : null}
                          </g>
                        );
                      })}
                      {signalHistory.map((sample, index) => {
                        const labelStep = Math.max(1, Math.ceil(signalHistory.length / 10));
                        if (index % labelStep !== 0 && index !== signalHistory.length - 1) return null;
                        return (
                          <text
                            key={`${key}-tick-${sample.tick}`}
                            x={12 + index * SAMPLE_SPACING}
                            y="47"
                            fill="#64748b"
                            fontSize="8"
                          >
                            {sample.tick}
                          </text>
                        );
                      })}
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-2 text-[11px] text-slate-500">
          Pause ou retome a simulação na barra principal. Alterações na estrutura do circuito reiniciam o histórico.
        </p>
      </section>
    </div>
  );
};
