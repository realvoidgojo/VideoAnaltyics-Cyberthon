// utils/canvasUtils.js
export const drawBoundingBox = (ctx, x1, y1, x2, y2, color) => {
  ctx.beginPath();
  ctx.rect(x1, y1, x2 - x1, y2 - y1);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
};

export const drawLabel = (ctx, x, y, text, bgColor) => {
  ctx.font = "12px Arial";
  const textWidth = ctx.measureText(text).width;

  // Draw background
  ctx.fillStyle = bgColor;
  ctx.fillRect(x, y - 14, textWidth + 8, 16);

  // Draw text
  ctx.fillStyle = "#000";
  ctx.fillText(text, x + 4, y);
};
