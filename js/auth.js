import { supabase } from "./supabase.js";

const loginForm = document.getElementById("login-form");
const errorMsg = document.getElementById("error-msg");
const emailInput = document.getElementById("email");
const rememberToggle = document.getElementById("remember-toggle");

// 1. Handle "Remember Me" Toggle UI
if (rememberToggle) {
    // Check saved state on load
    if (localStorage.getItem('aero_remember_active') === 'true') {
        rememberToggle.classList.add('active');
        const savedEmail = localStorage.getItem('aero_saved_email');
        if (savedEmail) emailInput.value = savedEmail;
    }

    // Toggle click handler
    rememberToggle.addEventListener('click', () => {
        rememberToggle.classList.toggle('active');
    });
}

// 2. Handle Login Submission
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        // --- UI: Start Loading Animation ---
        const btn = loginForm.querySelector('button[type="submit"]');
        const originalContent = btn.innerHTML;
        btn.innerHTML = '<span class="relative z-10">NAVIGATING...</span>';
        btn.classList.add('from-gray-600', 'to-gray-700');
        btn.disabled = true;
        errorMsg.classList.add('hidden'); // Hide previous errors

        // --- DATA: Save Email if "Remember Me" is on ---
        if (rememberToggle && rememberToggle.classList.contains('active')) {
            localStorage.setItem('aero_saved_email', emailInput.value);
            localStorage.setItem('aero_remember_active', 'true');
        } else {
            localStorage.removeItem('aero_saved_email');
            localStorage.removeItem('aero_remember_active');
        }

        const email = emailInput.value.trim();
        const password = document.getElementById("password").value.trim();

        // --- SUPABASE: Attempt Login ---
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            // --- UI: Revert on Error ---
            console.error("Login Error:", error);
            errorMsg.textContent = error.message;
            errorMsg.classList.remove('hidden'); // Show error box

            // Reset button
            btn.innerHTML = originalContent;
            btn.classList.remove('from-gray-600', 'to-gray-700');
            btn.disabled = false;
        } else {
            // --- UI: Success ---
            console.log("Login Successful!", data);
            window.location.href = "app.html";
        }
    });
}

// 3. Session Check (Redirect if already logged in)
(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && window.location.pathname.endsWith("login.html")) {
        window.location.href = "app.html";
    }
})();