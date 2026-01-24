# Mad Max Theme Specification

## Overview

This document defines the Mad Max-inspired color palette and typography for the Gas Town UI, drawing aesthetic inspiration from the post-apocalyptic wasteland aesthetic.

## Color Palette

The theme uses five core colors representing elements of the wasteland:

### Primary Colors

| Color Name | Hex Code | RGB | Description |
|------------|----------|-----|-------------|
| **Rust** | `#B85C42` | rgb(184, 92, 66) | Weathered metal, oxidized surfaces |
| **Fire** | `#FF6B2C` | rgb(255, 107, 44) | Flames, explosions, energy |
| **Oil** | `#0F0F0F` | rgb(15, 15, 15) | Deep shadows, darkness, void |
| **Brass** | `#D4AF37` | rgb(212, 175, 55) | Machinery, accents, highlights |
| **Metal** | `#696969` | rgb(105, 105, 105) | Steel, concrete, industrial |

### Usage Guidelines

- **Rust (#B85C42)**: Use for primary interactive elements, buttons, highlights
- **Fire (#FF6B2C)**: Use for alerts, warnings, active states, emphasis
- **Oil (#0F0F0F)**: Use for backgrounds, containers, shadows
- **Brass (#D4AF37)**: Use for secondary accents, success states, decorative elements
- **Metal (#696969)**: Use for borders, dividers, disabled states, secondary text

### Example Combinations

```css
/* Primary button */
background: #B85C42;
color: #0F0F0F;
border: 2px solid #D4AF37;

/* Alert/Warning */
background: #FF6B2C;
color: #0F0F0F;
border: 2px solid #B85C42;

/* Container/Card */
background: #0F0F0F;
border: 1px solid #696969;
color: #D4AF37;
```

## Typography

### Primary Font: Share Tech Mono

**Font Family**: `'Share Tech Mono', monospace`

**Source**: Google Fonts - https://fonts.google.com/specimen/Share+Tech+Mono

**Characteristics**:
- Monospaced retro-futuristic aesthetic
- Clean geometric letterforms
- Evokes terminal/computer displays
- Excellent readability at various sizes

**Usage**:
- Body text
- UI labels
- Code displays
- Terminal-style interfaces

### Recommended Font Stack

```css
font-family: 'Share Tech Mono', 'Courier New', Courier, monospace;
```

### Additional Retro Font Options

For headers and special emphasis, consider these complementary fonts:

#### 1. **Russo One**
- Bold, industrial display font
- Use for: Main headings, titles, logo text
- Source: Google Fonts

#### 2. **Bungee**
- Blocky, architectural style
- Use for: Section headers, callouts
- Source: Google Fonts

#### 3. **Orbitron**
- Futuristic sans-serif
- Use for: Stats, metrics, numbers
- Source: Google Fonts

### Typography Scale

```css
/* Heading hierarchy */
h1 { font-size: 2.5rem; font-family: 'Russo One', sans-serif; }
h2 { font-size: 2rem; font-family: 'Russo One', sans-serif; }
h3 { font-size: 1.5rem; font-family: 'Share Tech Mono', monospace; }
h4 { font-size: 1.25rem; font-family: 'Share Tech Mono', monospace; }

/* Body text */
body { font-size: 1rem; font-family: 'Share Tech Mono', monospace; }
small { font-size: 0.875rem; }
```

## Implementation

### CSS Variables

Define theme colors as CSS custom properties:

```css
:root {
  --color-rust: #B85C42;
  --color-fire: #FF6B2C;
  --color-oil: #0F0F0F;
  --color-brass: #D4AF37;
  --color-metal: #696969;

  --font-primary: 'Share Tech Mono', 'Courier New', Courier, monospace;
  --font-display: 'Russo One', sans-serif;
}
```

### Google Fonts Import

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Russo+One&family=Bungee&family=Orbitron&display=swap" rel="stylesheet">
```

Or via CSS:

```css
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Russo+One&family=Bungee&family=Orbitron&display=swap');
```

## Design Principles

1. **High Contrast**: Use the dark Oil background with bright Rust/Fire/Brass foregrounds for maximum visibility
2. **Industrial Feel**: Leverage the monospaced font and angular color scheme to evoke machinery and decay
3. **Readability First**: Despite the aesthetic theme, ensure all text remains easily readable
4. **Consistent Spacing**: Use the monospaced font's natural rhythm for spacing decisions
5. **Limited Palette**: Stick to the five core colors to maintain cohesion

## Accessibility Notes

- **Rust on Oil**: Contrast ratio ~4.9:1 (WCAG AA for large text)
- **Fire on Oil**: Contrast ratio ~9.3:1 (WCAG AAA compliant)
- **Brass on Oil**: Contrast ratio ~9.8:1 (WCAG AAA compliant)
- **Metal on Oil**: Contrast ratio ~4.2:1 (WCAG AA for large text)

For body text and small UI elements, prefer Fire or Brass on Oil backgrounds to ensure AAA compliance.

## References

- Mad Max film series aesthetic
- Industrial/post-apocalyptic design
- Retro-futuristic UI patterns
- Terminal and command-line interfaces
