# Design: logdev-Ultimate Brand Logo & Header Icon Component

**Date:** 2026-11-07  
**Status:** Approved  
**Author:** Eduardo Melo & Agent  

## Intent & The Why
The header currently shows a broken image icon inside the Electron desktop application because `<img src="/icon.svg" />` resolves to `file:///icon.svg`, which does not exist in the filesystem under `file://` execution. In addition, the brand lacks a dedicated high-fidelity logo component that visually elevates the application as a professional, modern digital logic CAD tool.

## Goals
- Replace the broken `<img src="/icon.svg" />` in `src/components/Header.tsx` with a dedicated, zero-dependency inline React SVG component (`<LogdevLogo />`).
- Implement visual design "Option A" (High-tech / Cyber Chip):
  - Stylized digital logic gate (AND/XOR hybrid) integrated with microchip PCB traces and vias.
  - Vibrant neon color palette (Cyan `#00f2fe` to Sky Blue `#38bdf8`, and Emerald `#10b981`).
  - Dark sleek squircle background with subtle glow and inner core node ("LD" monogram / quantum logic core).
- Ensure 100% reliability across Web and Electron builds without external asset network or filesystem resolution issues.
- Update `public/icon.svg`, `public/icon.png`, and `build/icon.ico` to keep the desktop app icons coherent with the new logo.

## Non-Goals
- Altering the circuit canvas rendering engine.
- Adding heavy external canvas or 3D icon libraries (must remain pure scalable vector SVG).

## Approaches Considered
- **Approach 1 (External Asset with Relative Path):** Fix `<img src="./icon.svg" />` or bundle through Vite `import logoUrl from '../assets/icon.svg'`.
  *Tradeoff:* Still dependent on asset pipeline and can flicker or fail under certain Electron routing setups.
- **Approach 2 (Inline Vector React Component - Selected):** Create `src/components/LogdevLogo.tsx` rendering SVG directly with customizable sizes and CSS classes.
  *Tradeoff:* Zero latency, instantaneous render, no file resolution bugs in Electron `file://` mode, highly stylable.

## Design Details
1. **Component `LogdevLogo.tsx`:**
   - Props: `size?: number` (default 36), `className?: string`.
   - SVG definition with unique IDs for gradients/filters.
   - Microchip pin traces on left/top/bottom with neon logic nodes.
   - Stylized logic gate silhouette with curved XOR back-arc and rounded AND front.
   - Core pulse circle with "LD" cyber typographic marks or quantum center.
2. **Integration in `Header.tsx`:**
   - Import `LogdevLogo` and replace the previous `<div><img src="/icon.svg" ... /></div>` container.
3. **Asset Sync:**
   - Generate coherent 512x512 and 256x256 PNGs and ICO files in `build/` and `public/` using ImageMagick from the new SVG design.
