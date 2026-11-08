# Brand Logo & Header Icon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a custom high-tech cyber-chip vector logo component (`LogdevLogo.tsx`), integrate it into `Header.tsx` to fix broken image rendering in Electron, and sync system icons (`icon.svg`, `icon.png`, `icon.ico`).

**Architecture:** Create an inline SVG React component (`src/components/LogdevLogo.tsx`) with customizable sizing and glowing cyber-chip visual elements (AND/XOR logic gate shape, PCB traces, logic pins, and "LD" quantum core). Replace the broken `<img>` tag in `Header.tsx` with this component, guaranteeing 0-latency and zero `file://` loading errors across both web and Electron. Regenerate app binary icons to match.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, SVG, ImageMagick, Vitest, Electron.

**Spec:** `docs/superpowers/specs/2026-11-07-logo-and-header-icon-design.md`

## Global Constraints
- Must not rely on external file loading (`file://` or HTTP URL) for header logo rendering.
- Visual theme must adhere to Option A: High-tech cyber-chip with neon cyan (`#00f2fe`), sky blue (`#38bdf8`), and emerald (`#10b981`).
- All tests must pass cleanly (`npm test`).
- Production build must succeed with zero TypeScript or Vite errors (`npm run build`).

## Review Focus
- High DPI scaling & crisp rendering across all viewport zooms.
- Zero broken image indicators on Electron desktop window load.
- Seamless fallback and accessibility with proper `aria-label` or SVG title.
- Dimension responsiveness when `size` prop is provided.
- Component isolation without polluting global CSS.

---

### Task 1: Create `LogdevLogo` Component and Unit Tests

**Files:**
- Create: `src/components/LogdevLogo.tsx`
- Create: `src/components/__tests__/LogdevLogo.test.tsx`

**Interfaces:**
- Produces: `export const LogdevLogo: React.FC<{ size?: number; className?: string; title?: string }>`

- [ ] **Step 1: Write failing test in `src/components/__tests__/LogdevLogo.test.tsx`**
```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { LogdevLogo } from '../LogdevLogo';

describe('LogdevLogo', () => {
  it('renders SVG with custom size and accessible label', () => {
    const { container } = render(<LogdevLogo size={48} className="custom-class" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeDefined();
    expect(svg?.getAttribute('width')).toBe('48');
    expect(svg?.getAttribute('height')).toBe('48');
    expect(svg?.classList.contains('custom-class')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test src/components/__tests__/LogdevLogo.test.tsx`
Expected: FAIL with module not found or import error.

- [ ] **Step 3: Implement `LogdevLogo.tsx` with Option A Cyber-Chip design**
Implement vector SVG containing:
- Rounded squircle chassis with dark gradient `#0b0f19` to `#020617` and subtle border `#1e293b`.
- Neon PCB circuit traces in cyan `#00f2fe` and emerald `#10b981` with glow filters.
- Hybrid AND/XOR logic gate shape in glowing gradient stroke.
- Center quantum core node with "LD" cyber-monogram or node pulse.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test src/components/__tests__/LogdevLogo.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/components/LogdevLogo.tsx src/components/__tests__/LogdevLogo.test.tsx
git commit -m "feat: add LogdevLogo inline SVG component"
```

---

### Task 2: Integrate `LogdevLogo` into `Header.tsx` and Update Layout Tests

**Files:**
- Modify: `src/components/Header.tsx`
- Modify: `src/__tests__/App.test.tsx`

**Interfaces:**
- Consumes: `LogdevLogo` from `src/components/LogdevLogo.tsx`

- [ ] **Step 1: Update `src/components/Header.tsx`**
Replace `<img src="/icon.svg" ... />` with `<LogdevLogo size={36} />` inside the header brand section.

- [ ] **Step 2: Run tests to verify Header and App integration**
Run: `npm test src/__tests__/App.test.tsx`
Expected: PASS

- [ ] **Step 3: Commit**
```bash
git add src/components/Header.tsx src/__tests__/App.test.tsx
git commit -m "fix(ui): use inline LogdevLogo in Header to eliminate broken image in Electron"
```

---

### Task 3: Sync System Vector & Binary Icons (`icon.svg`, `icon.png`, `icon.ico`)

**Files:**
- Modify: `public/icon.svg`
- Modify: `public/icon.png`
- Modify: `build/icon.png`
- Modify: `build/icon.ico`

- [ ] **Step 1: Update `public/icon.svg` to mirror the new cyber-chip logo**
Write clean standalone SVG version of the logo to `public/icon.svg`.

- [ ] **Step 2: Re-generate high-res PNG and ICO icons via ImageMagick**
Run:
```bash
magick -background none -density 300 public/icon.svg -resize 512x512 build/icon.png
magick -background none -density 300 public/icon.svg -resize 256x256 public/icon.png
magick build/icon.png -define icon:auto-resize=256,128,64,48,32,16 build/icon.ico
```

- [ ] **Step 3: Run full test suite & production build**
Run: `npm test && npm run build`
Expected: PASS

- [ ] **Step 4: Commit**
```bash
git add public/icon.svg public/icon.png build/icon.png build/icon.ico
git commit -m "chore(assets): synchronize high-res cyber-chip icons and favicon"
```

---

### Task 4: Final Verification, Electron Validation & Push to GitHub

**Files:**
- All touched files

- [ ] **Step 1: Run complete test suite**
Run: `npm test`
Expected: 25+ tests passing cleanly.

- [ ] **Step 2: Build production bundle and package desktop app**
Run: `npm run build`

- [ ] **Step 3: Push changes to remote origin**
Run: `git push origin main`
Expected: remote updated cleanly.
