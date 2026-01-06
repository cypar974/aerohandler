// ./js/pages/submit_flight.js
import { AddFlightLogModal } from "../modals/AddFlightLogModal.js";
import { showToast } from "../components/showToast.js";

let flightLogModal = null;
let isInitialized = false;

export async function loadSubmitFlightPage() {
    // --- DEMO MODE: PERMISSIONS FLAG ---
    // Context: In the future, this will check if the user has the 'student', 'pilot', or 'instructor' role.
    // For now, we default to TRUE to allow development.
    const canSubmitFlight = true;
    // -----------------------------------

    try {
        console.log('Loading submit flight page...');

        // Clean up any existing instance first
        await cleanupSubmitFlightPage();

        const mainContent = document.getElementById("main-content");
        if (!mainContent) {
            throw new Error('Main content element not found');
        }

        // Logic Lock: Preserving existing DOM structure
        // Flag-Based Pattern: If we add logic later to restrict access, we handle it here.
        if (!canSubmitFlight) {
            mainContent.innerHTML = `
                <div class="flex flex-col h-full items-center justify-center text-white">
                    <h2 class="text-xl font-bold text-red-500">Access Denied</h2>
                    <p class="text-gray-400">You do not have permission to submit flight logs.</p>
                </div>
            `;
            return;
        }

        mainContent.innerHTML = `
            <div class="flex flex-col h-full text-white">
                <div id="flight-log-container" class="flex-1 overflow-y-auto">
                    <div class="text-center text-gray-500 py-8">
                        <div class="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
                        <p>Loading flight log form...</p>
                    </div>
                </div>
            </div>
        `;

        // Initialize as standalone component
        // Note: The Modal inside this function handles the RPC calls and Enum mapping.
        await initializeFlightLogForm();
        isInitialized = true;

    } catch (error) {
        console.error('Error loading submit flight page:', error);
        const mainContent = document.getElementById("main-content");
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="container mx-auto px-4 py-8">
                    <div class="bg-red-900/50 border border-red-700 rounded-lg p-6">
                        <h2 class="text-xl font-bold text-white mb-2">Error Loading Page</h2>
                        <p class="text-red-300">${error.message}</p>
                    </div>
                </div>
            `;
        }
    }
}

async function initializeFlightLogForm() {
    try {
        const container = document.getElementById('flight-log-container');
        if (!container) {
            throw new Error('Flight log container not found');
        }

        // Clear the loading spinner first
        container.innerHTML = '';

        // Create new modal instance
        // The AddFlightLogModal is responsible for:
        // 1. Fetching people via '
        // 2. Fetching planes via 'api.get_available_planes'
        // 3. Submitting via 'api.insert_flight_log' (RPC)
        flightLogModal = new AddFlightLogModal(container);

        // Initialize but don't show immediately
        await flightLogModal.init();

        // Set up success callback
        flightLogModal.onSuccess((flightLogData) => {
            showToast('Flight log submitted successfully!', 'success');
            setTimeout(() => {
                window.history.back();
            }, 1500);
        });

        // Set up close callback for standalone mode
        flightLogModal.onClose(() => {
            window.history.back();
        });

        // Show the form AFTER callbacks are set
        await flightLogModal.show();

        console.log('Flight log form initialized successfully');

    } catch (error) {
        console.error('Error initializing flight log form:', error);
        showToast('Error loading flight log form: ' + error.message, 'error');

        // Enhanced error handling (Preserved from original)
        const container = document.getElementById('flight-log-container');
        if (container) {
            container.innerHTML = `
                <div class="text-center text-red-400 py-8">
                    <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <h3 class="text-lg font-semibold mb-2">Failed to Load Form</h3>
                    <p class="text-gray-400 mb-4">${error.message}</p>
                    <button onclick="window.history.back()" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors duration-200">
                        Go Back
                    </button>
                </div>
            `;
        }
    }
}

export async function cleanupSubmitFlightPage() {
    console.log('🧹 Cleaning up submit flight page...');

    if (flightLogModal) {
        console.log('Destroying flight log modal...');
        flightLogModal.destroy();
        flightLogModal = null;
    }

    // Clear the container to ensure clean state
    const container = document.getElementById('flight-log-container');
    if (container) {
        container.innerHTML = '';
    }

    isInitialized = false;
    console.log('✅ Submit flight page cleanup completed');
}