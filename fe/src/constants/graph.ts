// Edge color constants
export const EDGE_COLORS = {
  ONE_WAY: "#1976d2", // Blue for one-way edges
  TWO_WAY: "#d32f2f", // Red for two-way edges
} as const;

// Node dimensions
export const NODE_DIMENSIONS = {
  WIDTH: 192, // 192px (w-48)
  HEIGHT: 96, // 96px (h-24)
} as const;

// Autosave delay
export const AUTOSAVE_DELAY_MS = 1000;

// Version history limit
export const VERSION_HISTORY_LIMIT = 5;

// Local storage keys
export const STORAGE_KEYS = {
  HAS_VISITED: "pcdnge_visited",
} as const;
