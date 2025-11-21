<script>
    import { CheckCircle, XCircle } from "lucide-svelte";

    let { show = false, onClose, type = "error", message = "" } = $props();
</script>

{#if show}
    <dialog class="modal modal-open modal-bottom sm:modal-middle">
        <div class="modal-box relative">
            <button
                onclick={onClose}
                class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                >✕</button
            >

            <div
                class="flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-start gap-4"
            >
                <div
                    class={`p-3 rounded-full ${type === "success" ? "bg-success/10 text-success" : "bg-error/10 text-error"}`}
                >
                    {#if type === "success"}
                        <CheckCircle class="w-8 h-8" />
                    {:else}
                        <XCircle class="w-8 h-8" />
                    {/if}
                </div>

                <div class="flex-1">
                    <h3 class="font-bold text-lg">
                        {type === "success" ? "Thành công" : "Thông báo lỗi"}
                    </h3>
                    <p class="py-2 text-base-content/70">{message}</p>
                </div>
            </div>

            <div class="modal-action">
                <button class="btn" onclick={onClose}>Đóng</button>
            </div>
        </div>
        <form method="dialog" class="modal-backdrop">
            <button onclick={onClose}>close</button>
        </form>
    </dialog>
{/if}
