# logdev-Ultimate ⚡

<p align="center">
  <img src="public/icon.svg" alt="logdev-Ultimate Logo" width="128" height="128" />
  <br>
  <strong>Simulador de Circuitos Lógicos Digitais & CAD Moderno</strong>
  <br>
  <em>Alta performance em React 18, TypeScript, HTML5 Canvas 2D e Electron</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Versão-1.0.0-00f2fe?style=for-the-badge" alt="Versão 1.0.0" />
  <img src="https://img.shields.io/badge/Testes-24%20Passando-10b981?style=for-the-badge" alt="Testes 100%" />
  <img src="https://img.shields.io/badge/Plataformas-Linux%20%7C%20Windows%20%7C%20Web-38bdf8?style=for-the-badge" alt="Multiplataforma" />
  <img src="https://img.shields.io/badge/Licença-MIT-slate?style=for-the-badge" alt="Licença MIT" />
</p>

---

## 📖 Visão Geral

O **logdev-Ultimate** é uma recriação moderna, elegante e reativa de ferramentas clássicas de lógica digital (como Logisim Evolution). Projetado com uma interface dark inspirada em ferramentas profissionais como **Figma** e **VS Code**, o sistema combina um canvas gráfico de alto desempenho a 60 FPS com um motor de simulação discreta de 4 estados elétricos.

Disponível como **aplicação web** e **aplicativo nativo desktop** para **Linux (.rpm)** e **Windows (.exe)**.

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
- **Modo Interativo "Poke" (Mãozinha):**
  - Alterne interruptores, chaves gangorra e pinos de entrada com um clique direto sobre o circuito, observando as ondas de propagação instantaneamente.
- **Exportação Profissional:**
  - **Exportar PDF:** Gera diagramas em folha **A4 (Paisagem)** prontos para impressão ou relatórios acadêmicos com enquadramento dinâmico e carimbo de data/hora.
  - **Exportar JPEG:** Renderiza imagens nítidas em alta resolução (escala 2x DPI) com fundo escuro elegante.
  - **Exportar/Importar JSON:** Salva e restaura o esquema de circuitos na íntegra.
- **Histórico Ilimitado com Undo / Redo:** Desfaça (`Ctrl+Z`) e refaça (`Ctrl+Y`) conexões, inserções e movimentações.
- **Circuitos Pré-carregados (Demos):**
  - Somador Completo de 1 bit (*Full Adder*).
  - Latch SR com portas NOR (*Memória Básica com Feedback*).
  - Contador Binário com Clock e Flip-Flops tipo D.

---

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

```text
logdev-Ultimate/
├── build/                      # Ícones de alta resolução (.png, .ico)
├── dist/                       # Build estático otimizado gerado pelo Vite
├── electron/
│   └── main.cjs                # Processo principal desktop (janela, menus nativos)
├── public/
│   ├── icon.svg                # Logotipo vetorial oficial
│   └── icon.png                # Ícone em bitmap
├── release/                    # Pacotes compilados instaláveis (.rpm, .exe)
├── src/
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
│   │   ├── logic.ts            # Avaliação de operadores booleanos com dominância
│   │   └── simulator.ts        # Simulador de netlist (Union-Find, propagação e contenção)
│   ├── store/
│   │   └── circuitStore.ts     # Gerenciamento global de estado (Zustand) com Undo/Redo
│   ├── types/
│   │   └── circuit.ts          # Definições de tipos TypeScript (Port, Wire, ComponentInstance)
│   └── utils/
│       └── exportUtils.ts      # Exportador para PDF vetorial (jsPDF) e JPEG em alta definição
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
cd logdev-Ultimate
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
Executa a suíte de 24 testes unitários e de integração via Vitest.

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
> Gera o arquivo: `release/logdev-ultimate-1.0.0.x86_64.rpm`

Para instalar no Fedora/RHEL:
```bash
sudo dnf install release/logdev-ultimate-1.0.0.x86_64.rpm
```

### Gerar instalador e executável para Windows (.exe)
```bash
npm run dist:win
```
> Gera dois arquivos em `release/`:
> 1. `release/logdev-Ultimate Setup 1.0.0.exe` (Instalador com assistente)
> 2. `release/logdev-Ultimate 1.0.0.exe` (Versão portátil sem instalação)

---

## 📄 Licença

Distribuído sob a licença MIT. Veja `LICENSE` para mais detalhes.

Desenvolvido com excelência por **Eduardo Melo**.
