# OneMFin Design System - TravelPerk-Style Blue

## Overview

OneMFin has been refreshed with a modern, enterprise-grade design system inspired by TravelPerk's clean aesthetic. The system uses a blue primary color scheme with consistent spacing, typography, and component patterns.

## Design Tokens

### Colors (HSL via CSS Variables)

#### Light Mode
- **Primary**: `221 83% 53%` (Blue-600 equivalent)
- **Primary Foreground**: `210 40% 98%` (Very light blue for text on primary)
- **Background**: `0 0% 100%` (White)
- **Foreground**: `222 47% 11%` (Dark slate for text)
- **Card**: `0 0% 100%` (White)
- **Card Foreground**: `222 47% 11%` (Dark slate)
- **Border**: `214 32% 91%` (Light slate border)
- **Input**: `214 32% 91%` (Light slate)
- **Ring**: `221 83% 53%` (Primary blue for focus rings)
- **Muted**: `210 40% 96%` (Light slate)
- **Muted Foreground**: `215 16% 47%` (Medium slate)
- **Secondary**: `210 40% 96%` (Light slate)
- **Secondary Foreground**: `222 47% 11%` (Dark slate)
- **Accent**: `210 40% 96%` (Light slate)
- **Accent Foreground**: `222 47% 11%` (Dark slate)
- **Destructive**: `0 84% 60%` (Red)
- **Destructive Foreground**: `210 40% 98%` (Very light)

#### Dark Mode
- **Primary**: `221 83% 58%` (Slightly lighter blue)
- **Background**: `222 47% 4%` (Very dark slate)
- **Foreground**: `210 40% 98%` (Very light)
- **Card**: `222 47% 6%` (Dark slate)
- **Border**: `222 47% 14%` (Dark slate)

### Radius System
- **sm**: `8px` (var(--radius-sm))
- **md**: `12px` (var(--radius-md))
- **lg**: `20px` (var(--radius-lg))
- **xl**: `28px` (var(--radius-xl))

### Shadows
- **sm**: `0 1px 2px 0 hsl(0 0% 0% / 0.05)`
- **DEFAULT**: `0 1px 3px 0 hsl(0 0% 0% / 0.1), 0 1px 2px -1px hsl(0 0% 0% / 0.1)`
- **lg**: `0 10px 15px -3px hsl(0 0% 0% / 0.1), 0 4px 6px -4px hsl(0 0% 0% / 0.1)`

### Motion
- **Duration**: `200ms` (var(--duration))
- **Easing**: `cubic-bezier(0.2, 0.8, 0.2, 1)` (var(--ease))

## Component Guidelines

### Buttons
- **Minimum Height**: 44px for all button sizes
- **Variants**: `primary`, `secondary`, `outline`, `ghost`, `link`, `destructive`
- **Sizes**: `sm`, `md`, `lg`, `icon`
- **Focus**: Always visible focus ring using `ring-ring`

### Inputs
- **Minimum Height**: 44px
- **Border Radius**: `var(--radius-md)` (12px)
- **Focus**: Blue ring using `ring-ring`
- **Transitions**: Smooth color transitions

### Cards
- **Border Radius**: `var(--radius-lg)` (20px)
- **Shadow**: `var(--shadow)` by default
- **Padding**: Consistent 24px (p-6)
- **Hover**: Subtle shadow increase

### Navigation
- **Sidebar**: 240px width with blue accent colors
- **Active States**: Primary blue background with 12% opacity
- **Hover States**: Primary blue background with 8% opacity
- **Transitions**: 200ms with custom easing

## Chart Theming

### ChartThemeProvider
The `ChartThemeProvider` provides consistent theming for all Recharts components:

```tsx
import { useChartTheme } from "@/components/charts/ThemeProvider";

const chartTheme = useChartTheme();

// Use theme colors
<Line stroke={chartTheme.colors.primary} />
```

### Chart Colors
- **Primary**: Blue (from CSS variables)
- **Success**: Emerald-600
- **Warning**: Amber-500
- **Danger**: Destructive red
- **Grid/Axis**: Muted foreground
- **Tooltips**: Card background with borders

## Usage Examples

### Basic Button
```tsx
<Button variant="primary" size="md">
  Click me
</Button>
```

### Card with Content
```tsx
<Card className="hover:shadow-lg transition-all duration-200">
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>
```

### Themed Chart
```tsx
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={data}>
    <Line 
      dataKey="value" 
      stroke={chartTheme.colors.primary}
      strokeWidth={3}
    />
    <Tooltip 
      contentStyle={{
        backgroundColor: chartTheme.colors.tooltip.background,
        border: `1px solid ${chartTheme.colors.tooltip.border}`,
        borderRadius: '8px',
        boxShadow: chartTheme.shadows.tooltip
      }}
    />
  </LineChart>
</ResponsiveContainer>
```

## Third-Party Integration

### Clerk Authentication
- Custom CSS overrides in `src/styles/clerk.css`
- Matches OneMFin design tokens
- Consistent button heights (44px minimum)
- Blue primary color scheme

### Calendly
- Wrapped in Card components
- Neutral surface backgrounds
- Propagates font and color schemes

## Migration Guide

### Replacing Old Colors
- `blue-500` → `text-primary` or `bg-primary`
- `blue-600` → `text-primary` or `bg-primary`
- `blue-700` → `text-primary-foreground`
- Hex colors → Use semantic tokens

### Updating Shadows
- `shadow-sm` → `shadow` (new default)
- Custom shadows → Use `shadow`, `shadow-lg`

### Component Updates
- Replace ad-hoc buttons with `<Button>` component
- Use `<Card>` for all content containers
- Apply consistent spacing (`space-y-8`, `gap-6`)

## File Structure

```
src/
├── components/
│   ├── charts/
│   │   └── ThemeProvider.tsx    # Chart theming
│   └── ui/                      # Shadcn UI components
├── styles/
│   └── clerk.css               # Clerk overrides
├── layouts/
│   └── AppLayout.tsx           # Main app shell
└── pages/app/                  # Route pages
    ├── Dashboard.tsx           # Updated dashboard
    ├── Leads.tsx               # Leads management
    ├── Assessments.tsx         # Assessment forms
    ├── Meetings.tsx            # Meeting scheduling
    ├── Settings.tsx            # User settings
    └── ...
```

## Accessibility

- **Focus Rings**: Always visible using `ring-ring`
- **Color Contrast**: WCAG AA compliant
- **Touch Targets**: Minimum 44px height
- **Keyboard Navigation**: Full support
- **Screen Readers**: Proper ARIA labels

## Browser Support

- Modern browsers (Chrome 90+, Firefox 88+, Safari 14+)
- CSS Custom Properties support required
- Tailwind CSS v3.4+

## Future Enhancements

- Dark mode toggle component
- Additional chart themes
- Animation library integration
- Component playground
- Design token documentation site
