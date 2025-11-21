<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import {
        FaceLandmarker,
        FilesetResolver,
        DrawingUtils,
        type FaceLandmarkerResult,
    } from "@mediapipe/tasks-vision";

    // --- Types ---
    type FeatureKey = string;

    interface EmotionFeature {
        threshold: number;
        features: Record<FeatureKey, number>;
    }

    type BlendShapeCategory = { categoryName: string; score: number };

    // --- Configuration ---
    const EMOTION_CONFIG: Record<string, EmotionFeature> = {
        Happy: {
            threshold: 0.28,
            features: {
                mouthSmileLeft: 0.4,
                mouthSmileRight: 0.4,
                cheekSquintLeft: 0.12,
                cheekSquintRight: 0.08,
            },
        },
        Sad: {
            threshold: 0.22,
            features: {
                mouthFrownLeft: 0.3,
                mouthFrownRight: 0.3,
                browInnerUp: 0.25,
                eyeWideLeft: 0.08,
                eyeWideRight: 0.07,
            },
        },
        Angry: {
            threshold: 0.32,
            features: {
                browDownLeft: 0.3,
                browDownRight: 0.3,
                eyeSquintLeft: 0.15,
                eyeSquintRight: 0.15,
                jawForward: 0.1,
            },
        },
        Surprised: {
            threshold: 0.35,
            features: {
                jawOpen: 0.35,
                eyeWideLeft: 0.25,
                eyeWideRight: 0.25,
                browInnerUp: 0.1,
                browOuterUpLeft: 0.03,
                browOuterUpRight: 0.02,
            },
        },
        Disgust: {
            threshold: 0.3,
            features: {
                noseSneerLeft: 0.35,
                noseSneerRight: 0.35,
                mouthUpperUpLeft: 0.15,
                mouthUpperUpRight: 0.15,
            },
        },
        Fear: {
            threshold: 0.28,
            features: {
                eyeWideLeft: 0.25,
                eyeWideRight: 0.25,
                browInnerUp: 0.25,
                jawOpen: 0.12,
                mouthStretchLeft: 0.07,
                mouthStretchRight: 0.06,
            },
        },
    };

    const ALPHA = 0.25; // Exponential Moving Average factor
    const MARGIN = 0.08; // Minimum difference between top 2 emotions

    // --- State (Runes) ---
    let videoElement = $state<HTMLVideoElement>();
    let canvasElement = $state<HTMLCanvasElement>();
    let emotion = $state<string | null>(null);
    let isLoading = $state(true);
    let errorMessage = $state<string | null>(null);
    let running = $state(false);

    // --- Non-reactive Instance Variables ---
    let faceLandmarker: FaceLandmarker | null = null;
    let requestRef: number | null = null;
    let ctx: CanvasRenderingContext2D | null = null;
    let drawingUtils: DrawingUtils | null = null;
    let smoothedScores: Record<string, number> | null = null;

    // --- Derived State ---
    let badgeClass = $derived.by(() => {
        if (errorMessage) return "badge-error";
        return emotion?.startsWith("Neutral")
            ? "badge-ghost bg-base-100/80"
            : "badge-primary";
    });

    // --- Lifecycle ---

    onMount(async () => {
        try {
            const vision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
            );

            faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                    delegate: "GPU", // Note: Switch to 'CPU' if encountering specific GPU crashes on mobile
                },
                outputFaceBlendshapes: true,
                runningMode: "VIDEO",
                numFaces: 1,
            });

            isLoading = false;
            await startWebcam();
        } catch (error) {
            console.error("Error initializing MediaPipe:", error);
            errorMessage = "Failed to load AI models.";
            isLoading = false;
        }
    });

    onDestroy(() => {
        // 1. Stop the animation loop
        running = false;
        if (requestRef) {
            cancelAnimationFrame(requestRef);
            requestRef = null;
        }

        // 2. Stop the webcam stream tracks (Critical for memory leak prevention)
        if (videoElement && videoElement.srcObject) {
            const stream = videoElement.srcObject as MediaStream;
            const tracks = stream.getTracks();
            tracks.forEach((track) => {
                track.stop();
            });
            videoElement.srcObject = null;
        }

        // 3. Close MediaPipe instance (Critical for GPU memory leak prevention)
        if (faceLandmarker) {
            faceLandmarker.close();
            faceLandmarker = null;
        }
    });

    // --- Effects ---

    // Effect: Initialize Canvas Context and Utils once
    $effect(() => {
        if (canvasElement && !ctx) {
            ctx = canvasElement.getContext("2d");
            if (ctx) {
                drawingUtils = new DrawingUtils(ctx);
            }
        }
    });

    // Effect: Start Loop when everything is ready
    $effect(() => {
        if (running && faceLandmarker && videoElement && ctx && drawingUtils) {
            predictWebcam();
        }
    });

    // --- Logic ---

    async function startWebcam() {
        if (!faceLandmarker) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
            });

            if (videoElement) {
                videoElement.srcObject = stream;
                // We wait for onloadeddata via the event handler to set running = true
            }
        } catch (err) {
            console.error("Error accessing webcam:", err);
            errorMessage =
                "Camera access denied. Please allow camera permissions.";
            isLoading = false;
        }
    }

    function handleVideoLoaded() {
        if (!videoElement || !canvasElement) return;

        // Resize canvas once to match video dimensions
        if (videoElement.videoWidth && videoElement.videoHeight) {
            canvasElement.width = videoElement.videoWidth;
            canvasElement.height = videoElement.videoHeight;
        }

        running = true;
    }

    async function predictWebcam() {
        // Guard clauses
        if (
            !running ||
            !faceLandmarker ||
            !videoElement ||
            !ctx ||
            !drawingUtils
        )
            return;

        const startTimeMs = performance.now();

        if (videoElement.currentTime > 0) {
            const results: FaceLandmarkerResult = faceLandmarker.detectForVideo(
                videoElement,
                startTimeMs,
            );

            // Clear canvas
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

            // Draw landmarks
            if (results.faceLandmarks) {
                for (const landmarks of results.faceLandmarks) {
                    drawingUtils.drawConnectors(
                        landmarks,
                        FaceLandmarker.FACE_LANDMARKS_TESSELATION,
                        { color: "#C0C0C070", lineWidth: 1 },
                    );
                    drawingUtils.drawConnectors(
                        landmarks,
                        FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
                        { color: "#FF3030" },
                    );
                    drawingUtils.drawConnectors(
                        landmarks,
                        FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
                        { color: "#FF3030" },
                    );
                    drawingUtils.drawConnectors(
                        landmarks,
                        FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
                        { color: "#30FF30" },
                    );
                    drawingUtils.drawConnectors(
                        landmarks,
                        FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
                        { color: "#30FF30" },
                    );
                    drawingUtils.drawConnectors(
                        landmarks,
                        FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
                        { color: "#E0E0E0" },
                    );
                    drawingUtils.drawConnectors(
                        landmarks,
                        FaceLandmarker.FACE_LANDMARKS_LIPS,
                        { color: "#E0E0E0" },
                    );
                }
            }

            // Process Emotions
            if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
                processEmotions(results.faceBlendshapes[0].categories);
            }
        }

        // Loop
        if (running) {
            requestRef = requestAnimationFrame(predictWebcam);
        }
    }

    function processEmotions(blendshapes: BlendShapeCategory[]) {
        // 1. Build score map for O(1) access
        const scoreMap = new Map<string, number>();
        for (const { categoryName, score } of blendshapes) {
            scoreMap.set(categoryName, score);
        }
        const getScore = (name: string) => scoreMap.get(name) || 0;

        // 2. Compute current raw scores
        const currentScores: Record<string, number> = {};
        for (const [emotionName, cfg] of Object.entries(EMOTION_CONFIG)) {
            let raw = 0;
            let weightSum = 0;
            for (const [feature, w] of Object.entries(cfg.features)) {
                raw += getScore(feature) * w;
                weightSum += w;
            }
            currentScores[emotionName] = weightSum > 0 ? raw / weightSum : 0;
        }

        // 3. Apply EMA smoothing
        if (!smoothedScores) {
            smoothedScores = { ...currentScores };
        } else {
            const next: Record<string, number> = {};
            for (const key of Object.keys(currentScores)) {
                next[key] =
                    ALPHA * currentScores[key] +
                    (1 - ALPHA) * (smoothedScores[key] || 0);
            }
            smoothedScores = next;
        }

        // 4. Decide Emotion
        const entries = Object.entries(smoothedScores);
        entries.sort((a, b) => b[1] - a[1]);

        const [bestEmotion, bestScore] = entries[0] || ["Neutral", 0];
        const secondScore = entries[1]?.[1] ?? 0;

        const cfg = EMOTION_CONFIG[bestEmotion];
        const passesThreshold = cfg && bestScore >= cfg.threshold;
        const passesMargin = bestScore - secondScore >= MARGIN;

        let finalLabel = "Neutral";
        let finalConfidence = 1 - bestScore;

        // Flattened logic as requested
        if (passesThreshold) {
            if (passesMargin || bestScore > 0.6) {
                finalLabel = bestEmotion;
                finalConfidence = bestScore;
            }
        }

        emotion = `${finalLabel} (${Math.round(finalConfidence * 100)}%)`;
    }
</script>

<div
    class="relative mx-auto w-full max-w-[720px] overflow-hidden rounded-xl bg-black shadow-xl"
>
    <!-- Loading / Error Overlay -->
    {#if isLoading || errorMessage}
        <div
            class="bg-base-100 absolute inset-0 z-20 flex flex-col items-center justify-center"
        >
            {#if errorMessage}
                <div class="text-error text-center p-4">
                    <p class="font-bold text-lg">Error</p>
                    <p>{errorMessage}</p>
                </div>
            {:else}
                <span class="loading loading-spinner loading-lg text-primary"
                ></span>
                <p class="text-base-content/70 mt-4">Loading AI Models...</p>
            {/if}
        </div>
    {/if}

    <!-- svelte-ignore a11y_media_has_caption -->
    <video
        bind:this={videoElement}
        onloadeddata={handleVideoLoaded}
        class="block h-auto w-full"
        autoplay
        playsinline
        muted
    ></video>

    <canvas
        bind:this={canvasElement}
        class="absolute left-0 top-0 z-10 h-full w-full"
    ></canvas>

    {#if emotion && !errorMessage}
        <div class="absolute bottom-4 left-4 z-20">
            <div
                class={`badge badge-lg p-4 text-lg font-bold shadow-lg ${badgeClass}`}
            >
                {emotion}
            </div>
        </div>
    {/if}
</div>
