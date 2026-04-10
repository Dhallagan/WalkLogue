import { useMemo } from "react";
import { View } from "react-native";

import { useThemeColors } from "../../theme";

type Props = {
  grid: number[][];
  size?: number; // total display size in points
  dead?: boolean;
};

export function PixelSprite({ grid, size = 160, dead = false }: Props) {
  const { colors } = useThemeColors();
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const pixelSize = size / Math.max(rows, cols);

  const rendered = useMemo(() => {
    const result: React.ReactNode[] = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (grid[y][x] === 1) {
          result.push(
            <View
              key={`${y}-${x}`}
              style={{
                position: "absolute",
                left: x * pixelSize,
                top: y * pixelSize,
                width: pixelSize + 0.5, // overlap to prevent gaps
                height: pixelSize + 0.5,
                backgroundColor: colors.text,
              }}
            />,
          );
        }
      }
    }
    return result;
  }, [grid, pixelSize, rows, cols, colors.text]);

  return (
    <View
      style={{
        width: size,
        height: size,
        opacity: dead ? 0.2 : 1,
      }}
    >
      {rendered}
    </View>
  );
}
