<script lang="ts">
    import { onMount, untrack } from "svelte";
    import { browser } from "$app/environment";
    import {
        PlusCircle,
        Trash2,
        AlertCircle,
        Droplets,
        Loader2,
    } from "lucide-svelte";

    // --- Types ---
    type Emotion =
        | "neutral"
        | "happy"
        | "sad"
        | "angry"
        | "surprised"
        | "fearful";
    type Severity = "mild" | "moderate" | "severe";
    type StoolType =
        | "none"
        | "type1"
        | "type2"
        | "type3"
        | "type4"
        | "type5"
        | "type6"
        | "type7";

    interface SymptomLog {
        id: string;
        note: string;
        emotion: Emotion;
        severity: Severity;
        stoolType: StoolType;
        time: string;
        advice?: string;
        isLoadingAdvice?: boolean;
    }

    interface BristolType {
        value: StoolType;
        label: string;
        desc: string;
    }

    // --- Constants ---
    const STORAGE_KEY = "symptomLogs";
    const MAX_LOGS = 100;

    const bristolTypes: BristolType[] = [
        { value: "none", label: "Không ghi nhận", desc: "" },
        {
            value: "type1",
            label: "Loại 1: Táo bón nặng",
            desc: "Cục cứng riêng biệt, khó đi",
        },
        {
            value: "type2",
            label: "Loại 2: Táo bón nhẹ",
            desc: "Hình xúc xích, lổn nhổn",
        },
        {
            value: "type3",
            label: "Loại 3: Bình thường",
            desc: "Hình xúc xích, có vết nứt",
        },
        {
            value: "type4",
            label: "Loại 4: Tốt nhất",
            desc: "Hình xúc xích, mềm và trơn",
        },
        {
            value: "type5",
            label: "Loại 5: Thiếu chất xơ",
            desc: "Viên mềm, cạnh rõ ràng",
        },
        {
            value: "type6",
            label: "Loại 6: Tiêu chảy nhẹ",
            desc: "Mảnh xốp, cạnh lởm chởm",
        },
        {
            value: "type7",
            label: "Loại 7: Tiêu chảy nặng",
            desc: "Hoàn toàn lỏng, không có xác",
        },
    ];

    // --- State ---
    let logs = $state<SymptomLog[]>([]);
    let note = $state("");
    let emotion = $state<Emotion>("neutral");
    let severity = $state<Severity>("mild");
    let stoolType = $state<StoolType>("none");
    let isSubmitting = $state(false);

    // --- Derived State ---
    let isFormValid = $derived(note.trim() !== "" || stoolType !== "none");

    // --- Lifecycle & Persistence ---
    onMount(() => {
        if (!browser) return;

        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                logs = JSON.parse(raw);
            }
        } catch (e) {
            console.warn("Failed to load symptom logs", e);
        }
    });

    $effect(() => {
        if (browser) {
            untrack(() => {
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
                } catch (e) {
                    console.warn("Failed to save symptom logs", e);
                }
            });
        }
    });

    // --- Helper Functions ---
    const generateId = (): string => {
        if (typeof crypto !== "undefined" && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    };

    const fetchAdvice = async (
        logId: string,
        entry: Omit<SymptomLog, "id" | "time">,
    ): Promise<void> => {
        try {
            const res = await fetch("/api/gemini_advice", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(entry),
            });

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            const data = await res.json();

            if (data?.success && data?.advice) {
                logs = logs.map((l) =>
                    l.id === logId
                        ? { ...l, advice: data.advice, isLoadingAdvice: false }
                        : l,
                );
            } else {
                // No advice received, remove loading state
                logs = logs.map((l) =>
                    l.id === logId ? { ...l, isLoadingAdvice: false } : l,
                );
            }
        } catch (err) {
            console.error("Failed to get advice:", err);
            // Remove loading state on error
            logs = logs.map((l) =>
                l.id === logId
                    ? {
                          ...l,
                          isLoadingAdvice: false,
                          advice: "Không thể tải lời khuyên. Vui lòng thử lại sau.",
                      }
                    : l,
            );
        }
    };

    const addLog = async () => {
        if (!isFormValid || isSubmitting) return;

        isSubmitting = true;

        try {
            const logId = generateId();
            const entry: SymptomLog = {
                id: logId,
                note: note.trim(),
                emotion,
                severity,
                stoolType,
                time: new Date().toISOString(),
                isLoadingAdvice: true,
            };

            // Add log immediately with loading state
            logs = [entry, ...logs].slice(0, MAX_LOGS);

            // Reset form
            note = "";
            stoolType = "none";

            // Fetch advice asynchronously (don't await)
            fetchAdvice(logId, {
                note: entry.note,
                emotion: entry.emotion,
                severity: entry.severity,
                stoolType: entry.stoolType,
            });
        } catch (error) {
            console.error("Failed to add log:", error);
        } finally {
            setTimeout(() => {
                isSubmitting = false;
            }, 300);
        }
    };

    const clearLogs = () => {
        if (confirm("Bạn có chắc muốn xóa tất cả ghi chép?")) {
            logs = [];
        }
    };

    const deleteLog = (id: string) => {
        logs = logs.filter((l) => l.id !== id);
    };

    const getBristolBadgeClass = (type: StoolType): string => {
        if (["type1", "type2", "type6", "type7"].includes(type)) {
            return "badge-warning";
        }
        return "badge-success";
    };

    const getSeverityBadgeClass = (sev: Severity): string => {
        switch (sev) {
            case "severe":
                return "badge-error";
            case "moderate":
                return "badge-warning";
            default:
                return "badge-success";
        }
    };

    const getEmotionLabel = (emo: Emotion): string => {
        const labels: Record<Emotion, string> = {
            neutral: "😐 Bình thường",
            happy: "😊 Vui",
            sad: "😢 Buồn",
            angry: "😠 Khó chịu",
            surprised: "😮 Ngạc nhiên",
            fearful: "😨 Lo lắng",
        };
        return labels[emo];
    };
</script>

<div class="card bg-base-100 shadow-xl mt-6 w-full">
    <div class="card-body">
        <h2 class="card-title text-lg font-bold flex items-center gap-2">
            <AlertCircle class="w-5 h-5 text-primary" />
            Ghi nhận triệu chứng / Tâm trạng
        </h2>

        <form
            onsubmit={(e) => {
                e.preventDefault();
                addLog();
            }}
        >
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-3">
                <!-- Symptom Note -->
                <div class="form-control">
                    <label class="label" for="symptom-note">
                        <span class="label-text font-medium"
                            >Ghi chú triệu chứng</span
                        >
                    </label>
                    <textarea
                        id="symptom-note"
                        class="textarea textarea-bordered h-32"
                        placeholder="Ví dụ: đau bụng sau khi uống sữa, đầy hơi..."
                        bind:value={note}
                        disabled={isSubmitting}
                    ></textarea>
                </div>

                <div class="flex flex-col gap-3">
                    <!-- Emotion & Severity -->
                    <div class="form-control">
                        <label class="label" for="emotion-select">
                            <span class="label-text font-medium"
                                >Cảm xúc & Mức độ</span
                            >
                        </label>
                        <div class="flex gap-2">
                            <select
                                id="emotion-select"
                                class="select select-bordered flex-1"
                                bind:value={emotion}
                                disabled={isSubmitting}
                            >
                                <option value="neutral">😐 Bình thường</option>
                                <option value="happy">😊 Vui</option>
                                <option value="sad">😢 Buồn</option>
                                <option value="angry">😠 Khó chịu</option>
                                <option value="surprised">😮 Ngạc nhiên</option>
                                <option value="fearful">😨 Lo lắng</option>
                            </select>
                            <select
                                class="select select-bordered flex-1"
                                bind:value={severity}
                                disabled={isSubmitting}
                            >
                                <option value="mild">🟢 Nhẹ</option>
                                <option value="moderate">🟡 Vừa</option>
                                <option value="severe">🔴 Nặng</option>
                            </select>
                        </div>
                    </div>

                    <!-- Bristol Stool Chart -->
                    <div class="form-control">
                        <label class="label" for="stool-select">
                            <span
                                class="label-text font-medium flex items-center gap-2"
                            >
                                <Droplets class="w-4 h-4" /> Biểu đồ phân (Bristol)
                            </span>
                        </label>
                        <select
                            id="stool-select"
                            class="select select-bordered w-full"
                            bind:value={stoolType}
                            disabled={isSubmitting}
                        >
                            {#each bristolTypes as t}
                                <option value={t.value}>{t.label}</option>
                            {/each}
                        </select>
                        {#if stoolType !== "none"}
                            <label class="label" for="stool-select">
                                <span
                                    class="label-text-alt text-base-content/70"
                                >
                                    {bristolTypes.find(
                                        (t) => t.value === stoolType,
                                    )?.desc}
                                </span>
                            </label>
                        {/if}
                    </div>
                </div>
            </div>

            <div class="card-actions justify-end">
                <button
                    type="button"
                    class="btn btn-outline btn-error gap-2"
                    onclick={clearLogs}
                    disabled={logs.length === 0 || isSubmitting}
                >
                    <Trash2 class="w-4 h-4" /> Xóa tất cả
                </button>
                <button
                    type="submit"
                    class="btn btn-primary gap-2"
                    disabled={!isFormValid || isSubmitting}
                >
                    {#if isSubmitting}
                        <Loader2 class="w-4 h-4 animate-spin" />
                        Đang lưu...
                    {:else}
                        <PlusCircle class="w-4 h-4" />
                        Thêm ghi chép
                    {/if}
                </button>
            </div>
        </form>

        <div class="divider"></div>

        <!-- Recent Logs -->
        <div class="mt-4">
            <h3 class="text-lg font-semibold mb-4">Ghi chép gần đây</h3>
            {#if logs.length === 0}
                <p class="text-base-content/60 italic">Chưa có ghi chép nào.</p>
            {:else}
                <ul class="space-y-4">
                    {#each logs as l (l.id)}
                        <li class="card bg-base-200 compact shadow-sm">
                            <div class="card-body">
                                <div
                                    class="flex justify-between items-start gap-4"
                                >
                                    <div class="flex-1">
                                        <!-- Header: Time & Badges -->
                                        <div
                                            class="flex justify-between items-center mb-2 gap-2 flex-wrap"
                                        >
                                            <p
                                                class="text-xs text-base-content/60"
                                            >
                                                {new Date(
                                                    l.time,
                                                ).toLocaleString("vi-VN", {
                                                    day: "2-digit",
                                                    month: "2-digit",
                                                    year: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </p>
                                            <div class="flex gap-2 flex-wrap">
                                                {#if l.stoolType && l.stoolType !== "none"}
                                                    <span
                                                        class={`badge ${getBristolBadgeClass(l.stoolType)} badge-outline`}
                                                    >
                                                        {bristolTypes
                                                            .find(
                                                                (t) =>
                                                                    t.value ===
                                                                    l.stoolType,
                                                            )
                                                            ?.label.split(
                                                                ":",
                                                            )[0]}
                                                    </span>
                                                {/if}
                                                <span
                                                    class={`badge ${getSeverityBadgeClass(l.severity)}`}
                                                >
                                                    {l.severity}
                                                </span>
                                            </div>
                                        </div>

                                        <!-- Note -->
                                        {#if l.note}
                                            <h4
                                                class="font-bold text-base mb-2"
                                            >
                                                {l.note}
                                            </h4>
                                        {/if}

                                        <!-- Emotion -->
                                        <div
                                            class="flex gap-2 items-center text-sm text-base-content/70"
                                        >
                                            <span
                                                >Cảm xúc: {getEmotionLabel(
                                                    l.emotion,
                                                )}</span
                                            >
                                        </div>
                                    </div>

                                    <!-- Delete Button -->
                                    <button
                                        class="btn btn-ghost btn-xs btn-circle"
                                        onclick={() => deleteLog(l.id)}
                                        aria-label="Xóa ghi chép"
                                    >
                                        <Trash2 class="w-3 h-3" />
                                    </button>
                                </div>

                                <!-- AI Advice -->
                                {#if l.isLoadingAdvice}
                                    <div class="alert mt-3 text-sm">
                                        <Loader2 class="w-4 h-4 animate-spin" />
                                        <span>Đang tải lời khuyên từ AI...</span
                                        >
                                    </div>
                                {:else if l.advice}
                                    <div class="alert alert-info mt-3 text-sm">
                                        <div class="w-full">
                                            <strong class="block mb-1"
                                                >💡 Lời khuyên AI:</strong
                                            >
                                            <span class="whitespace-pre-line"
                                                >{l.advice}</span
                                            >
                                        </div>
                                    </div>
                                {/if}
                            </div>
                        </li>
                    {/each}
                </ul>
            {/if}
        </div>
    </div>
</div>
