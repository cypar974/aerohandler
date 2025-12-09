// js/components/showToast.js
export function showToast(message, type = "success") {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        container.className = "fixed top-4 right-4 z-50 space-y-2";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `
        px-4 py-2 rounded shadow text-white animate-fade-in
        ${type === "success" ? "bg-green-500" : type === "error" ? "bg-red-500" : "bg-blue-500"}
    `.trim();
    toast.innerText = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("animate-fade-out");
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}