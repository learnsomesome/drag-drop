import type { Modifier } from "@dnd-kit/core";

export function createSnapModifier(
  gridSize: number,
  deviationRepair?: boolean
): Modifier {
  return ({ transform, containerNodeRect }) => {
    console.log(
      "containerNodeRect",
      containerNodeRect?.width,
      // transform.x,
      // transform.y
      // Math.floor(transform.x / gridSize) * gridSize,
      // Math.floor(transform.y / gridSize) * gridSize
      deviationRepair
    );
    if (!containerNodeRect || containerNodeRect.width < 301) {
      return { ...transform };
    }

    let difference = 0;

    while (
      deviationRepair &&
      (containerNodeRect.width + 30 + difference) % gridSize !== 0
    ) {
      difference++;
    }

    console.log("difference", difference);

    return {
      ...transform,
      x: Math.floor(transform.x / gridSize) * gridSize + difference,
      y: Math.floor(transform.y / gridSize) * gridSize,
    };
  };
}
