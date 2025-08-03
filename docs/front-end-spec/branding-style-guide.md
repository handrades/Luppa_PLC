# Branding & Style Guide

## Visual Identity

**Brand Guidelines:** Technical Brand System focused on professional credibility, high contrast for industrial environments, and consistent visual language across framework applications.

## Color Palette

### Light Mode (Primary)

| Color Type     | Hex Code  | Usage                                            |
| -------------- | --------- | ------------------------------------------------ |
| Primary        | `#1976d2` | Primary actions, links, active states            |
| Primary Dark   | `#115293` | Primary hover states, emphasis                   |
| Secondary      | `#424242` | Secondary actions, neutral elements              |
| Accent         | `#ff9800` | Warnings, important notices, highlights          |
| Success        | `#4caf50` | Confirmations, success states, online indicators |
| Warning        | `#ff9800` | Cautions, important notices, pending states      |
| Error          | `#f44336` | Errors, destructive actions, offline indicators  |
| Background     | `#fafafa` | Main background                                  |
| Surface        | `#ffffff` | Cards, modals, elevated elements                 |
| Text Primary   | `#212121` | Main text content                                |
| Text Secondary | `#757575` | Supporting text, labels                          |

### Dark Mode (Industrial Night Mode)

| Color Type     | Hex Code  | Usage                                                        |
| -------------- | --------- | ------------------------------------------------------------ |
| Primary        | `#90caf9` | Primary actions, links, active states (lighter for contrast) |
| Primary Dark   | `#42a5f5` | Primary hover states, emphasis                               |
| Secondary      | `#bdbdbd` | Secondary actions, neutral elements                          |
| Accent         | `#ffb74d` | Warnings, important notices, highlights                      |
| Success        | `#81c784` | Confirmations, success states, online indicators             |
| Warning        | `#ffb74d` | Cautions, important notices, pending states                  |
| Error          | `#e57373` | Errors, destructive actions, offline indicators              |
| Background     | `#121212` | Main background (Material Design dark)                       |
| Surface        | `#1e1e1e` | Cards, modals, elevated elements                             |
| Text Primary   | `#ffffff` | Main text content                                            |
| Text Secondary | `#b3b3b3` | Supporting text, labels                                      |

## Typography

### Font Families

- **Primary:** 'Roboto', sans-serif (Material-UI default, excellent readability)
- **Secondary:** 'Roboto Condensed', sans-serif (for data-dense areas, space efficiency)
- **Monospace:** 'Roboto Mono', monospace (for IP addresses, technical codes, data values)

### Type Scale

| Element | Size            | Weight        | Line Height |
| ------- | --------------- | ------------- | ----------- |
| H1      | 2.125rem (34px) | 300 (Light)   | 1.235       |
| H2      | 1.5rem (24px)   | 400 (Regular) | 1.334       |
| H3      | 1.25rem (20px)  | 400 (Regular) | 1.6         |
| Body    | 1rem (16px)     | 400 (Regular) | 1.5         |
| Small   | 0.875rem (14px) | 400 (Regular) | 1.43        |

## Iconography

**Icon Library:** Material-UI Icons + Custom Industrial Supplements

- Base: Material-UI icon set for consistency and completeness
- Custom: Industrial-specific icons (PLC types, sensors, controllers)
- Style: Outlined style for better visibility at small sizes
- Size: 24px standard, 20px compact, 16px inline

**Usage Guidelines:**

- Always pair icons with text labels in navigation
- Use consistent icon metaphors across framework apps
- Ensure 3:1 color contrast ratio for icon visibility
- Custom industrial icons should match Material Design style

## Spacing & Layout

**Grid System:** Material-UI 12-column responsive grid

- Breakpoints: xs(0px), sm(600px), md(960px), lg(1280px), xl(1920px)
- Container max-width: 1200px for optimal data table viewing
- Gutters: 16px mobile, 24px desktop

**Spacing Scale:** 8px base unit system

- xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px, xxl: 48px
- Consistent spacing creates visual rhythm
- Based on 8px grid for pixel-perfect alignment
- Supports Material-UI's spacing system
