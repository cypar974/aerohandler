import { supabase } from "./supabase.js";

// Handle login form
const loginForm = document.getElementById("login-form");
const errorMsg = document.getElementById("error-msg");

if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            errorMsg.textContent = error.message;
        } else {
            // Redirect to app after login
            window.location.href = "app.html";
        }
    });
}

// ✅ Session persistence check
(async () => {
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (session && window.location.pathname.endsWith("login.html")) {
        // Already logged in → redirect directly
        window.location.href = "app.html";
    }
})();
