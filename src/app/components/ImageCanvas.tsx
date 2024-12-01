import React, {
    useRef,
    useEffect,
    useState,
    forwardRef,
    useImperativeHandle,
} from "react";

interface ImageCanvasProps {
    image: HTMLImageElement;
    activeTool: string;
    brushSize: number;
    brushOpacity: number;
    setPoints: React.Dispatch<React.SetStateAction<{ x: number; y: number }[]>>;
}

const ImageCanvas = forwardRef<HTMLCanvasElement, ImageCanvasProps>(
    ({ image, activeTool, brushSize, brushOpacity, setPoints }, ref) => {
        const canvasRef = useRef<HTMLCanvasElement | null>(null);
        const [localPoints, setLocalPoints] = useState<{ x: number; y: number }[]>([]);
        const [drawing, setDrawing] = useState(false);
        const [rectStart, setRectStart] = useState<{ x: number; y: number } | null>(null);
        const [rectEnd, setRectEnd] = useState<{ x: number; y: number } | null>(null);
        const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

        const ZOOM_CANVAS_SIZE = 150;
        const [zoomPosition, setZoomPosition] = useState<{ top: number; left: number }>({
            top: -ZOOM_CANVAS_SIZE / 2,
            left: 600 - ZOOM_CANVAS_SIZE + 10,
        });

        useImperativeHandle(ref, () => canvasRef.current as HTMLCanvasElement);

        useEffect(() => {
            setLocalPoints([]);
            setRectStart(null);
            setRectEnd(null);
        }, [activeTool, image]);

        useEffect(() => {
            if (canvasRef.current) {
                const canvas = canvasRef.current;
                const ctx = canvas.getContext("2d");

                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

                    if (activeTool === "lasso" && localPoints.length > 0) {
                        ctx.beginPath();
                        ctx.moveTo(localPoints[0].x, localPoints[0].y);

                        localPoints.forEach((point) => {
                            ctx.lineTo(point.x, point.y);
                        });
                        ctx.strokeStyle = "red";
                        ctx.lineWidth = 4;
                        ctx.stroke();

                        ctx.lineTo(localPoints[0].x, localPoints[0].y);
                        ctx.strokeStyle = "rgba(255, 0, 0, 0.3)";
                        ctx.lineWidth = 2;
                        ctx.stroke();

                        ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
                        ctx.closePath();
                        ctx.fill();
                    }

                    if (activeTool === "rectangle" && rectStart && rectEnd) {
                        const width = rectEnd.x - rectStart.x;
                        const height = rectEnd.y - rectStart.y;

                        ctx.beginPath();
                        ctx.rect(rectStart.x, rectStart.y, width, height);

                        ctx.strokeStyle = "green";
                        ctx.lineWidth = 2;
                        ctx.stroke();

                        ctx.globalAlpha = 0.5;
                        ctx.fillStyle = "rgba(0, 255, 0, 0.5)";
                        ctx.fill();
                        ctx.globalAlpha = 1.0;
                    }

                    if (activeTool === "brush" && localPoints.length > 0) {
                        ctx.globalAlpha = brushOpacity;
                        ctx.strokeStyle = "green";
                        ctx.lineWidth = brushSize;
                        ctx.lineCap = "round";
                        ctx.lineJoin = "round";

                        ctx.beginPath();
                        ctx.moveTo(localPoints[0].x, localPoints[0].y);

                        for (let i = 1; i < localPoints.length; i++) {
                            ctx.lineTo(localPoints[i].x, localPoints[i].y);
                        }

                        ctx.stroke();
                        ctx.globalAlpha = 1.0;
                    }
                }
            }
        }, [image, localPoints, activeTool, rectStart, rectEnd, brushSize, brushOpacity]);

        const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
            setDrawing(true);
            const rect = canvasRef.current?.getBoundingClientRect();
            const x = e.clientX - (rect?.left || 0);
            const y = e.clientY - (rect?.top || 0);

            if (activeTool === "lasso" || activeTool === "brush") {
                setLocalPoints([{ x, y }]);
            } else if (activeTool === "rectangle") {
                setRectStart({ x, y });
                setRectEnd(null);
            }
        };

        const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
            if (!canvasRef.current) return;

            const rect = canvasRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            setMousePos({ x, y });

            const buffer = 20;
            const zoomRect = {
                left: zoomPosition.left,
                top: zoomPosition.top,
                right: zoomPosition.left + ZOOM_CANVAS_SIZE,
                bottom: zoomPosition.top + ZOOM_CANVAS_SIZE,
            };

            if (
                x >= zoomRect.left - buffer &&
                x <= zoomRect.right + buffer &&
                y >= zoomRect.top - buffer &&
                y <= zoomRect.bottom + buffer
            ) {
                setZoomPosition((prev) => ({
                    top: prev.top,
                    left: prev.left >= 600 / 2 ? -10 : 600 - ZOOM_CANVAS_SIZE + 10,
                }));
            }

            if (drawing && (activeTool === "lasso" || activeTool === "brush")) {
                setLocalPoints((prev) => [...prev, { x, y }]);
            } else if (drawing && activeTool === "rectangle" && rectStart) {
                setRectEnd({ x, y });
            }
        };

        const handleMouseUp = () => {
            setDrawing(false);

            if (activeTool === "lasso") {
                setPoints(localPoints);
            } else if (activeTool === "rectangle" && rectStart && rectEnd) {
                setPoints([
                    { x: rectStart.x, y: rectStart.y },
                    { x: rectEnd.x, y: rectStart.y },
                    { x: rectEnd.x, y: rectEnd.y },
                    { x: rectStart.x, y: rectEnd.y },
                ]);
            } else if (activeTool === "brush") {
                setPoints(localPoints);
            }
        };

        return (
            <div className="relative">
                <canvas
                    ref={canvasRef}
                    width={600}
                    height={400}
                    className="border border-gray-300"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                />

                {mousePos && (
                    <div
                        className="absolute rounded-lg overflow-hidden bg-white border-2 border-white"
                        style={{
                            top: zoomPosition.top,
                            left: zoomPosition.left,
                            width: ZOOM_CANVAS_SIZE,
                            height: ZOOM_CANVAS_SIZE,
                        }}
                    >
                        <canvas
                            width={ZOOM_CANVAS_SIZE}
                            height={ZOOM_CANVAS_SIZE}
                            ref={(zoomCanvas) => {
                                if (zoomCanvas && canvasRef.current) {
                                    const ctx = zoomCanvas.getContext("2d");
                                    const canvasCtx = canvasRef.current.getContext("2d");
                                    if (ctx && canvasCtx) {
                                        const zoomSize = ZOOM_CANVAS_SIZE;
                                        const zoomHalf = zoomSize / 2;

                                        ctx.clearRect(0, 0, zoomSize, zoomSize);
                                        ctx.drawImage(
                                            canvasRef.current,
                                            mousePos.x - zoomHalf,
                                            mousePos.y - zoomHalf,
                                            zoomSize,
                                            zoomSize,
                                            0,
                                            0,
                                            zoomSize,
                                            zoomSize
                                        );

                                        ctx.beginPath();
                                        ctx.strokeStyle = "black";
                                        ctx.lineWidth = 1;

                                        ctx.moveTo(zoomHalf, zoomHalf - 7.5);
                                        ctx.lineTo(zoomHalf, zoomHalf + 7.5);

                                        ctx.moveTo(zoomHalf - 7.5, zoomHalf);
                                        ctx.lineTo(zoomHalf + 7.5, zoomHalf);

                                        ctx.stroke();
                                    }
                                }
                            }}
                        />
                    </div>
                )}
            </div>
        );
    }
);

export default ImageCanvas;
