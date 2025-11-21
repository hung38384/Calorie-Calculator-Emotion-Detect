<script lang="ts">
    import { onMount, untrack } from "svelte";
    import { browser } from "$app/environment";
    import AlertModal from "$lib/components/model/AlertModal.svelte";
    import { aggregateInsights } from "$lib/utils/foodInsights";
    import SymptomLogger from "$lib/components/SymptomLogger.svelte";
    import GrowthTracker from "$lib/components/GrowthTracker.svelte";
    import {
        UploadCloud,
        X,
        Save,
        Trash2,
        Activity,
        FileText,
        Info,
        Utensils,
        AlertTriangle,
        Loader2,
    } from "lucide-svelte";

    // --- Types ---
    interface DigestiveAnalysis {
        digestibility_score: number;
        fodmap_level: string;
        texture: string;
        fiber_content: string;
        allergens: string[];
        micronutrients?: {
            iron: string;
            zinc: string;
            vitamin_d: string;
        };
        warnings?: string[];
    }

    interface MealEntry {
        id: string;
        date: string;
        items: string[];
        calories: number;
        digestiveAnalysis: DigestiveAnalysis | null;
    }

    interface ApiResponse {
        success: boolean;
        items?: string[];
        count?: number;
        digestive_analysis?: DigestiveAnalysis;
        message?: string;
    }

    interface FAQ {
        question: string;
        answer: string;
    }

    // --- Constants ---
    const STORAGE_KEY = "mealHistory";
    const MAX_MEAL_HISTORY = 50;
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_FILE_TYPES = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
    ];

    const faqs: FAQ[] = [
        {
            question: "Ứng dụng đo calo hoạt động như thế nào?",
            answer: "Ứng dụng sử dụng trí tuệ nhân tạo (AI) để phân tích hình ảnh món ăn mà phụ huynh chụp hoặc tải lên. Hệ thống sẽ nhận diện các loại thực phẩm trong khẩu phần và ước tính lượng calo, chất đạm, chất béo, chất xơ... giúp theo dõi dinh dưỡng của trẻ dễ dàng hơn.",
        },
        {
            question: "Ứng dụng có miễn phí không?",
            answer: "Hiện tại, ứng dụng được cung cấp hoàn toàn miễn phí để hỗ trợ phụ huynh quản lý chế độ ăn và theo dõi dinh dưỡng cho trẻ tại nhà.",
        },
        {
            question:
                "Ứng dụng có phù hợp với trẻ biếng ăn hoặc suy dinh dưỡng không?",
            answer: "Có. Ứng dụng được thiết kế đặc biệt để giúp phụ huynh theo dõi khẩu phần ăn, lượng calo và dưỡng chất của trẻ biếng ăn, chậm tăng cân hoặc có vấn đề tiêu hóa, từ đó điều chỉnh bữa ăn hợp lý hơn.",
        },
        {
            question:
                "Ứng dụng có thể nhận diện món ăn do phụ huynh tự nấu không?",
            answer: "Hoàn toàn có thể. Chỉ cần chụp lại hình món ăn của bé, AI sẽ ước tính lượng calo và dưỡng chất dựa trên nguyên liệu phổ biến trong ẩm thực Việt.",
        },
        {
            question: "Mức độ chính xác của việc ước tính calo là bao nhiêu?",
            answer: "Kết quả ước tính có thể dao động nhẹ tùy theo khẩu phần và nguyên liệu thực tế, nhưng hệ thống AI được huấn luyện với hàng chục nghìn món ăn để đảm bảo độ chính xác cao nhất có thể.",
        },
        {
            question:
                "Tôi có thể theo dõi cân nặng và chiều cao của trẻ không?",
            answer: "Có. Ứng dụng cho phép nhập cân nặng, chiều cao và tuổi của trẻ để tự động gợi ý mức calo cần thiết mỗi ngày, giúp phụ huynh dễ dàng theo dõi tiến triển dinh dưỡng.",
        },
        {
            question:
                "Ứng dụng có tư vấn thực đơn cho trẻ suy dinh dưỡng không?",
            answer: "Ứng dụng có thể gợi ý khẩu phần mẫu theo độ tuổi và tình trạng dinh dưỡng của trẻ. Tuy nhiên, để có phác đồ chính xác, phụ huynh vẫn nên tham khảo ý kiến bác sĩ hoặc chuyên gia dinh dưỡng.",
        },
        {
            question:
                "Trẻ bị khó tiêu hoặc hay đầy bụng có thể sử dụng app này không?",
            answer: "Có thể. Ứng dụng giúp phụ huynh nhận biết những món ăn có hàm lượng chất béo hoặc đường cao – là nguyên nhân gây khó tiêu – và đưa ra gợi ý thay thế nhẹ nhàng, dễ hấp thu hơn.",
        },
        {
            question: "Tôi có thể lưu lại lịch sử bữa ăn của con không?",
            answer: "Có. Ứng dụng tự động lưu lại các món ăn đã được quét, giúp phụ huynh theo dõi tiến trình ăn uống, khẩu vị và lượng calo hằng ngày của trẻ.",
        },
        {
            question: "Ứng dụng có cần kết nối Internet không?",
            answer: "Có, để phân tích hình ảnh và tính toán chính xác, ứng dụng cần kết nối mạng Internet. Tuy nhiên, lịch sử dữ liệu của bé vẫn được lưu lại để xem khi ngoại tuyến.",
        },
        {
            question: "Dữ liệu hình ảnh của con tôi có được bảo mật không?",
            answer: "Chắc chắn. Tất cả hình ảnh và thông tin được mã hóa và lưu trữ an toàn. Ứng dụng tuân thủ các tiêu chuẩn bảo mật nhằm bảo vệ quyền riêng tư của trẻ.",
        },
        {
            question: "Ứng dụng có hỗ trợ tư vấn chuyên gia không?",
            answer: "Phiên bản sắp tới sẽ tích hợp chức năng tư vấn trực tuyến cùng chuyên gia dinh dưỡng để phụ huynh nhận được lời khuyên phù hợp hơn cho từng trường hợp cụ thể.",
        },
    ];

    // --- State ---
    let uploadedImage = $state<string | null>(null);
    let foodItems = $state<string[]>([]);
    let totalCalories = $state(0);
    let digestiveAnalysis = $state<DigestiveAnalysis | null>(null);
    let isLoading = $state(false);
    let showAlert = $state(false);
    let alertMessage = $state("");
    let alertType = $state<"error" | "success" | "info">("error");
    let showGrowthTracker = $state(false);
    let mealHistory = $state<MealEntry[]>([]);
    let showLogger = $state(false);
    let fileInput: HTMLInputElement;

    // --- Lifecycle & Persistence ---
    onMount(() => {
        if (!browser) return;

        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                mealHistory = JSON.parse(raw);
            }
        } catch (e) {
            console.warn("Failed to load meal history", e);
        }
    });

    $effect(() => {
        if (browser) {
            untrack(() => {
                try {
                    localStorage.setItem(
                        STORAGE_KEY,
                        JSON.stringify(mealHistory),
                    );
                } catch (e) {
                    console.warn("Failed to save meal history", e);
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

    const getBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file);
        });
    };

    const validateFile = (file: File): { valid: boolean; error?: string } => {
        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
            return {
                valid: false,
                error: "Vui lòng chọn file ảnh (JPEG, PNG, hoặc WebP)",
            };
        }

        if (file.size > MAX_FILE_SIZE) {
            return {
                valid: false,
                error: `Kích thước file quá lớn. Tối đa ${MAX_FILE_SIZE / 1024 / 1024}MB`,
            };
        }

        return { valid: true };
    };

    const sendImageToServer = async (base64Image: string): Promise<void> => {
        isLoading = true;

        try {
            const response = await fetch("/api/detect_food", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image: base64Image }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data: ApiResponse = await response.json();

            if (data.success && data.items && data.count !== undefined) {
                foodItems = data.items;
                totalCalories = data.count;
                digestiveAnalysis = data.digestive_analysis || null;
            } else {
                alertType = "error";
                showAlert = true;
                alertMessage = data.message || "Lỗi khi phân tích ảnh.";
            }
        } catch (error) {
            console.error("Error analyzing image:", error);
            alertType = "error";
            showAlert = true;
            alertMessage =
                "Không thể phân tích ảnh. Vui lòng kiểm tra kết nối mạng và thử lại.";
        } finally {
            isLoading = false;
        }
    };

    const handleImageUpload = async (event: Event): Promise<void> => {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];

        if (!file) return;

        // Validate file
        const validation = validateFile(file);
        if (!validation.valid) {
            alertType = "error";
            showAlert = true;
            alertMessage = validation.error || "File không hợp lệ";
            // Reset input
            if (fileInput) fileInput.value = "";
            return;
        }

        try {
            const base64Image = await getBase64(file);
            uploadedImage = base64Image;
            await sendImageToServer(base64Image);
        } catch (error) {
            console.error("Error reading file:", error);
            alertType = "error";
            showAlert = true;
            alertMessage = "Không thể đọc file ảnh. Vui lòng thử lại.";
        }
    };

    const closeAlertModal = (): void => {
        showAlert = false;
    };

    const handleRemoveImage = (): void => {
        uploadedImage = null;
        foodItems = [];
        totalCalories = 0;
        digestiveAnalysis = null;
        // Reset file input
        if (fileInput) fileInput.value = "";
    };

    const saveMeal = (): void => {
        if (!foodItems || foodItems.length === 0) {
            alertType = "error";
            showAlert = true;
            alertMessage = "Không có món ăn nào để lưu.";
            return;
        }

        const entry: MealEntry = {
            id: generateId(),
            date: new Date().toISOString(),
            items: foodItems,
            calories: totalCalories,
            digestiveAnalysis,
        };

        mealHistory = [entry, ...mealHistory].slice(0, MAX_MEAL_HISTORY);

        alertType = "success";
        showAlert = true;
        alertMessage = "Bữa ăn đã được lưu vào lịch sử.";
    };

    const deleteMeal = (id: string): void => {
        mealHistory = mealHistory.filter((m) => m.id !== id);
    };

    const clearMeals = (): void => {
        if (confirm("Bạn có chắc muốn xóa toàn bộ lịch sử bữa ăn?")) {
            mealHistory = [];
            alertType = "info";
            showAlert = true;
            alertMessage = "Đã xóa toàn bộ lịch sử bữa ăn.";
        }
    };

    const clearResults = (): void => {
        foodItems = [];
        totalCalories = 0;
        digestiveAnalysis = null;
    };
</script>

<div class="w-full max-w-5xl mx-auto pb-20">
    <div class="alert alert-info shadow-sm mb-8">
        <Info class="w-5 h-5" />
        <span
            >Đây là công cụ phân tích AI miễn phí. Kết quả chỉ mang tính tham
            khảo.</span
        >
    </div>

    <div class="text-center mb-10">
        <h1
            class="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary"
        >
            Trợ lý Tiêu hóa AI
        </h1>
        <p class="text-base-content/70">
            Phân tích món ăn & theo dõi sức khỏe tiêu hóa cho trẻ
        </p>
    </div>

    <!-- Toggle Buttons -->
    <div class="flex justify-center gap-4 mb-8 flex-wrap">
        <button
            class={`btn gap-2 ${showGrowthTracker ? "btn-primary" : "btn-outline"}`}
            onclick={() => (showGrowthTracker = !showGrowthTracker)}
        >
            <Activity class="w-4 h-4" />
            {showGrowthTracker ? "Đóng theo dõi" : "Theo dõi tăng trưởng"}
        </button>
        <button
            class={`btn gap-2 ${showLogger ? "btn-primary" : "btn-outline"}`}
            onclick={() => (showLogger = !showLogger)}
        >
            <FileText class="w-4 h-4" />
            {showLogger ? "Đóng nhật ký" : "Ghi triệu chứng"}
        </button>
    </div>

    <!-- Conditional Components -->
    {#if showGrowthTracker}
        <GrowthTracker />
    {/if}
    {#if showLogger}
        <SymptomLogger />
    {/if}

    <!-- Main Content Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <!-- Image Upload Section -->
        <div class="w-full">
            <div
                class="relative w-full h-[300px] md:h-[400px] border-2 border-dashed border-base-300 rounded-xl hover:border-primary transition-colors bg-base-100 flex flex-col items-center justify-center overflow-hidden group cursor-pointer"
            >
                {#if uploadedImage}
                    <img
                        src={uploadedImage}
                        alt="Uploaded Food"
                        class="w-full h-full object-cover"
                    />
                    <div
                        class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                        <button
                            onclick={(e) => {
                                e.preventDefault();
                                handleRemoveImage();
                            }}
                            class="btn btn-circle btn-error text-white"
                            aria-label="Xóa ảnh"
                        >
                            <X class="w-6 h-6" />
                        </button>
                    </div>
                {:else}
                    <label
                        for="upload"
                        class="flex flex-col items-center justify-center w-full h-full cursor-pointer p-6 text-center"
                    >
                        <div
                            class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary"
                        >
                            <UploadCloud class="w-8 h-8" />
                        </div>
                        <h3 class="text-lg font-semibold mb-2">Tải ảnh lên</h3>
                        <p class="text-sm text-base-content/60">
                            Nhấp để chọn hoặc kéo thả ảnh món ăn vào đây
                        </p>
                        <p class="text-xs text-base-content/40 mt-2">
                            Tối đa {MAX_FILE_SIZE / 1024 / 1024}MB • JPEG, PNG,
                            WebP
                        </p>
                    </label>
                {/if}
                <input
                    id="upload"
                    type="file"
                    accept={ALLOWED_FILE_TYPES.join(",")}
                    onchange={handleImageUpload}
                    class="hidden"
                    bind:this={fileInput}
                />
            </div>
        </div>

        <!-- Results Section -->
        <div class="w-full">
            {#if isLoading}
                <div
                    class="card bg-base-100 shadow-lg h-full flex flex-col items-center justify-center p-8 text-center min-h-[300px]"
                >
                    <Loader2 class="w-12 h-12 text-primary mb-4 animate-spin" />
                    <h3 class="text-xl font-semibold text-base-content/70">
                        Đang phân tích món ăn...
                    </h3>
                    <p class="text-base-content/50 mt-2">
                        AI đang kiểm tra thành phần và mức độ an toàn tiêu hóa
                    </p>
                </div>
            {:else if foodItems.length === 0}
                <div
                    class="card bg-base-100 shadow-lg h-full flex flex-col items-center justify-center p-8 text-center min-h-[300px]"
                >
                    <div
                        class="w-16 h-16 bg-base-200 rounded-full flex items-center justify-center mb-4"
                    >
                        <Utensils class="w-8 h-8 text-base-content/40" />
                    </div>
                    <h3 class="text-xl font-semibold text-base-content/70">
                        Kết quả phân tích
                    </h3>
                    <p class="text-base-content/50 mt-2">
                        Kết quả nhận diện và phân tích tiêu hóa sẽ hiển thị tại
                        đây
                    </p>
                </div>
            {:else}
                <div class="card bg-base-100 shadow-lg h-full flex flex-col">
                    <div class="card-body p-6">
                        <h2
                            class="card-title text-2xl justify-center mb-6 flex items-center gap-2"
                        >
                            <Utensils class="w-6 h-6 text-primary" />
                            Món đã nhận diện
                        </h2>

                        <!-- Food Items -->
                        <div class="flex flex-wrap gap-2 justify-center mb-8">
                            {#each foodItems as item}
                                <span
                                    class="badge badge-lg badge-primary badge-outline p-4"
                                >
                                    {item}
                                </span>
                            {/each}
                        </div>

                        <!-- Digestive Analysis -->
                        {#if digestiveAnalysis}
                            <div class="w-full mb-6">
                                <!-- Stats -->
                                <div
                                    class="stats shadow w-full bg-base-200 mb-4"
                                >
                                    <div class="stat place-items-center">
                                        <div class="stat-title">
                                            Điểm tiêu hóa
                                        </div>
                                        <div
                                            class={`stat-value ${
                                                digestiveAnalysis.digestibility_score >=
                                                7
                                                    ? "text-success"
                                                    : digestiveAnalysis.digestibility_score >=
                                                        5
                                                      ? "text-warning"
                                                      : "text-error"
                                            }`}
                                        >
                                            {digestiveAnalysis.digestibility_score}/10
                                        </div>
                                        <div class="stat-desc">
                                            Dựa trên thành phần
                                        </div>
                                    </div>
                                    <div class="stat place-items-center">
                                        <div class="stat-title">Calories</div>
                                        <div
                                            class="stat-value text-secondary text-2xl"
                                        >
                                            {totalCalories}
                                        </div>
                                        <div class="stat-desc">kcal</div>
                                    </div>
                                </div>

                                <!-- Details Grid -->
                                <div class="grid grid-cols-2 gap-2 mb-4">
                                    <div
                                        class="p-3 bg-base-200 rounded-lg flex flex-col items-center text-center"
                                    >
                                        <span
                                            class="text-xs uppercase font-bold text-base-content/60 mb-1"
                                            >FODMAP</span
                                        >
                                        <span
                                            class={`badge ${
                                                digestiveAnalysis.fodmap_level ===
                                                "Low"
                                                    ? "badge-success"
                                                    : "badge-warning"
                                            }`}
                                        >
                                            {digestiveAnalysis.fodmap_level}
                                        </span>
                                    </div>
                                    <div
                                        class="p-3 bg-base-200 rounded-lg flex flex-col items-center text-center"
                                    >
                                        <span
                                            class="text-xs uppercase font-bold text-base-content/60 mb-1"
                                            >Kết cấu</span
                                        >
                                        <span class="font-semibold"
                                            >{digestiveAnalysis.texture}</span
                                        >
                                    </div>
                                    <div
                                        class="p-3 bg-base-200 rounded-lg flex flex-col items-center text-center"
                                    >
                                        <span
                                            class="text-xs uppercase font-bold text-base-content/60 mb-1"
                                            >Chất xơ</span
                                        >
                                        <span class="font-semibold"
                                            >{digestiveAnalysis.fiber_content}</span
                                        >
                                    </div>
                                    <div
                                        class="p-3 bg-base-200 rounded-lg flex flex-col items-center text-center"
                                    >
                                        <span
                                            class="text-xs uppercase font-bold text-base-content/60 mb-1"
                                            >Dị ứng</span
                                        >
                                        <div
                                            class="flex flex-wrap justify-center gap-1"
                                        >
                                            {#if digestiveAnalysis.allergens.length > 0 && digestiveAnalysis.allergens[0] !== "None"}
                                                {#each digestiveAnalysis.allergens as allergen}
                                                    <span
                                                        class="text-xs badge badge-xs badge-error badge-outline"
                                                    >
                                                        {allergen}
                                                    </span>
                                                {/each}
                                            {:else}
                                                <span
                                                    class="text-xs text-success font-medium"
                                                >
                                                    Không phát hiện
                                                </span>
                                            {/if}
                                        </div>
                                    </div>
                                </div>

                                <!-- Micronutrients -->
                                {#if digestiveAnalysis.micronutrients}
                                    <div class="grid grid-cols-3 gap-2 mb-4">
                                        <div
                                            class="p-2 border border-base-200 rounded text-center"
                                        >
                                            <div
                                                class="text-xs text-base-content/60 font-bold"
                                            >
                                                Sắt (Fe)
                                            </div>
                                            <div
                                                class={`text-sm font-semibold ${
                                                    digestiveAnalysis
                                                        .micronutrients.iron ===
                                                    "High"
                                                        ? "text-success"
                                                        : "text-base-content"
                                                }`}
                                            >
                                                {digestiveAnalysis
                                                    .micronutrients.iron}
                                            </div>
                                        </div>
                                        <div
                                            class="p-2 border border-base-200 rounded text-center"
                                        >
                                            <div
                                                class="text-xs text-base-content/60 font-bold"
                                            >
                                                Kẽm (Zn)
                                            </div>
                                            <div
                                                class={`text-sm font-semibold ${
                                                    digestiveAnalysis
                                                        .micronutrients.zinc ===
                                                    "High"
                                                        ? "text-success"
                                                        : "text-base-content"
                                                }`}
                                            >
                                                {digestiveAnalysis
                                                    .micronutrients.zinc}
                                            </div>
                                        </div>
                                        <div
                                            class="p-2 border border-base-200 rounded text-center"
                                        >
                                            <div
                                                class="text-xs text-base-content/60 font-bold"
                                            >
                                                Vit D
                                            </div>
                                            <div
                                                class={`text-sm font-semibold ${
                                                    digestiveAnalysis
                                                        .micronutrients
                                                        .vitamin_d === "High"
                                                        ? "text-success"
                                                        : "text-base-content"
                                                }`}
                                            >
                                                {digestiveAnalysis
                                                    .micronutrients.vitamin_d}
                                            </div>
                                        </div>
                                    </div>
                                {/if}

                                <!-- Warnings -->
                                {#if digestiveAnalysis.warnings && digestiveAnalysis.warnings.length > 0}
                                    <div
                                        class="alert alert-warning shadow-sm mb-4 text-sm py-2"
                                    >
                                        <AlertTriangle class="w-4 h-4" />
                                        <div
                                            class="flex flex-col items-start w-full"
                                        >
                                            <span
                                                class="font-bold text-xs uppercase"
                                                >Lưu ý:</span
                                            >
                                            <ul
                                                class="list-disc list-inside mt-1"
                                            >
                                                {#each digestiveAnalysis.warnings as warning}
                                                    <li>{warning}</li>
                                                {/each}
                                            </ul>
                                        </div>
                                    </div>
                                {/if}
                            </div>
                        {/if}

                        <!-- Food Insights -->
                        <div class="bg-base-200/50 rounded-xl p-4 mb-6">
                            <h4
                                class="font-semibold flex items-center gap-2 mb-3 text-sm uppercase tracking-wide opacity-70"
                            >
                                <Info class="w-4 h-4" />
                                Chi tiết thành phần
                            </h4>
                            <div class="space-y-3">
                                {#each aggregateInsights(foodItems) as f}
                                    <div
                                        class="card bg-base-100 compact shadow-sm border border-base-200"
                                    >
                                        <div class="card-body p-3">
                                            <div
                                                class="flex justify-between items-start gap-3"
                                            >
                                                <div class="flex-1">
                                                    <div
                                                        class="font-bold text-primary"
                                                    >
                                                        {f.name}
                                                    </div>
                                                    <div
                                                        class="text-sm text-base-content/80 mt-1 leading-relaxed"
                                                    >
                                                        {f.insight?.advice}
                                                    </div>
                                                </div>
                                                <div
                                                    class="flex flex-col items-end gap-1"
                                                >
                                                    {#each f.insight?.flags || [] as flag}
                                                        <span
                                                            class="badge badge-xs badge-warning"
                                                            >{flag}</span
                                                        >
                                                    {/each}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        </div>

                        <!-- Action Buttons -->
                        <div
                            class="card-actions justify-center mt-auto pt-4 border-t border-base-200 gap-2"
                        >
                            <button
                                class="btn btn-outline btn-error gap-2"
                                onclick={clearResults}
                            >
                                <Trash2 class="w-4 h-4" /> Xóa kết quả
                            </button>
                            <button
                                class="btn btn-success gap-2 text-white"
                                onclick={saveMeal}
                            >
                                <Save class="w-4 h-4" /> Lưu bữa ăn
                            </button>
                        </div>
                    </div>
                </div>
            {/if}
        </div>
    </div>

    <!-- Meal History -->
    {#if mealHistory.length > 0}
        <div class="mt-16">
            <div
                class="flex justify-between items-center mb-6 border-b border-base-300 pb-4"
            >
                <h3 class="text-2xl font-bold flex items-center gap-2">
                    <Activity class="w-6 h-6 text-primary" />
                    Lịch sử bữa ăn
                </h3>
                <button
                    class="btn btn-sm btn-ghost text-error gap-2"
                    onclick={clearMeals}
                >
                    <Trash2 class="w-4 h-4" /> Xóa tất cả
                </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {#each mealHistory as meal (meal.id)}
                    <div
                        class="card bg-base-100 shadow-md border border-base-200 hover:shadow-lg transition-shadow"
                    >
                        <div class="card-body p-5">
                            <div class="flex justify-between items-start mb-2">
                                <div
                                    class="text-xs text-base-content/60 uppercase tracking-wider font-semibold"
                                >
                                    {new Date(meal.date).toLocaleString(
                                        "vi-VN",
                                        {
                                            day: "2-digit",
                                            month: "2-digit",
                                            year: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        },
                                    )}
                                </div>
                                <button
                                    class="btn btn-ghost btn-xs btn-circle text-error"
                                    onclick={() => deleteMeal(meal.id)}
                                    aria-label="Xóa bữa ăn"
                                >
                                    <X class="w-4 h-4" />
                                </button>
                            </div>
                            <div
                                class="font-bold text-lg mb-1 truncate"
                                title={meal.items.join(", ")}
                            >
                                {meal.items.join(", ")}
                            </div>
                            <div class="flex gap-2 mt-1 flex-wrap">
                                <div class="badge badge-primary badge-outline">
                                    {meal.calories} cal
                                </div>
                                {#if meal.digestiveAnalysis}
                                    <div
                                        class={`badge ${
                                            meal.digestiveAnalysis
                                                .digestibility_score >= 7
                                                ? "badge-success"
                                                : "badge-warning"
                                        } badge-outline`}
                                    >
                                        Score: {meal.digestiveAnalysis
                                            .digestibility_score}
                                    </div>
                                {/if}
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    {/if}

    <!-- FAQs -->
    <div class="mt-20">
        <div class="divider mb-10"></div>
        <h2 class="text-3xl font-bold text-center mb-8">Câu hỏi thường gặp</h2>
        <div class="space-y-2 max-w-3xl mx-auto">
            {#each faqs as faq}
                <div
                    class="collapse collapse-plus bg-base-100 border border-base-200 rounded-box"
                >
                    <input type="checkbox" class="peer" />
                    <div class="collapse-title text-lg font-medium">
                        {faq.question}
                    </div>
                    <div class="collapse-content">
                        <p class="text-base-content/80">{faq.answer}</p>
                    </div>
                </div>
            {/each}
        </div>
    </div>

    <!-- Alert Modal -->
    <AlertModal
        show={showAlert}
        onClose={closeAlertModal}
        type={alertType}
        message={alertMessage}
    />
</div>
