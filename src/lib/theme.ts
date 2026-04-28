// src/lib/theme.ts
// Mountain-themed colors for Hualas (greens/blues)

export const hualasTheme = {
  // Primary: Mountain green
  accent: 'grass', // Radix UI built-in: grass green

  // Secondary: Mountain blue
  // We'll use 'sky' for secondary

  // Neutrals: Grays
  gray: 'mauve', // Radix UI built-in: neutral gray

  // Dark mode support
  appearance: 'light' as const, // or 'dark', or 'inherit'

  // Scaling
  scaling: '100%',

  // Radius
  radius: 'medium',
};

// Export for use in layout
export default hualasTheme;
