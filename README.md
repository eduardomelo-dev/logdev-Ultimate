# logdev-Ultimate ⚡

<p align="center">
  <img src="public/icon.svg" alt="logdev-Ultimate Logo" width="128" height="128" />
  <br>
  <strong>Simulador de Circuitos Lógicos Digitais & CAD Moderno</strong>
  <br>
  <em>Alta performance em React 18, TypeScript, HTML5 Canvas 2D e Electron</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Versão-1.1.0-00f2fe?style=for-the-badge" alt="Versão 1.1.0" />
  <img src="https://img.shields.io/badge/Testes-33%20Passando-10b981?style=for-the-badge" alt="33 testes passando" />
  <img src="https://img.shields.io/badge/Plataformas-Linux%20%7C%20Windows%20%7C%20Web-38bdf8?style=for-the-badge" alt="Multiplataforma" />
  <img src="https://img.shields.io/badge/Licença-MIT-slate?style=for-the-badge" alt="Licença MIT" />
</p>

---

## 📖 Visão Geral

O **logdev-Ultimate** é uma recriação moderna, elegante e reativa de ferramentas clássicas de lógica digital (como Logisim Evolution). Projetado com uma interface dark inspirada em ferramentas profissionais como **Figma** e **VS Code**, o sistema combina um canvas gráfico de alto desempenho a 60 FPS com um motor de simulação discreta de 4 estados elétricos.

Disponível como **aplicação web** e **aplicativo nativo desktop** para **Linux (.rpm)** e **Windows (.exe)**. A versão 1.1.0 acrescenta rotação de componentes, salvamento automático, diagnósticos de simulação e animação dos sinais, preservando as funções existentes.

### Versão 1.1.0 — Edição, salvamento e simulação

- **Rotação de componentes:** gire componentes em passos de 90° pelo inspetor ou com `R`; os pinos e as conexões acompanham a orientação.
- **Autosave e recuperação:** alterações do circuito são salvas localmente e recuperadas na abertura seguinte.
- **Diagnósticos de simulação:** avisos para contenção, incompatibilidade de largura de barramento e limite de propagação.
- **Sinais animados:** traços percorrem fios em nível lógico `1` enquanto a simulação está ativa.
- **Navegação e layout:** categorias da biblioteca começam recolhidas, mostram a quantidade de componentes e podem ser expandidas; painéis laterais respeitam a área disponível, e a busca informa quando não há resultados.
- **Histórico e atalhos:** rotação integrada ao Undo/Redo, além dos atalhos existentes para desfazer, refazer e editar.

---

## 🚀 Principais Recursos

- **Simulação Elétrica Discreta em 4 Estados:**
  - `'0'`: Nível lógico baixo / Terra (0V) — verde escuro.
  - `'1'`: Nível lógico alto / VCC (5V) — verde neon brilhante com efeito glow.
  - `'Z'`: Alta impedância / Desconectado (Tri-State) — ciano flutuante.
  - `'X'`: Contenção / Curto-circuito / Incompatibilidade — vermelho vivo com aviso de erro.
- **Detecção Real de Contenção de Barramento:**
  - Identifica automaticamente se dois drivers ativos emitem sinais divergentes no mesmo condutor ou se há choque de larguras de bits entre portas conectadas, pintando a linha em vermelho sem travar a engine.
- **Roteamento Manhattan Ortogonal Inteligente:**
  - Os fios se alinham automaticamente em ângulos retos de 90° e recalculam seus vértices em tempo real durante o arraste de componentes.
- **Orientação de componentes:** gire componentes em passos de 90° pelo inspetor ou com `R`; portas, hit testing e fios conectados acompanham a rotação.
- **Autosave e recuperação:** projetos são salvos no armazenamento local do navegador/desktop após alterações e recuperados na próxima abertura. O indicador na barra inferior informa o estado do salvamento.
- **Diagnósticos de simulação:** avisos para contenção (`X`), incompatibilidade de largura de barramento e limite de propagação atingido.
- **Animação de sinais ativos:** traços verdes percorrem fios em nível lógico `1` enquanto a simulação está rodando. A animação pausa junto com a simulação; a renderização estática continua disponível.
- **Modo Interativo "Poke" (Mãozinha):**
  - Alterne interruptores, chaves gangorra e pinos de entrada com um clique direto sobre o circuito, observando as ondas de propagação instantaneamente.
- **Exportação Profissional:**
  - **Exportar PDF:** Gera diagramas em folha **A4 (Paisagem)** prontos para impressão ou relatórios acadêmicos com enquadramento dinâmico e carimbo de data/hora.
  - **Exportar JPEG:** Renderiza imagens nítidas em alta resolução (escala 2x DPI) com fundo escuro elegante.
  - **Exportar/Importar JSON:** Salva e restaura o esquema de circuitos na íntegra.
- **Histórico com Undo / Redo:** Desfaça (`Ctrl+Z`) e refaça (`Ctrl+Y`) até 30 alterações de circuito.
- **Circuitos Pré-carregados (Demos):**
  - Somador Completo de 1 bit (*Full Adder*).
  - Latch SR com portas NOR (*Memória Básica com Feedback*).
  - Contador Binário com Clock e Flip-Flops tipo D.

---

## ⚙️ Edição, simulação e salvamento

- Selecione um componente e use **Girar 90°** no inspetor, ou pressione `R`, para rotacioná-lo no sentido horário. O centro do componente é preservado e as conexões são recalculadas.
- `Ctrl+Z` desfaz e `Ctrl+Y` refaz; `Ctrl+Shift+Z` também refaz. `Delete` remove a seleção e `Escape` cancela a conexão em andamento.
- Use **Pausar**, **Avançar 1 Tick** e o seletor de frequência para controlar a simulação. A animação visual dos fios ativos acompanha o estado de execução.
- O autosave local é independente da exportação JSON e não envia projetos à rede. Arquivos inválidos ou armazenamento indisponível são reportados na barra de estado e no console.
- Os avisos de simulação também aparecem no inspetor quando nenhum componente ou fio está selecionado.

## 🗂️ Biblioteca de Componentes

| Categoria | Componentes Inclusos |
| :--- | :--- |
| **Fiação & Sinais** | Pinos de Entrada, Pinos de Saída, Clock periódica (1 a 20 Hz), Constantes (0/1), Sondas (*Probes*), Divisores/Unificadores (*Splitters*). |
| **Portas Lógicas** | AND, OR, NOT, NAND, NOR, XOR, XNOR, Buffer e Tri-State (com suporte a 2 até 8 entradas por porta). |
| **Plexers** | Multiplexador 2:1 (MUX) e Demultiplexador 1:2 (DEMUX). |
| **Memória & Sequencial** | Flip-Flop tipo D (borda de subida de clock) e Registrador multi-bit (com sinal de *Write Enable*). |
| **Entradas e Saídas (I/O)** | Botão pulsador, Chave tipo Toggle, LEDs individuais, Displays de 7 Segmentos e Displays Hexadecimais. |

---

## 🏗️ Arquitetura do Código

A base de código está organizada sob padrões modulares de software:

### Limites entre Electron e interface

- `electron/` é o processo principal do desktop: controla o ciclo de vida da janela e carrega o frontend compilado em `dist/`.
- `src/` é o frontend React/TypeScript. O motor de simulação em `src/engine/` é lógica de domínio executada no renderer; não há um servidor/API backend neste projeto.
- O renderer não recebe acesso direto ao Node.js (`nodeIntegration: false` e `contextIsolation: true`). Como não há comunicação com funcionalidades nativas, não existe uma bridge/preload.
- O empacotamento inclui `dist/`, `electron/` e `build/` (ícones usados pela janela); manter os ícones no pacote é necessário para a inicialização do app desktop.

```text
logdev-studio/
├── build/                      # Ícones de alta resolução (.png, .ico)
├── dist/                       # Build estático otimizado gerado pelo Vite
├── electron/
│   └── main.cjs                # Processo principal Electron (ciclo de vida e janela)
├── public/
│   ├── icon.svg                # Logotipo vetorial oficial
│   └── icon.png                # Ícone em bitmap
├── release/                    # Pacotes compilados instaláveis (.rpm, .exe)
├── src/
│   ├── App.tsx                 # Composição da interface React
│   ├── main.tsx                # Entrada do renderer React
│   ├── __tests__/              # Testes de integração de UI e circuitos de demonstração
│   ├── canvas/
│   │   ├── CircuitCanvas.tsx   # Controlador de eventos (pan, zoom, drag, click, poke)
│   │   ├── renderer.ts         # Motor de desenho vetorial no Canvas 2D
│   │   └── wireRouter.ts       # Algoritmo de roteamento Manhattan e teste de colisão
│   ├── components/
│   │   ├── Header.tsx          # Barra de ferramentas superior (controles, clock, exportações)
│   │   ├── Sidebar.tsx         # Catálogo lateral com busca em tempo real
│   │   ├── Inspector.tsx       # Painel de propriedades do elemento selecionado
│   │   └── StatusBar.tsx       # Informações de ticks, frequência e escala de zoom
│   ├── demos/
│   │   └── sampleCircuits.ts   # Esquemas pré-montados (Full Adder, SR Latch, Contador)
│   ├── engine/
│   │   ├── components.ts       # Metadados de portas, dimensões e simbologia
│   │   ├── componentGeometry.ts # Orientação e geometria de componentes/portas
│   │   ├── logic.ts            # Avaliação de operadores booleanos com dominância
│   │   └── simulator.ts        # Simulador de netlist (Union-Find, propagação e contenção)
│   ├── hooks/
│   │   └── useCircuitPersistence.ts # Autosave local e recuperação de projetos
│   ├── store/
│   │   └── circuitStore.ts     # Gerenciamento global de estado (Zustand) com Undo/Redo
│   ├── types/
│   │   └── circuit.ts          # Definições de tipos TypeScript (Port, Wire, ComponentInstance)
│   └── utils/
│       ├── circuitPersistence.ts # Validação e serialização do autosave
│       └── exportUtils.ts      # Exportador para PDF (jsPDF) e JPEG em alta definição
├── package.json                # Dependências, scripts e configuração do electron-builder
└── vite.config.ts              # Configurações de empacotamento Vite e testes Vitest
```

---

## 💻 Como Executar Localmente

### Pré-requisitos
- **Node.js** v18 ou superior instalado.
- **npm** v9 ou superior.

### 1. Clonar o repositório
```bash
git clone https://github.com/eduardomelo-dev/logdev-Ultimate.git
cd logdev-studio
```

### 2. Instalar dependências
```bash
npm install
```

### 3. Iniciar em modo de desenvolvimento web
```bash
npm run dev
```
O simulador abrirá em seu navegador em `http://localhost:5173`.

### 4. Executar os testes automatizados
```bash
npm test
```
Executa a suíte de testes unitários e de integração via Vitest.

---

## 📦 Como Gerar os Aplicativos Desktop

O projeto está configurado com **Electron** e **Electron Builder**:

### Executar a aplicação desktop em modo janela
```bash
npm run electron:start
```

### Gerar pacote para Linux (.rpm)
```bash
npm run dist:linux
```
> Gera `release/logdev-ultimate-1.1.0.x86_64.rpm`.

Para instalar no Fedora/RHEL:
```bash
sudo dnf install release/logdev-ultimate-1.1.0.x86_64.rpm
```

### Gerar instalador e executável para Windows (.exe)
```bash
npm run dist:win
```
> Gera dois arquivos em `release/`:
> 1. `release/logdev-Ultimate Setup 1.1.0.exe` (Instalador com assistente)
> 2. `release/logdev-Ultimate 1.1.0.exe` (Versão portátil sem instalação)

---

## 📥 Downloads Oficiais (Release v1.1.0)

Os arquivos da versão clean e otimizada serão publicados em uma release posterior. A versão 1.0.0 continua disponível e inalterada.

| Sistema | Arquivo | Tamanho | Como Instalar |
|---------|---------|---------|---------------|
| **Linux (Fedora/RHEL)** | [`logdev-ultimate-1.1.0.x86_64.rpm`](https://github.com/eduardomelo-dev/logdev-Ultimate/releases/download/v1.1.0/logdev-ultimate-1.1.0.x86_64.rpm) | 91 MB | `sudo dnf install logdev-ultimate-1.1.0.x86_64.rpm` |
| **Windows (Portable)** | [`logdev-Ultimate 1.1.0.exe`](https://github.com/eduardomelo-dev/logdev-Ultimate/releases/download/v1.1.0/logdev-Ultimate%201.1.0.exe) | 110 MB | Clique duas vezes — executa sem instalação |
| **Windows (Instalador)** | [`logdev-Ultimate Setup 1.1.0.exe`](https://github.com/eduardomelo-dev/logdev-Ultimate/releases/download/v1.1.0/logdev-Ultimate%20Setup%201.1.0.exe) | 124 MB | Clique duas vezes e siga o assistente |

> 📌 **Release page:** https://github.com/eduardomelo-dev/logdev-Ultimate/releases/tag/v1.1.0

---

## 📥 Downloads Oficiais (Release v1.0.0)

| Sistema | Arquivo | Tamanho | Como Instalar |
|---------|---------|---------|---------------|
| **Linux (Fedora/RHEL)** | [`logdev-ultimate-1.0.0.x86_64.rpm`](https://github.com/eduardomelo-dev/logdev-Ultimate/releases/download/v1.0.0/logdev-ultimate-1.0.0.x86_64.rpm) | 91 MB | `sudo dnf install logdev-ultimate-1.0.0.x86_64.rpm` |
| **Windows (Portable)** | [`logdev-Ultimate 1.0.0.exe`](https://github.com/eduardomelo-dev/logdev-Ultimate/releases/download/v1.0.0/logdev-Ultimate%201.0.0.exe) | 109 MB | Clique 2x — roda direto, sem instalação |
| **Windows (Instalador)** | [`logdev-Ultimate Setup 1.0.0.exe`](https://github.com/eduardomelo-dev/logdev-Ultimate/releases/download/v1.0.0/logdev-Ultimate%20Setup%201.0.0.exe) | 124 MB | Clique 2x — assistente de instalação |

> 📌 **Release page:** https://github.com/eduardomelo-dev/logdev-Ultimate/releases/tag/v1.0.0

---

## 📄 Licença

Distribuído sob a licença MIT. Veja `LICENSE` para mais detalhes.

Desenvolvido com excelência por **Eduardo Melo**.
