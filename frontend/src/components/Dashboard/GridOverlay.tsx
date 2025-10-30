/**
 * Grid overlay component - shows visual grid during drag/resize
 */

interface GridOverlayProps {
  cols: number;
  rows: number;
  rowHeight: number;
  margin: number;
  containerPadding: number;
}

export const GridOverlay = ({
  cols,
  rows,
  rowHeight,
  margin,
  containerPadding,
}: GridOverlayProps) => {
  // Calculate cell size
  const cellWidth = rowHeight; // Square cells
  const cellHeight = rowHeight;

  // Calculate total grid dimensions (only show complete squares)
  const totalWidth = cols * cellWidth + (cols - 1) * margin;
  const totalHeight = rows * cellHeight + (rows - 1) * margin;

  return (
    <div
      className="absolute pointer-events-none z-10"
      style={{
        top: `${containerPadding}px`,
        left: `${containerPadding}px`,
        width: `${totalWidth}px`,
        height: `${totalHeight}px`,
      }}
    >
      <svg width="100%" height="100%" className="opacity-30">
        {/* Draw grid lines manually to ensure exact alignment */}
        <defs>
          <pattern
            id="grid"
            x="0"
            y="0"
            width={cellWidth + margin}
            height={cellHeight + margin}
            patternUnits="userSpaceOnUse"
          >
            <rect
              x="0"
              y="0"
              width={cellWidth}
              height={cellHeight}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="1.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>
  );
};
