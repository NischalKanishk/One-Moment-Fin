import React, { createContext, useContext, ReactNode } from 'react';

interface ChartTheme {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    danger: string;
    muted: string;
    grid: string;
    axis: string;
    tooltip: {
      background: string;
      border: string;
      text: string;
    };
  };
  shadows: {
    tooltip: string;
  };
}

const defaultTheme: ChartTheme = {
  colors: {
    primary: 'hsl(var(--primary))',
    secondary: 'hsl(var(--muted))',
    success: 'hsl(142 76% 36%)', // emerald-600
    warning: 'hsl(38 92% 50%)', // amber-500
    danger: 'hsl(var(--destructive))',
    muted: 'hsl(var(--muted-foreground))',
    grid: 'hsl(var(--border))',
    axis: 'hsl(var(--muted-foreground))',
    tooltip: {
      background: 'hsl(var(--card))',
      border: 'hsl(var(--border))',
      text: 'hsl(var(--card-foreground))',
    },
  },
  shadows: {
    tooltip: 'var(--shadow-lg)',
  },
};

const ChartThemeContext = createContext<ChartTheme>(defaultTheme);

export const useChartTheme = () => {
  const context = useContext(ChartThemeContext);
  if (!context) {
    throw new Error('useChartTheme must be used within a ChartThemeProvider');
  }
  return context;
};

interface ChartThemeProviderProps {
  children: ReactNode;
  theme?: Partial<ChartTheme>;
}

export const ChartThemeProvider: React.FC<ChartThemeProviderProps> = ({ 
  children, 
  theme = {} 
}) => {
  const mergedTheme = {
    ...defaultTheme,
    ...theme,
    colors: {
      ...defaultTheme.colors,
      ...theme.colors,
    },
  };

  return (
    <ChartThemeContext.Provider value={mergedTheme}>
      {children}
    </ChartThemeContext.Provider>
  );
};

export default ChartThemeProvider;
