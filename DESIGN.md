---
name: Bettercue
description: Multi-provider prompt optimizer for the browser
colors:
  focus-cyan: "#06b6d4"
  ink: "#ececf1"
  ink-muted: "#8b8ba3"
  ink-dim: "#5c5c72"
  surface-app: "#08080e"
  surface-card: "rgba(18, 18, 36, 0.72)"
  surface-card-hover: "rgba(24, 24, 48, 0.85)"
  border-subtle: "rgba(255, 255, 255, 0.06)"
  border-accent: "rgba(255, 255, 255, 0.08)"
  status-green: "#22c55e"
  status-amber: "#f59e0b"
  status-red: "#ef4444"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    fontSize: "1.35rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.01em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    fontSize: "0.85rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    fontSize: "0.7rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.04em"
  code:
    fontFamily: "'SF Mono', 'Fira Code', monospace"
    fontSize: "0.8rem"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
components:
  button-primary:
    backgroundColor: "{colors.focus-cyan}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "11px 20px"
  button-primary-disabled:
    backgroundColor: "{colors.focus-cyan}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "11px 20px"
  input-field:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
  select-field:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "9px 32px 9px 12px"
  output-surface:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
---

# Design System: Bettercue

## 1. Overview

**Creative North Star: "The Editor's Desk"**

A clean desk under good light. The tool is a surface — flat, uncluttered, honest. You bring raw material to it; it hands back something sharper. No chrome, no flourish, nothing that competes with the work itself.

The interface is a developer tool, not an AI showcase. It lives in a 400px-wide popup, so every pixel earns its place. The visual system treats the popup as a focused instrument: dark background to reduce glare in a browser-full of tabs, translucent layers for depth without heavy shadows, and a single cyan accent that does real work (focus indicators, the primary action, data density markers). Nothing is decorative.

This system explicitly rejects: chatbot bubbles, robot motifs, sci-fi gradients, purple/violet "AI" palette tropes, glassmorphism used decoratively, and any element that suggests the tool is magical rather than mechanical.

**Key Characteristics:**
- Dark by necessity (tool lives against browser tabs), not by fashion
- Translucent layering instead of drop shadows
- Single accent color (cyan) used functionally, not decoratively
- Monospace for prompt text — the raw material
- Every state transition is responsive, not choreographed

## 2. Colors

A restrained palette on a near-black canvas. The single cyan accent does all the signaling work.

### Primary
- **Focus Cyan** (#06b6d4): The only accent. Used for button backgrounds, focus rings, active state indicators, data density markers (token count styling). Never more than one cyan element per view.

### Neutral
- **Surface App** (#08080e): The base canvas. The popup background.
- **Surface Card** (rgba(18, 18, 36, 0.72)): Translucent surface for cards, inputs, dropdowns. Backdrop-filter blur provides separation from the canvas.
- **Surface Card Hover** (rgba(24, 24, 48, 0.85)): Slightly lighter translucent surface for hovered interactive areas.
- **Ink** (#ececf1): Primary text color. Body, headings, output.
- **Ink Muted** (#8b8ba3): Secondary text. Labels, section headers.
- **Ink Dim** (#5c5c72): Lowest-emphasis text. Placeholders, badges, metadata.
- **Border Subtle** (rgba(255, 255, 255, 0.06)): Default border on all surfaces.
- **Border Accent** (rgba(255, 255, 255, 0.08)): Elevated border on hovered/active surfaces.

### Feedback
- **Status Green** (#22c55e): Success / ready indicator dot.
- **Status Amber** (#f59e0b): Busy / processing indicator dot.
- **Status Red** (#ef4444): Error indicator dot.

### Named Rules
**The Single Accent Rule.** Cyan is the only accent color. No secondary accent, no violet or purple companion. The accent's rarity is its power — if more than one element on screen uses cyan, re-evaluate.

**The No-Gradient-Decoration Rule.** Gradients are prohibited for text, borders, and backgrounds of non-interactive elements. The only gradient is the button's shimmer, which is a motion effect, not a static decoration.

## 3. Typography

**UI Font:** System sans-serif (SF Pro, Segoe UI, system-ui)
**Code Font:** SF Mono, Fira Code, monospace

**Character:** Clean and unpretentious. The sans is the house voice — neutral, legible, doesn't compete. Mono marks the raw material (prompts, output tokens) as distinct. No serif, no display face, no third family.

### Hierarchy
- **Display** (700, 1.35rem, 1, -0.01em): The "bettercue" brand mark only. Never used for body text.
- **Title** (600, 0.85rem, 1.3): Button labels, section emphasis.
- **Body** (400, 0.8rem, 1.5): All UI text. Line length is constrained by popup width (~38ch).
- **Label** (500, 0.7rem, 1.2, 0.04em uppercase): Section headers, form labels. Always uppercase, max 4 words.
- **Code** (400, 0.8rem, 1.6): Prompt input, optimized output. The only monospace role.

### Named Rules
**The Mono Rule.** The raw prompt and the optimized output must be set in the code face. This is non-negotiable — monospace is the visual signal that this text is material to be worked on, not UI to be read.

**The No-All-Caps Body Rule.** Uppercase is reserved for label-style text (≤4 words). Never use uppercase for body copy, headings, or sentences.

## 4. Elevation

Depth through translucency. The interface avoids box-shadows entirely — spacing and hierarchy come from layered translucent surfaces with backdrop-filter blur. The app canvas is solid (#08080e). Interactive surfaces (cards, inputs, dropdowns) sit on top at `rgba(18, 18, 36, 0.72)` with `backdrop-filter: blur(12px)`. Hovered targets lift to `rgba(24, 24, 48, 0.85)`.

The only "shadow" in the system is the cyan glow: a focused `box-shadow` on active/focused interactive elements. This is a light source, not a depth cue.

### Named Rules
**The Glass-Not-Smoke Rule.** Backdrop-filter blur is the only elevation mechanic. No drop shadows on cards, no floating elements, no "lifted" surfaces. Translucency creates depth without simulating physical elevation.

## 5. Components

### Buttons

- **Shape:** Gently rounded (12px). Full-width by default in the popup layout.
- **Primary:** Cyan (#06b6d4) fill, white text, 11px/20px padding. The icon sits to the left of the label. A 16px gap separates icon and text.
- **Hover:** Slight lift (`translateY(-1px) scale(1.01)`) with an intensified cyan glow (`0 4px 24px rgba(6, 182, 212, 0.3)`). Spring easing out (cubic-bezier(0.34, 1.56, 0.64, 1)).
- **Active:** Press in (`scale(0.99)`). Instant transition.
- **Disabled:** 50% opacity, no hover effects, not-allowed cursor.
- **Shimmer:** A sweeping white highlight at 12.5% opacity moves across the button on a 3s loop. Only on the primary action. Prohibited on any other element.

### Inputs / Textarea

- **Shape:** Gently rounded (12px) with a translucent card background.
- **Style:** 1px subtle border (`rgba(255, 255, 255, 0.06)`), monospace font for prompt input.
- **Focus:** Border shifts to cyan at 40% opacity, plus a subtle cyan glow (`0 0 24px rgba(6, 182, 212, 0.06)`). A cyan gradient glow ring appears at 25% opacity behind the border.
- **Placeholder:** Ink Dim (#5c5c72), system sans-serif. Must meet 4.5:1 contrast against surface card background.
- **Disabled:** Not used in this surface.

### Select Dropdowns

- **Shape:** 8px radius, translucent card background, custom chevron arrow via SVG.
- **Style:** Same border and background treatment as inputs.
- **Focus:** Cyan border at 35% opacity + 1px cyan glow ring.
- **The native `<select>` element is used** with custom styling via `appearance: none`. The dropdown panel itself is rendered by the browser.

### Cards (Output / Status)

- **Shape:** 12px radius, translucent card background.
- **Style:** Same surface card as inputs. On hover, a subtle violet-cyan gradient glow appears at very low opacity (15%/10%) behind the card — this is the only exception to the single-accent rule and is tied to content, not decoration.
- **Output text:** Monospace, Ink (#ececf1), pre-wrap. Max height 200px with 4px custom scrollbar.
- **Copy button:** 28px circle with subtle borders. On click, swaps icon to a green checkmark for 2s, then reverts.

### Status Bar

- **Position:** Bottom of the popup, separated by a subtle white 6% opacity line.
- **Dot:** 6px circle. Green (ready), amber + pulse (busy), red (error).
- **Text:** Ink Dim (#5c5c72), 0.7rem, on the right of the dot.

### Badge (version)

- **Shape:** Pill, 20px radius, small text (0.6rem).
- **Style:** Ink Dim text on surface card with subtle border.
- **Position:** Next to the brand mark in the header. Purely a version indicator; never used for notification counts.

## 6. Do's and Don'ts

### Do:
- **Do** use cyan as the single accent for all interactive states (focus, active, primary button).
- **Do** use monospace for all prompt text — input and output.
- **Do** keep the popui under 400px wide. This is a focused tool, not a dashboard.
- **Do** use backdrop-filter blur for surface separation instead of box-shadows.
- **Do** show token counts, provider, and processing state transparently.
- **Do** respect `prefers-reduced-motion` — all animations must fall back to instant transitions.
- **Do** test heading text at every breakpoint (the popup width is fixed, but line-wrapping matters at 400px).

### Don't:
- **Don't** use violet, purple, or any second accent color. Cyan is the only accent.
- **Don't** use gradient text anywhere — not for the brand mark, not for headings.
- **Don't** use glassmorphism as decoration. Blur serves structure (surface separation), not aesthetics.
- **Don't** use chatbot bubbles, robot icons, sparkle motifs, or any "AI" visual tropes.
- **Don't** use box-shadows on cards. Translucency is the depth mechanic.
- **Don't** use border-radius larger than 16px on any element.
- **Don't** use uppercase for body text, headings, or labels longer than 4 words.
- **Don't** use em dashes in copy. Use commas, colons, or periods instead.
- **Don't** duplicate the same entrance animation across every section. Each reveal should fit what it reveals.
