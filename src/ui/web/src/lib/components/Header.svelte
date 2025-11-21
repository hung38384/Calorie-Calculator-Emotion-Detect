<script>
    import { Github } from "lucide-svelte";

    const siteTitle = "Trình tính Calo AI | Nhận diện món ăn";
    const description =
        "Sử dụng AI để nhận diện hình ảnh món ăn và ước tính calo, hỗ trợ phụ huynh quản lý dinh dưỡng cho trẻ.";
    const pageImage = "https://aicc.gptdevelopment.online/cor.webp";
    const keywords =
        "AI, food recognition, calorie counting, calorie statistics， Calorie Calculator， AI Calorie Calculator， Do Calorie Calculator";
</script>

<svelte:head>
    <title>{siteTitle}</title>
    <meta name="description" content={description} />
    <meta property="og:title" content={siteTitle} />
    <meta name="twitter:title" content={siteTitle} />
    <meta itemprop="name" content={siteTitle} />
    <link rel="apple-touch-icon" sizes="180x180" href="/favicon.ico" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon.ico" />
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon.ico" />
    <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
    <meta name="keywords" content={keywords} />
    <meta name="application-name" content={siteTitle} />
    <meta property="og:description" content={description} />
    <meta property="og:site_name" content={siteTitle} />
    <meta property="og:url" content="none" />
    <meta property="og:locale" content="vi_VN" />
    <meta property="og:image" content={pageImage} />
    <meta property="og:image:secure_url" content={pageImage} />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content={siteTitle} />
    <meta name="twitter:site" content="none" />
    <meta name="twitter:image" content={pageImage} />
    <meta name="twitter:description" content={description} />
</svelte:head>

<!-- GoogleAnalytics component can be added here if needed, or in app.html -->

<div class="navbar bg-base-100 shadow-lg">
    <div class="flex-1">
        <a
            href="/"
            class="btn btn-ghost text-xl h-auto py-2 flex flex-col items-start gap-0"
        >
            <div class="flex items-center gap-2">
                <span>Trình tính Calo AI</span>
            </div>
            <span class="text-xs font-normal text-base-content/70 pl-10">
                Nhận diện món ăn & gợi ý dinh dưỡng
            </span>
        </a>
    </div>
    <div class="flex-none">
        <ul class="menu menu-horizontal px-1">
            <li>
                <a
                    href="https://github.com/hung38384/Calorie-Calculator"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn btn-ghost btn-circle"
                    aria-label="Github Repository"
                >
                    <Github class="h-5 w-5" />
                </a>
            </li>
        </ul>
    </div>
</div>
