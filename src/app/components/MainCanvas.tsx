"use client";

import React, { useState, useRef } from "react";
import AddPhotoButton from "../components/AddPhotoButton";
import ImageCanvas from "../components/ImageCanvas";

const MainCanvas: React.FC = () => {
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [activeTool, setActiveTool] = useState<string>("lasso");
    const [brushSize, setBrushSize] = useState<number>(30);
    const [brushOpacity, setBrushOpacity] = useState<number>(0.5);
    const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleImageSelect = (file: File) => {
        const img = new Image();
        img.onload = () => setImage(img);
        img.src = URL.createObjectURL(file);
    };

    const handleExport = () => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        if (!ctx) return;

        const exportCanvas = document.createElement("canvas");
        const exportCtx = exportCanvas.getContext("2d");

        if (!exportCtx) return;

        exportCanvas.width = canvas.width;
        exportCanvas.height = canvas.height;

        if (activeTool === "lasso" && points.length > 0) {
            exportCtx.beginPath();
            points.forEach((point, index) => {
                if (index === 0) {
                    exportCtx.moveTo(point.x, point.y);
                } else {
                    exportCtx.lineTo(point.x, point.y);
                }
            });
            exportCtx.closePath();
            exportCtx.clip();
            exportCtx.drawImage(canvas, 0, 0);

            const imageData = exportCtx.getImageData(0, 0, exportCanvas.width, exportCanvas.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const gray = (r + g + b) / 3;
                data[i] = gray;
                data[i + 1] = gray;
                data[i + 2] = gray;
            }

            exportCtx.putImageData(imageData, 0, 0);

            const bounds = points.reduce(
                (acc, point) => ({
                    minX: Math.min(acc.minX, point.x),
                    minY: Math.min(acc.minY, point.y),
                    maxX: Math.max(acc.maxX, point.x),
                    maxY: Math.max(acc.maxY, point.y),
                }),
                { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
            );

            const croppedWidth = bounds.maxX - bounds.minX;
            const croppedHeight = bounds.maxY - bounds.minY;

            const croppedImageData = exportCtx.getImageData(
                bounds.minX,
                bounds.minY,
                croppedWidth,
                croppedHeight
            );

            exportCanvas.width = croppedWidth;
            exportCanvas.height = croppedHeight;
            exportCtx.putImageData(croppedImageData, 0, 0);

            const link = document.createElement("a");
            link.download = "lasso-selected-area.png";
            link.href = exportCanvas.toDataURL("image/png");
            link.click();
        } else if (activeTool === "brush" && points.length > 0) {
            const mask = new Set<string>();
            const interpolatedPoints = [];

            for (let i = 1; i < points.length; i++) {
                const prevPoint = points[i - 1];
                const currPoint = points[i];
                const dx = currPoint.x - prevPoint.x;
                const dy = currPoint.y - prevPoint.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const steps = Math.ceil(distance / (brushSize / 2));

                for (let j = 0; j <= steps; j++) {
                    const x = prevPoint.x + (dx / steps) * j;
                    const y = prevPoint.y + (dy / steps) * j;
                    interpolatedPoints.push({ x, y });
                }
            }

            interpolatedPoints.forEach(({ x, y }) => {
                for (let dx = -Math.floor(brushSize / 2); dx <= Math.floor(brushSize / 2); dx++) {
                    for (let dy = -Math.floor(brushSize / 2); dy <= Math.floor(brushSize / 2); dy++) {
                        if (dx * dx + dy * dy <= (brushSize / 2) * (brushSize / 2)) {
                            const px = Math.floor(x + dx);
                            const py = Math.floor(y + dy);

                            if (px >= 0 && py >= 0 && px < canvas.width && py < canvas.height) {
                                mask.add(`${px},${py}`);
                            }
                        }
                    }
                }
            });

            if (mask.size === 0) return;

            const bounds = Array.from(mask).reduce(
                (acc, coord) => {
                    const [px, py] = coord.split(",").map(Number);
                    return {
                        minX: Math.min(acc.minX, px),
                        minY: Math.min(acc.minY, py),
                        maxX: Math.max(acc.maxX, px),
                        maxY: Math.max(acc.maxY, py),
                    };
                },
                { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
            );

            const croppedWidth = bounds.maxX - bounds.minX + 1;
            const croppedHeight = bounds.maxY - bounds.minY + 1;

            const exportCanvas = document.createElement("canvas");
            const exportCtx = exportCanvas.getContext("2d");

            exportCanvas.width = croppedWidth;
            exportCanvas.height = croppedHeight;

            if (!exportCtx) return;

            const imageData = ctx.getImageData(bounds.minX, bounds.minY, croppedWidth, croppedHeight);
            const data = imageData.data;

            for (let y = 0; y < croppedHeight; y++) {
                for (let x = 0; x < croppedWidth; x++) {
                    const pixelIndex = (y * croppedWidth + x) * 4;
                    const globalX = bounds.minX + x;
                    const globalY = bounds.minY + y;

                    if (!mask.has(`${globalX},${globalY}`)) {
                        data[pixelIndex + 3] = 0;
                    } else {
                        const r = data[pixelIndex];
                        const g = data[pixelIndex + 1];
                        const b = data[pixelIndex + 2];
                        const gray = (r + g + b) / 3;
                        data[pixelIndex] = gray;
                        data[pixelIndex + 1] = gray;
                        data[pixelIndex + 2] = gray;
                    }
                }
            }

            exportCtx.putImageData(imageData, 0, 0);

            const link = document.createElement("a");
            link.download = "brush-selected-area.png";
            link.href = exportCanvas.toDataURL("image/png");
            link.click();
        } else if (activeTool === "rectangle" && points.length === 4) {
            const start = points[0];
            const end = points[2];
            const rectWidth = Math.abs(end.x - start.x);
            const rectHeight = Math.abs(end.y - start.y);
            const rectX = Math.min(start.x, end.x);
            const rectY = Math.min(start.y, end.y);

            if (rectWidth <= 0 || rectHeight <= 0) return;

            const exportCanvas = document.createElement("canvas");
            const exportCtx = exportCanvas.getContext("2d");

            if (!exportCtx) return;

            exportCanvas.width = rectWidth;
            exportCanvas.height = rectHeight;

            const croppedImageData = ctx.getImageData(rectX, rectY, rectWidth, rectHeight);
            const data = croppedImageData.data;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const gray = (r + g + b) / 3;
                data[i] = gray;
                data[i + 1] = gray;
                data[i + 2] = gray;
                data[i + 3] = 255;
            }

            exportCtx.putImageData(croppedImageData, 0, 0);

            const link = document.createElement("a");
            link.download = "rectangle-selected-area.png";
            link.href = exportCanvas.toDataURL("image/png");
            link.click();
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-500">
            <div className="absolute top-4">
                <AddPhotoButton onImageSelect={handleImageSelect} />
            </div>
            {image && (
                <div className="flex flex-col items-center">
                    <ImageCanvas
                        ref={canvasRef}
                        image={image}
                        activeTool={activeTool}
                        brushSize={brushSize}
                        brushOpacity={brushOpacity}
                        setPoints={setPoints}
                    />
                    <div className="flex items-center space-x-4 p-4 bg-black rounded-lg shadow-md mt-4">
                        <button
                            onClick={() => setActiveTool("lasso")}
                            className={`flex items-center px-4 py-2 rounded ${
                                activeTool === "lasso"
                                    ? "bg-green-500 text-black font-bold"
                                    : "bg-black text-white hover:bg-gray-800"
                            }`}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-6 h-6 mr-2"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m-6-8h6"
                                />
                            </svg>
                            Lasso
                        </button>
                        <button
                            onClick={() => setActiveTool("brush")}
                            className={`flex items-center px-4 py-2 rounded ${
                                activeTool === "brush"
                                    ? "bg-green-500 text-black font-bold"
                                    : "bg-black text-white hover:bg-gray-800"
                            }`}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-6 h-6 mr-2"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3 10h11l4-8m-6 18h-3l4-8"
                                />
                            </svg>
                            Brush
                        </button>
                        <button
                            onClick={() => setActiveTool("rectangle")}
                            className={`flex items-center px-4 py-2 rounded ${
                                activeTool === "rectangle"
                                    ? "bg-green-500 text-black font-bold"
                                    : "bg-black text-white hover:bg-gray-800"
                            }`}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-6 h-6 mr-2"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <rect
                                    x="4"
                                    y="4"
                                    width="16"
                                    height="16"
                                    rx="2"
                                    ry="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                />
                            </svg>
                            Rectangle
                        </button>
                    </div>
                    <button
                        onClick={handleExport}
                        className="mt-4 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-700"
                    >
                        Export
                    </button>
                </div>
            )}
        </div>
    );
};

export default MainCanvas;
