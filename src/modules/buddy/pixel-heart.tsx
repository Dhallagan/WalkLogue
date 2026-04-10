import { useMemo } from "react";
import { View } from "react-native";

// 7x6 pixel heart
const HEART_FULL = [
  [0, 1, 1, 0, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1],
  [0, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 1, 0, 0],
  [0, 0, 0, 1, 0, 0, 0],
];

const HEART_EMPTY = [
  [0, 1, 1, 0, 1, 1, 0],
  [1, 0, 0, 1, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [0, 1, 0, 0, 0, 1, 0],
  [0, 0, 1, 0, 1, 0, 0],
  [0, 0, 0, 1, 0, 0, 0],
];

type Props = {
  health: number; // 0-100
  pixelSize?: number;
  color: string;
  emptyColor: string;
};

export function PixelHealthBar({ health, pixelSize = 3, color, emptyColor }: Props) {
  const totalHearts = 10;
  const filledHearts = Math.round((health / 100) * totalHearts);

  const hearts = useMemo(() => {
    const result: React.ReactNode[] = [];
    for (let i = 0; i < totalHearts; i++) {
      const grid = i < filledHearts ? HEART_FULL : HEART_EMPTY;
      const fillColor = i < filledHearts ? color : emptyColor;
      result.push(
        <View key={i} style={{ width: 7 * pixelSize, height: 6 * pixelSize, marginRight: 1 }}>
          {grid.map((row, y) =>
            row.map((cell, x) =>
              cell === 1 ? (
                <View
                  key={`${y}-${x}`}
                  style={{
                    position: "absolute",
                    left: x * pixelSize,
                    top: y * pixelSize,
                    width: pixelSize + 0.5,
                    height: pixelSize + 0.5,
                    backgroundColor: fillColor,
                  }}
                />
              ) : null,
            ),
          )}
        </View>,
      );
    }
    return result;
  }, [filledHearts, pixelSize, color, emptyColor]);

  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {hearts}
    </View>
  );
}
