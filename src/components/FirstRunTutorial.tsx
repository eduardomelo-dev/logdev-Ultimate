import React, { useEffect, useState } from 'react';
import { Activity, ArrowRight, Cable, ChevronLeft, ChevronRight, X } from 'lucide-react';

export const FIRST_RUN_TUTORIAL_KEY = 'logdev-ultimate:first-run-tutorial:v1';

interface FirstRunTutorialProps {
  onDismiss: () => void;
}

const STEPS = [
  {
    eyebrow: 'Bem-vindo ao estúdio',
    title: 'Seu próximo circuito começa aqui.',
    description: 'Este espaço reúne montagem, simulação e análise de circuitos digitais. Em poucos passos você já terá seu primeiro circuito funcionando.',
    icon: Activity,
    tip: 'Avance pelas etapas no seu ritmo ou pule o guia para começar direto.',
  },
  {
    eyebrow: '01 · Monte',
    title: 'Escolha peças na biblioteca.',
    description: 'Abra uma categoria na lateral esquerda, escolha um componente e clique no canvas para posicioná-lo. Use a busca se já souber o nome da peça.',
    icon: ArrowRight,
    tip: 'Comece com um Pino de Entrada, uma porta lógica e um Pino de Saída.',
  },
  {
    eyebrow: '02 · Conecte',
    title: 'Ligue as portas para criar a lógica.',
    description: 'Ative Conectar na barra superior. Clique na porta de origem e depois na porta de destino. Para mudar o valor de uma entrada, use Interagir e clique nela.',
    icon: Cable,
    tip: 'Arraste componentes para reposicioná-los. Gire uma peça selecionada com a tecla R.',
  },
  {
    eyebrow: '03 · Teste e salve',
    title: 'Veja sua lógica em funcionamento.',
    description: 'Use Rodando para simular continuamente ou Avançar um passo para observar cada tick. Abra Analisar para testar sinais e exporte seu projeto quando quiser.',
    icon: Activity,
    tip: 'O projeto é salvo automaticamente neste dispositivo; Exportar JSON cria uma cópia para compartilhar.',
  },
];

function dismissTutorial(onDismiss: () => void) {
  try {
    window.localStorage.setItem(FIRST_RUN_TUTORIAL_KEY, 'completed');
  } catch (error) {
    console.error('Não foi possível salvar a preferência do tutorial inicial.', error);
  }
  onDismiss();
}

export const FirstRunTutorial: React.FC<FirstRunTutorialProps> = ({ onDismiss }) => {
  const [activeStep, setActiveStep] = useState(0);
  const step = STEPS[activeStep];
  const StepIcon = step.icon;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismissTutorial(onDismiss);
      if (event.key === 'ArrowRight') setActiveStep(current => Math.min(STEPS.length - 1, current + 1));
      if (event.key === 'ArrowLeft') setActiveStep(current => Math.max(0, current - 1));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onDismiss]);

  return (
    <div className="nexus-tutorial-overlay fixed inset-0 z-[60] flex items-center justify-center p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="first-run-title"
        className="nexus-tutorial w-full max-w-xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
      >
        <div className="nexus-tutorial-topline" />
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="nexus-tutorial-icon">
                <StepIcon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-300">
                  {step.eyebrow}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">Guia rápido · {activeStep + 1} de {STEPS.length}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => dismissTutorial(onDismiss)}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              aria-label="Fechar tutorial"
              title="Fechar tutorial"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-7 min-h-36">
            <h2 id="first-run-title" className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {step.title}
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-6 text-slate-300">
              {step.description}
            </p>
            <p className="nexus-tutorial-tip mt-5 rounded-lg border border-slate-700/80 px-3 py-2.5 text-xs leading-5 text-slate-300">
              {step.tip}
            </p>
          </div>

          <div className="mt-7 flex items-center justify-between border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={() => dismissTutorial(onDismiss)}
              className="px-2 py-2 text-xs font-medium text-slate-400 transition hover:text-white"
            >
              Pular tutorial
            </button>
            <div className="flex items-center gap-2">
              <div className="mr-2 hidden items-center gap-1.5 sm:flex" aria-label={`Etapa ${activeStep + 1} de ${STEPS.length}`}>
                {STEPS.map((item, index) => (
                  <span
                    key={item.eyebrow}
                    className={`nexus-tutorial-dot ${index === activeStep ? 'is-active' : ''}`}
                  />
                ))}
              </div>
              {activeStep > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveStep(current => current - 1)}
                  className="flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Voltar
                </button>
              )}
              {activeStep < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setActiveStep(current => current + 1)}
                  className="flex items-center gap-1.5 rounded-lg border border-indigo-400/50 bg-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-950/30 transition hover:bg-indigo-400"
                >
                  Próximo
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => dismissTutorial(onDismiss)}
                  className="rounded-lg border border-cyan-300/40 bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-cyan-950/30 transition hover:bg-cyan-300"
                >
                  Começar a criar
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
