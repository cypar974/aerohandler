// ./modals/AddFlightLogModal.js
import { supabase } from "../supabase.js";
import { CustomDatePicker } from "../components/customDatePicker.js";
import { CustomTimePicker } from "../components/customTimePicker.js";
import { isIATAvalid } from "../components/isIATAvalid.js";
import { showToast } from "../components/showToast.js";
import { DataSources } from "../components/data-sources.js";
import { Autocomplete } from "../components/autocomplete.js";


export class AddFlightLogModal {
    constructor(containerElement = null) {
        this.container = containerElement;
        this.modal = null;
        this.onCloseCallback = null;
        this.onSuccessCallback = null;
        this.datePickerInstance = null;
        this.timePickerInstances = {
            departure: null,
            arrival: null
        };
        this.planes = [];
        this.students = [];
        this.instructors = [];
        this.isStandalone = !!containerElement;
    }

    async init() {
        await this.fetchData();
        this.render();
        this.attachEvents();
    }

    async fetchData() {
        try {
            const [planesResponse, combinedPersonnel] = await Promise.all([
                supabase.from("planes").select("id, tail_number, model"),
                DataSources.loadCombined() // This would load both students and instructors
            ]);

            if (planesResponse.error) throw planesResponse.error;

            this.planes = planesResponse.data || [];

            // Split combined data back into students and instructors
            this.students = combinedPersonnel.filter(p => p.type === 'student');
            this.instructors = combinedPersonnel.filter(p => p.type === 'instructor');

        } catch (error) {
            console.error('Error fetching modal data:', error);
            showToast('Error loading form data: ' + error.message, 'error');
        }
    }

    render() {
        this.modal = document.createElement('div');
        this.modal.id = "add-flight-log-modal";

        if (this.isStandalone) {
            // Standalone mode - simple container
            this.modal.className = "w-full h-full";
            this.modal.innerHTML = this.getModalHTML(true);

            // In standalone mode, directly append to container
            if (this.container) {
                this.container.appendChild(this.modal);
            } else {
                console.error('Container not found for standalone mode');
            }
        } else {
            // Original modal mode
            this.modal.className = "hidden fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm";
            this.modal.innerHTML = this.getModalHTML(false);
            document.body.appendChild(this.modal);
        }
    }

    getModalHTML(isStandalone) {
        const headerSection = isStandalone ? `
            <!-- Simplified Header for Standalone -->
            <div class="flex items-center justify-between mb-6 pb-4 border-b border-gray-700">
                <div class="flex items-center space-x-3">
                    <div class="p-2 bg-blue-600 rounded-lg">
                        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                    </div>
                    <div>
                        <h2 class="text-xl font-bold text-white">Submit Flight Log</h2>
                        <p class="text-sm text-gray-400">EASA Compliant Flight Log Entry</p>
                    </div>
                </div>
                ${!isStandalone ? `
                <button id="cancel-flight-log-modal" class="p-2 hover:bg-gray-800 rounded-lg transition-colors duration-200">
                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
                ` : ''}
            </div>
        ` : `
            <!-- Original Modal Header -->
            <div class="flex items-center justify-between p-6 border-b border-gray-700">
                <div class="flex items-center space-x-3">
                    <div class="p-2 bg-blue-600 rounded-lg">
                        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                    </div>
                    <div>
                        <h2 class="text-xl font-bold text-white">Submit Flight Log</h2>
                        <p class="text-sm text-gray-400">EASA Compliant Flight Log Entry</p>
                    </div>
                </div>
                <button id="cancel-flight-log-modal" class="p-2 hover:bg-gray-800 rounded-lg transition-colors duration-200">
                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        `;

        const contentClass = isStandalone ? "p-0" : "p-6 max-h-[70vh] overflow-y-auto";
        const footerSection = isStandalone ? `
            <!-- Simplified Footer for Standalone -->
            <div class="flex justify-end space-x-3 pt-6 border-t border-gray-700">
                <button type="button" id="cancel-flight-log-btn" class="px-0 py-0"></button>
                <button type="submit" form="flight-log-form" class="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors duration-200 font-medium flex items-center space-x-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span>Submit Flight Log</span>
                </button>
            </div>
        ` : `
            <!-- Original Modal Footer -->
            <div class="flex justify-end space-x-3 p-6 border-t border-gray-700 bg-gray-800/50">
                <button type="button" id="cancel-flight-log-btn" class="px-6 py-2.5 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors duration-200 font-medium">
                    Cancel
                </button>
                <button type="submit" form="flight-log-form" class="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors duration-200 font-medium flex items-center space-x-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span>Submit Flight Log</span>
                </button>
            </div>
        `;

        return /* html */ `
            <div class="${isStandalone ? 'h-full flex flex-col' : 'bg-gray-900 rounded-2xl w-full max-w-4xl shadow-2xl border border-gray-700 transform transition-all duration-300 scale-95 opacity-0 max-h-[90vh] overflow-hidden'}">
                ${headerSection}

                <!-- Modal Body -->
                <div class="${contentClass} flex-1 overflow-y-auto">
                    <form id="flight-log-form" class="space-y-6">
                        <!-- Flight Information Section -->
                        <div class="bg-gray-800 p-6 rounded-xl border border-gray-700">
                            <h2 class="text-xl font-semibold mb-4 text-blue-400">Flight Information</h2>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block mb-2 text-sm font-medium text-gray-300">Flight Date *</label>
                                    <input type="date" id="flight-date" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
                                </div>
                                <div>
                                    <label class="block mb-2 text-sm font-medium text-gray-300">Type of Flight *</label>
                                    <select id="flight-type" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
                                    <option value="">Select Type</option>
                                    <option value="P">P</option>
                                    <option value="EP / I">EP / I</option>
                                    <option value="EP / FE">EP / FE</option>
                                    <option value="P / I">P / I</option>
                                </select>
                                </div>
                                <div>
                                    <label class="block mb-2 text-sm font-medium text-gray-300">Nature of Flight *</label>
                                    <select id="flight-nature" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
                                        <option value="">Select Nature</option>
                                        <option value="nav">Navigation</option>
                                        <option value="loc">Local</option>
                                        <option value="pat">Patterns</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block mb-2 text-sm font-medium text-gray-300">Plane *</label>
                                    <select id="flight-plane" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
                                        <option value="">Select Plane</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- Route Information Section -->
                        <div class="bg-gray-800 p-6 rounded-xl border border-gray-700">
                            <h2 class="text-xl font-semibold mb-4 text-green-400">Route Information</h2>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block mb-2 text-sm font-medium text-gray-300">Departure Airport (IACO) *</label>
                                    <input type="text" id="departure-iata" maxlength="4" placeholder="LFMD" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
                                </div>
                                <div>
                                    <label class="block mb-2 text-sm font-medium text-gray-300">Arrival Airport (IACO) *</label>
                                    <input type="text" id="arrival-iata" maxlength="4" placeholder="LFMD" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
                                </div>
                                <div>
                                    <label class="block mb-2 text-sm font-medium text-gray-300">Departure Time *</label>
                                    <input type="time" id="departure-time" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
                                </div>
                                <div>
                                    <label class="block mb-2 text-sm font-medium text-gray-300">Arrival Time *</label>
                                    <input type="time" id="arrival-time" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
                                </div>
                                <div class="md:col-span-2">
                                    <label class="block mb-2 text-sm font-medium text-gray-300">Calculated Flight Duration</label>
                                    <div id="flight-duration-display" class="p-3 bg-gray-700 rounded border border-gray-600 text-yellow-400 font-mono text-lg">
                                        --:--
                                    </div>
                                    <small class="text-gray-400">Automatically calculated from departure and arrival times</small>
                                </div>
                            </div>
                        </div>

                        <!-- Personnel Section -->
                        <div class="bg-gray-800 p-6 rounded-xl border border-gray-700">
                            <h2 class="text-xl font-semibold mb-4 text-purple-400">Personnel</h2>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div class="relative">
                                    <label class="block mb-2 text-sm font-medium text-gray-300">Pilot Name *</label>
                                    <input type="text" id="pilot-name" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Start typing name..." required autocomplete="off">
                                    <input type="hidden" id="pilot-uuid">
                                    <ul id="pilot-suggestions" class="absolute left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg hidden z-50 max-h-60 overflow-y-auto"></ul>
                                </div>
                                <div class="relative">
                                    <label class="block mb-2 text-sm font-medium text-gray-300">Instructor Name</label>
                                    <input type="text" id="instructor-name" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Start typing name..." autocomplete="off">
                                    <input type="hidden" id="instructor-uuid">
                                    <ul id="instructor-suggestions" class="absolute left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg hidden z-50 max-h-60 overflow-y-auto"></ul>
                                </div>
                            </div>
                        </div>

                        <!-- Aircraft Data Section -->
                        <div class="bg-gray-800 p-6 rounded-xl border border-gray-700">
                            <h2 class="text-xl font-semibold mb-4 text-orange-400">Aircraft Data</h2>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block mb-2 text-sm font-medium text-gray-300">Hour Meter - Departure *</label>
                                    <input type="text" id="hour-meter-departure" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="1250.75" required>
                                    <small class="text-gray-400">Format: xxxxx,xx (e.g., 1250,75)</small>
                                </div>
                                <div>
                                    <label class="block mb-2 text-sm font-medium text-gray-300">Hour Meter - Arrival *</label>
                                    <input type="text" id="hour-meter-arrival" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="1251.25" required>
                                    <small class="text-gray-400">Format: xxxxx,xx (e.g., 1250,75)</small>
                                </div>
                                <div>
                                    <label class="block mb-2 text-sm font-medium text-gray-300">Fuel Added - Departure</label>
                                    <input type="text" id="fuel-departure" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g. +50L FF / +28 L PFL">
                                    <small class="text-gray-400">Leave empty if nothing added</small>
                                </div>
                                <div>
                                    <label class="block mb-2 text-sm font-medium text-gray-300">Fuel Added - Arrival</label>
                                    <input type="text" id="fuel-arrival" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g. +50L FF / +28 L PFL">
                                    <small class="text-gray-400">Leave empty if nothing added</small>
                                </div>
                                <div>
                                    <label class="block mb-2 text-sm font-medium text-gray-300">Engine Oil Added - Departure</label>
                                    <input type="number" id="engine-oil-departure" min="0" step="0.01" placeholder="0.00" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                    <small class="text-gray-400">Quarts (e.g., 1.5)</small>
                                </div>
                                <div>
                                    <label class="block mb-2 text-sm font-medium text-gray-300">Engine Oil Added - Arrival</label>
                                    <input type="number" id="engine-oil-arrival" min="0" step="0.01" placeholder="0.00" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                    <small class="text-gray-400">Quarts (e.g., 1.5)</small>
                                </div>
                            </div>
                        </div>

                        <!-- Landings Section -->
                        <div class="bg-gray-800 p-6 rounded-xl border border-gray-700">
                            <h2 class="text-xl font-semibold mb-4 text-red-400">Landings</h2>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block mb-2 text-sm font-medium text-gray-300">Touch & Go + Full Stops at LFMD</label>
                                    <input type="number" id="touch-go-full-lfmd" min="0" placeholder="0.00" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                </div>
                                <div>
                                    <label class="block mb-2 text-sm font-medium text-gray-300">Landings Count *</label>
                                    <input type="number" id="landings-count" min="1" placeholder="0.00" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
                                </div>
                            </div>
                        </div>

                        <!-- Additional Information Section -->
                        <div class="bg-gray-800 p-6 rounded-xl border border-gray-700">
                            <h2 class="text-xl font-semibold mb-4 text-yellow-400">Additional Information</h2>
                            <div class="space-y-4">
                                <div>
                                    <label class="block mb-2 text-sm font-medium text-gray-300">Incidents or Observations (for journey log use)</label>
                                    <textarea id="incidents" rows="3" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Any incidents or observations, if nothing leave empty"></textarea>
                                </div>
                                <div>
                                    <label class="block mb-2 text-sm font-medium text-gray-300">Additional Remarks (for club use)</label>
                                    <textarea id="remarks" rows="2" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Any additional remarks..., if nothing leave empty"></textarea>
                                </div>
                                <div class="flex items-center space-x-3 p-4 bg-gray-750 rounded border border-gray-600">
                                    <input type="checkbox" id="signature-captain" class="w-5 h-5 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-2">
                                    <label for="signature-captain" class="text-sm font-medium text-gray-300">
                                        I, <span id="captain-name-placeholder" class="font-bold text-blue-300">[Pilot Name]</span>, certify that the information provided above is true and accurate to the best of my knowledge.
                                    </label>
                                </div>
                            </div>
                        </div>

                        <!-- Validation Messages -->
                        <div id="validation-messages" class="hidden p-4 bg-red-900/50 border border-red-700 rounded-lg">
                            <div class="flex items-center space-x-2 text-red-300">
                                <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                <span id="validation-text" class="text-sm"></span>
                            </div>
                        </div>

                        <!-- Loading State -->
                        <div id="loading-state" class="hidden flex items-center justify-center space-x-2 py-4">
                            <div class="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                            <span class="text-gray-400">Submitting flight log...</span>
                        </div>
                    </form>
                </div>

                ${footerSection}
            </div>
        `;
    }

    attachEvents() {
        // Close modal events - only in modal mode
        if (!this.isStandalone) {
            this.modal.addEventListener('click', (e) => {
                // Only close if clicking the backdrop, not the content
                if (e.target === this.modal) {
                    this.hide();
                }
            });

            // Add mousedown event to track where the click started
            let mouseDownTarget = null;
            this.modal.addEventListener('mousedown', (e) => {
                mouseDownTarget = e.target;
            });

            this.modal.addEventListener('mouseup', (e) => {
                // Only close if both mousedown and mouseup happened on the backdrop
                if (e.target === this.modal && mouseDownTarget === this.modal) {
                    this.hide();
                }
                mouseDownTarget = null;
            });

            const cancelModalBtn = document.getElementById('cancel-flight-log-modal');
            if (cancelModalBtn) {
                cancelModalBtn.addEventListener('click', () => this.hide());
            }
        }

        // Cancel button event (exists in both modes)
        const cancelBtn = document.getElementById('cancel-flight-log-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.hide());
        }

        // Form submission
        const flightLogForm = document.getElementById("flight-log-form");
        if (flightLogForm) {
            flightLogForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                if (!this.validateForm()) return;
                await this.submitFlightLog();
            });
        }

        // Close on Escape key - only in modal mode
        if (!this.isStandalone) {
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) {
                    this.hide();
                }
            });
        }

        // Setup additional event listeners
        this.setupEventListeners();
        this.setupAutoCalculations();
    }

    async show(params = {}) {
        if (this.isStandalone) {
            // Wait for DOM to be fully rendered
            await new Promise(resolve => setTimeout(resolve, 50));

            await this.loadDropdowns();
            this.setDefaultValues(params);
            this.initializeCustomPickers();

            console.log('Flight log form shown in standalone mode');
        } else {
            // Original modal behavior
            if (!this.modal) {
                console.error('Modal element not found');
                return;
            }

            this.modal.classList.remove("hidden");
            const modalContent = this.modal.querySelector('.bg-gray-900');

            setTimeout(() => {
                if (modalContent) {
                    modalContent.classList.remove("scale-95", "opacity-0");
                    modalContent.classList.add("scale-100", "opacity-100");
                }
            }, 10);

            await this.loadDropdowns();
            this.setDefaultValues(params);
            this.initializeCustomPickers();
        }
    }

    hide() {
        if (this.isStandalone) {
            // For standalone mode, just call the close callback
            if (this.onCloseCallback) this.onCloseCallback();
        } else {
            // Original modal hide behavior
            const modalContent = this.modal.querySelector('.bg-gray-900');
            if (modalContent) {
                modalContent.classList.remove("scale-100", "opacity-100");
                modalContent.classList.add("scale-95", "opacity-0");
            }

            setTimeout(() => {
                this.modal.classList.add("hidden");
                this.resetForm();
                this.cleanupCustomPickers();
                if (this.onCloseCallback) this.onCloseCallback();
            }, 200);
        }
    }

    setDefaultValues(params = {}) {
        const flightDateEl = document.getElementById("flight-date");
        const departureIataEl = document.getElementById("departure-iata");
        const arrivalIataEl = document.getElementById("arrival-iata");
        const pilotNameEl = document.getElementById("pilot-name");
        const pilotUuidEl = document.getElementById("pilot-uuid");
        const captainPlaceholderEl = document.getElementById("captain-name-placeholder");
        const oilDepartureEl = document.getElementById("engine-oil-departure");
        const oilArrivalEl = document.getElementById("engine-oil-arrival");
        const instructorNameEl = document.getElementById("instructor-name");
        const instructorUuidEl = document.getElementById("instructor-uuid");
        const planeSelectEl = document.getElementById("flight-plane");
        const departureTimeEl = document.getElementById("departure-time");
        const arrivalTimeEl = document.getElementById("arrival-time");

        if (!flightDateEl || !departureIataEl || !arrivalIataEl) {
            console.warn('Required form elements not found during setDefaultValues');
            return;
        }


        // Get today's date in LOCAL timezone, not UTC
        const now = new Date();
        const today = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

        // Use the setValue method for custom pickers if they exist
        if (this.datePickerInstance) {
            this.datePickerInstance.setValue(today);
        } else if (flightDateEl) {
            flightDateEl.value = today;
        }

        // Set default IATA codes to LFMD
        if (departureIataEl) {
            departureIataEl.value = "LFMD";
        }

        if (arrivalIataEl) {
            arrivalIataEl.value = "LFMD";
        }

        // Pre-fill values if provided
        if (params.pilotId) {
            const person = [...this.students, ...this.instructors].find(p => p.id === params.pilotId);
            if (person) {
                // CHANGED: Use 'name' field for both students and instructors
                document.getElementById("pilot-name").value = person.name;
                document.getElementById("pilot-uuid").value = params.pilotId;
                document.getElementById("captain-name-placeholder").textContent = person.name;
            }
        }

        // Set default values for oil fields with placeholder behavior
        document.getElementById("engine-oil-departure").value = "0.00";
        document.getElementById("engine-oil-arrival").value = "0.00";

        if (params.instructorId) {
            const instructor = this.instructors.find(i => i.id === params.instructorId);
            if (instructor) {
                // CHANGED: Use 'name' field instead of 'full_name'
                document.getElementById("instructor-name").value = instructor.name;
                document.getElementById("instructor-uuid").value = params.instructorId;
            }
        }

        if (params.planeId) {
            document.getElementById("flight-plane").value = params.planeId;
        }

        // Set default times using the custom time pickers if they exist
        const defaultDepartureTime = "08:00";
        const defaultArrivalTime = "09:00";

        if (this.timePickerInstances.departure) {
            this.timePickerInstances.departure.setValue(defaultDepartureTime);
        } else {
            document.getElementById("departure-time").value = defaultDepartureTime;
        }

        if (this.timePickerInstances.arrival) {
            this.timePickerInstances.arrival.setValue(defaultArrivalTime);
        } else {
            document.getElementById("arrival-time").value = defaultArrivalTime;
        }
    }

    async loadDropdowns() {
        const planeSelect = document.getElementById("flight-plane");

        // ADD NULL CHECK
        if (!planeSelect) {
            console.warn('Plane select element not found');
            return;
        }

        // Clear existing options
        planeSelect.innerHTML = '<option value="">Select Plane</option>';

        // Populate planes
        this.planes.forEach(plane => {
            planeSelect.innerHTML += `<option value="${plane.id}">${plane.tail_number} - ${plane.model}</option>`;
        });
    }

    setupEventListeners() {
        // Pilot name autocomplete using the Autocomplete class
        this.setupAdvancedAutocomplete("pilot-name", "pilot-uuid", 'both');

        // Instructor name autocomplete using the Autocomplete class
        this.setupAdvancedAutocomplete("instructor-name", "instructor-uuid", 'instructors');

        // Update captain name placeholder when pilot name changes
        const pilotNameInput = document.getElementById("pilot-name");
        const captainPlaceholder = document.getElementById("captain-name-placeholder");

        // ADD NULL CHECKS
        if (pilotNameInput && captainPlaceholder) {
            pilotNameInput.addEventListener("input", (e) => {
                captainPlaceholder.textContent = e.target.value || "[Pilot Name]";
            });
        }

        // Hour meter auto-formatting - ADD NULL CHECKS
        if (document.getElementById("hour-meter-departure")) {
            this.setupHourMeterFormatting("hour-meter-departure");
        }
        if (document.getElementById("hour-meter-arrival")) {
            this.setupHourMeterFormatting("hour-meter-arrival");
        }

        // Clear default IATA codes when user starts typing
        this.setupIataDefaults();

        // Setup placeholder clearing for other fields
        this.setupPlaceholderClearing();
    }

    setupPlaceholderClearing() {
        // Define fields that should clear placeholder on focus and restore if empty on blur
        const placeholderFields = [
            {
                id: 'pilot-name',
                placeholder: 'Start typing name...'
            },
            {
                id: 'fuel-departure',
                placeholder: 'e.g. +50L FF / +28 L PFL'
            },
            {
                id: 'fuel-arrival',
                placeholder: 'e.g. +50L FF / +28 L PFL'
            },
            {
                id: 'incidents',
                placeholder: 'Any incidents or observations, if nothing leave empty'
            },
            {
                id: 'remarks',
                placeholder: 'Any additional remarks..., if nothing leave empty'
            }
        ];

        placeholderFields.forEach(fieldConfig => {
            const field = document.getElementById(fieldConfig.id);
            if (!field) return;

            field.addEventListener('focus', (e) => {
                if (e.target.value === fieldConfig.placeholder) {
                    e.target.value = '';
                }
            });

            field.addEventListener('blur', (e) => {
                if (!e.target.value.trim()) {
                    e.target.value = fieldConfig.placeholder;
                }
            });

            // Initialize with placeholder if empty
            if (!field.value.trim()) {
                field.value = fieldConfig.placeholder;
            }
        });

        // Special handling for oil fields - clear the "0.00" placeholder on focus
        const oilFields = [
            { id: 'engine-oil-departure', placeholder: '0.00' },
            { id: 'engine-oil-arrival', placeholder: '0.00' }
        ];

        oilFields.forEach(fieldConfig => {
            const field = document.getElementById(fieldConfig.id);
            if (!field) return;

            field.addEventListener('focus', (e) => {
                if (e.target.value === fieldConfig.placeholder) {
                    e.target.value = '';
                }
            });

            field.addEventListener('blur', (e) => {
                if (!e.target.value.trim()) {
                    e.target.value = fieldConfig.placeholder;
                }
            });

            // Initialize with placeholder if empty
            if (!field.value.trim()) {
                field.value = fieldConfig.placeholder;
            }
        });

        const instructorNameInput = document.getElementById('instructor-name');
        if (instructorNameInput) {
            instructorNameInput.addEventListener('focus', (e) => {
                if (e.target.value === 'Start typing name...') {
                    e.target.value = '';
                }
            });

            instructorNameInput.addEventListener('blur', (e) => {
                if (!e.target.value.trim()) {
                    e.target.value = 'Start typing name...';
                }
            });

            // Initialize with placeholder if empty
            if (!instructorNameInput.value.trim()) {
                instructorNameInput.value = 'Start typing name...';
            }
        }
    }

    setupAdvancedAutocomplete(inputId, hiddenId, type = 'both') {
        const inputElement = document.getElementById(inputId);
        const hiddenElement = document.getElementById(hiddenId);

        if (!inputElement) {
            console.warn(`Autocomplete input element not found: ${inputId}`);
            return;
        }

        // Determine data source based on type
        let dataSource = [];
        if (type === 'both') {
            dataSource = [...this.students, ...this.instructors].map(person => ({
                id: person.id,
                name: person.name,
                first_name: person.first_name,
                last_name: person.last_name,
                email: person.email,
                type: person.type
            }));
        } else if (type === 'instructors') {
            dataSource = this.instructors.map(instructor => ({
                id: instructor.id,
                name: instructor.name,
                first_name: instructor.first_name,
                last_name: instructor.last_name,
                email: instructor.email,
                type: 'instructor'
            }));
        }

        // Create autocomplete instance
        this[`${inputId}Autocomplete`] = new Autocomplete({
            inputElement: inputElement,
            dataSource: dataSource,
            displayField: 'name',
            valueField: 'id',
            additionalFields: ['email'],
            placeholder: 'Start typing name...',
            noResultsText: 'No matches found',
            onSelect: (selected) => {
                if (hiddenElement) {
                    hiddenElement.value = selected.id;
                }

                // Update captain name if this is the pilot
                if (inputId === "pilot-name") {
                    const captainPlaceholder = document.getElementById("captain-name-placeholder");
                    if (captainPlaceholder) {
                        captainPlaceholder.textContent = selected.value;
                    }
                }

                console.log(`Selected ${type}:`, selected);
            },
            onInput: (query) => {
                // Clear hidden field when input is cleared
                if (!query.trim() && hiddenElement) {
                    hiddenElement.value = "";
                }
            }
        });
    }

    setupIataDefaults() {
        const departureIata = document.getElementById("departure-iata");
        const arrivalIata = document.getElementById("arrival-iata");

        // ADD NULL CHECKS
        [departureIata, arrivalIata].forEach(field => {
            if (!field) return;

            field.addEventListener('focus', (e) => {
                if (e.target.value === 'LFMD') {
                    e.target.value = '';
                }
            });

            field.addEventListener('blur', (e) => {
                if (!e.target.value.trim()) {
                    e.target.value = 'LFMD';
                }
            });

            // Initialize with default if empty
            if (!field.value.trim()) {
                field.value = 'LFMD';
            }
        });
    }

    setupHourMeterFormatting(fieldId) {
        const field = document.getElementById(fieldId);

        if (!field) {
            console.warn(`Field not found for hour meter formatting: ${fieldId}`);
            return;
        }

        field.addEventListener('input', (e) => {
            let value = e.target.value.replace(/[^0-9]/g, '');

            if (value.length > 2) {
                e.target.value = value.slice(0, value.length - 2) + ',' + value.slice(-2);
            } else {
                e.target.value = value;
            }
        });

        field.addEventListener('blur', (e) => {
            let value = e.target.value.replace(/[^0-9]/g, '');

            if (!value) return;

            // Ensure we have at least 2 digits for the decimal part
            if (value.length === 1) {
                value = '0' + value;
            }

            if (value.length === 2) {
                e.target.value = '0,' + value;
            } else if (value.length > 2) {
                e.target.value = value.slice(0, value.length - 2) + ',' + value.slice(-2);
            } else {
                e.target.value = value;
            }
        });

        // Also update the placeholder text to match the format
        field.placeholder = "e.g., 7732,06";
    }

    setupAutoCalculations() {
        console.log('🔄 Setting up flight log auto calculations...');

        const calculateDuration = () => {
            console.log('✈️ Calculating flight duration...');
            const departureTime = document.getElementById("departure-time");
            const arrivalTime = document.getElementById("arrival-time");
            const durationDisplay = document.getElementById("flight-duration-display");

            if (!departureTime || !arrivalTime || !durationDisplay) {
                console.log('❌ Missing elements for flight duration calculation');
                return;
            }

            console.log('Departure time:', departureTime.value, 'Arrival time:', arrivalTime.value);

            if (!departureTime.value || !arrivalTime.value) {
                durationDisplay.textContent = "--:--";
                console.log('❌ Missing time values');
                return;
            }

            const [depHours, depMinutes] = departureTime.value.split(':').map(Number);
            const [arrHours, arrMinutes] = arrivalTime.value.split(':').map(Number);

            let totalMinutes = (arrHours * 60 + arrMinutes) - (depHours * 60 + depMinutes);

            // Handle overnight flights
            if (totalMinutes < 0) {
                totalMinutes += 24 * 60;
            }

            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            const decimalHours = (totalMinutes / 60).toFixed(2);

            durationDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} (${decimalHours}h)`;

            // Store decimal hours in a data attribute for form submission
            durationDisplay.setAttribute('data-decimal-hours', decimalHours);

            console.log('✅ Flight duration calculated:', durationDisplay.textContent);
        };

        // Get fresh references to the inputs
        const departureTime = document.getElementById("departure-time");
        const arrivalTime = document.getElementById("arrival-time");

        if (departureTime) {
            // Remove existing listeners to avoid duplicates
            departureTime.removeEventListener("change", calculateDuration);
            departureTime.removeEventListener("input", calculateDuration);

            // Add new listeners
            departureTime.addEventListener("change", calculateDuration);
            departureTime.addEventListener("input", calculateDuration);
            console.log('✅ Departure time listeners attached');
        }

        if (arrivalTime) {
            // Remove existing listeners to avoid duplicates
            arrivalTime.removeEventListener("change", calculateDuration);
            arrivalTime.removeEventListener("input", calculateDuration);

            // Add new listeners
            arrivalTime.addEventListener("change", calculateDuration);
            arrivalTime.addEventListener("input", calculateDuration);
            console.log('✅ Arrival time listeners attached');
        }

        // Calculate immediately
        setTimeout(calculateDuration, 100);

        // Validate hour meter values
        const hourMeterDeparture = document.getElementById("hour-meter-departure");
        const hourMeterArrival = document.getElementById("hour-meter-arrival");

        function validateHourMeters() {
            const departure = parseFloat(hourMeterDeparture.value);
            const arrival = parseFloat(hourMeterArrival.value);

            if (departure && arrival && arrival <= departure) {
                hourMeterArrival.setCustomValidity("Arrival hour meter must be greater than departure");
            } else {
                hourMeterArrival.setCustomValidity("");
            }
        }

        if (hourMeterDeparture && hourMeterArrival) {
            hourMeterDeparture.addEventListener("input", validateHourMeters);
            hourMeterArrival.addEventListener("input", validateHourMeters);
        }

        console.log('✅ Flight log auto calculations setup complete');
    }

    validateForm() {
        const requiredFields = [
            'flight-date', 'flight-type', 'flight-nature', 'flight-plane',
            'pilot-name', 'departure-iata', 'arrival-iata',
            'departure-time', 'arrival-time', 'hour-meter-departure',
            'hour-meter-arrival', 'landings-count'
        ];

        for (const fieldId of requiredFields) {
            const field = document.getElementById(fieldId);
            if (!field.value.trim()) {
                this.showValidationError(`Please fill in the ${field.labels[0]?.textContent || fieldId} field`);
                field.focus();
                return false;
            }
        }

        // Validate pilot UUID is set
        if (!document.getElementById("pilot-uuid").value) {
            this.showValidationError("Please select a valid pilot from the suggestions");
            document.getElementById("pilot-name").focus();
            return false;
        }

        // Validate IATA codes are 4 characters
        const departureIata = document.getElementById("departure-iata").value;
        const arrivalIata = document.getElementById("arrival-iata").value;

        if (departureIata.length !== 4) {
            this.showValidationError("Departure IACO code must be exactly 4 characters");
            return false;
        }

        if (arrivalIata.length !== 4) {
            this.showValidationError("Arrival IACO code must be exactly 4 characters");
            return false;
        }

        if (!isIATAvalid(departureIata)) {
            this.showValidationError("Please enter a valid 4-character IACO code for Departure");
            document.getElementById("departure-iata").focus();
            return false;
        }

        if (!isIATAvalid(arrivalIata)) {
            this.showValidationError("Please enter a valid 4-character IACO code for Arrival");
            document.getElementById("arrival-iata").focus();
            return false;
        }

        // Validate times
        const departureTime = document.getElementById("departure-time").value;
        const arrivalTime = document.getElementById("arrival-time").value;

        if (departureTime >= arrivalTime) {
            this.showValidationError("Arrival time must be after departure time");
            return false;
        }

        // Validate hour meters
        const hourMeterDeparture = parseFloat(document.getElementById("hour-meter-departure").value.replace(',', '.'));
        const hourMeterArrival = parseFloat(document.getElementById("hour-meter-arrival").value.replace(',', '.'));

        if (isNaN(hourMeterDeparture) || isNaN(hourMeterArrival)) {
            this.showValidationError("Please enter valid hour meter values in format xxxxx.xx");
            return false;
        }

        if (hourMeterArrival <= hourMeterDeparture) {
            this.showValidationError("Arrival hour meter must be greater than departure hour meter");
            return false;
        }

        const pilotUuid = document.getElementById("pilot-uuid").value;
        const instructorUuid = document.getElementById("instructor-uuid").value;

        if (instructorUuid && pilotUuid === instructorUuid) {
            showToast("Pilot and Instructor cannot be the same person", "error");
            this.showValidationError("Pilot and Instructor cannot be the same person");
            document.getElementById("instructor-name").focus();
            return false;
        }

        // Validate signature
        if (!document.getElementById("signature-captain").checked) {
            this.showValidationError("You must certify the information by checking the signature box");
            return false;
        }

        this.hideValidationError();
        return true;
    }

    showValidationError(message) {
        const validationEl = document.getElementById("validation-messages");
        const validationText = document.getElementById("validation-text");
        validationText.textContent = message;
        validationEl.classList.remove("hidden");
    }

    hideValidationError() {
        const validationEl = document.getElementById("validation-messages");
        validationEl.classList.add("hidden");
    }

    async submitFlightLog() {
        const loadingEl = document.getElementById("loading-state");
        const submitBtn = document.querySelector('button[type="submit"]');

        try {
            loadingEl.classList.remove("hidden");
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<div class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div><span>Submitting...</span>';

            // Get the raw values from the form
            const flightDate = document.getElementById("flight-date").value;
            const departureTime = document.getElementById("departure-time").value;
            const arrivalTime = document.getElementById("arrival-time").value;

            // Combine date and time, then convert to UTC ISO strings
            let departureDateTime = this.convertToUTCISOString(flightDate, departureTime);
            let arrivalDateTime = this.convertToUTCISOString(flightDate, arrivalTime);

            // Handle overnight flights (if arrival is next day)
            const arrivalDate = new Date(arrivalDateTime);
            const departureDate = new Date(departureDateTime);

            // If arrival time is earlier than departure time, assume next day
            if (arrivalDate < departureDate) {
                const nextDay = new Date(flightDate);
                nextDay.setDate(nextDay.getDate() + 1);
                const nextDayString = nextDay.toISOString().split('T')[0];
                arrivalDateTime = this.convertToUTCISOString(nextDayString, arrivalTime);
            }

            // Process fuel fields - send 0 if placeholder or empty
            const fuelDepartureInput = document.getElementById("fuel-departure");
            const fuelArrivalInput = document.getElementById("fuel-arrival");
            const fuelDepartureValue = fuelDepartureInput.value === 'e.g. +50L FF / +28 L PFL' || !fuelDepartureInput.value.trim() ? '0' : fuelDepartureInput.value;
            const fuelArrivalValue = fuelArrivalInput.value === 'e.g. +50L FF / +28 L PFL' || !fuelArrivalInput.value.trim() ? '0' : fuelArrivalInput.value;

            // Process oil fields - send 0 if placeholder or empty
            const oilDepartureInput = document.getElementById("engine-oil-departure");
            const oilArrivalInput = document.getElementById("engine-oil-arrival");
            const oilDepartureValue = oilDepartureInput.value === '0.00' || !oilDepartureInput.value.trim() ? 0 : parseFloat(oilDepartureInput.value) || 0;
            const oilArrivalValue = oilArrivalInput.value === '0.00' || !oilArrivalInput.value.trim() ? 0 : parseFloat(oilArrivalInput.value) || 0;

            // Process incidents and remarks
            const incidentsInput = document.getElementById("incidents");
            const remarksInput = document.getElementById("remarks");
            const incidentsValue = incidentsInput.value === 'Any incidents or observations, if nothing leave empty' || !incidentsInput.value.trim() ? 'RAS' : incidentsInput.value;
            const remarksValue = remarksInput.value === 'Any additional remarks..., if nothing leave empty' || !remarksInput.value.trim() ? '' : remarksInput.value;

            // Process instructor name - send empty if placeholder or empty
            const instructorNameInput = document.getElementById("instructor-name");
            const instructorNameValue = instructorNameInput.value === 'Start typing name...' || !instructorNameInput.value.trim() ? '' : instructorNameInput.value;

            const formData = {
                flight_date: flightDate,
                type_of_flight: document.getElementById("flight-type").value,
                nature_of_flight: document.getElementById("flight-nature").value,
                plane_id: document.getElementById("flight-plane").value,

                pilot_name: document.getElementById("pilot-name").value,
                pilot_uuid: document.getElementById("pilot-uuid").value,
                instructor_name: instructorNameValue,
                instructor_uuid: document.getElementById("instructor-uuid").value || null,

                departure_iata: document.getElementById("departure-iata").value.toUpperCase(),
                arrival_iata: document.getElementById("arrival-iata").value.toUpperCase(),
                departure_time: departureDateTime, // Now in UTC TIMESTAMPTZ format
                arrival_time: arrivalDateTime,     // Now in UTC TIMESTAMPTZ format
                flight_duration: parseFloat(document.getElementById("flight-duration-display").getAttribute('data-decimal-hours') || 0),

                fuel_added_departure: fuelDepartureValue,
                fuel_added_arrival: fuelArrivalValue,
                hour_meter_departure: parseFloat(document.getElementById("hour-meter-departure").value.replace(',', '.')),
                hour_meter_arrival: parseFloat(document.getElementById("hour-meter-arrival").value.replace(',', '.')),
                engine_oil_added_departure: oilDepartureValue,
                engine_oil_added_arrival: oilArrivalValue,

                touch_and_go_and_full_lfmd_count: parseInt(document.getElementById("touch-go-full-lfmd").value) || 0,
                landings_count: parseInt(document.getElementById("landings-count").value) || 0,

                incidents_or_observations: incidentsValue,
                remarks: remarksValue,
                signature_captain: document.getElementById("signature-captain").checked,

                logged_by_user: "admin" // This would normally be the logged-in user
            };

            console.log('Submitting flight log:', formData);

            // Submit to database
            const { data, error } = await supabase
                .from("flight_logs")
                .insert([formData])
                .select()
                .single();

            if (error) throw error;

            showToast('Flight log submitted successfully!', 'success');
            this.hide();

            if (this.onSuccessCallback) {
                this.onSuccessCallback(data);
            }

        } catch (error) {
            console.error('Error submitting flight log:', error);
            showToast('Error submitting flight log: ' + error.message, 'error');
        } finally {
            loadingEl.classList.add("hidden");
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg><span>Submit Flight Log</span>';
        }
    }

    resetForm() {
        document.getElementById("flight-log-form").reset();
        document.getElementById("pilot-uuid").value = "";
        document.getElementById("instructor-uuid").value = "";
        document.getElementById("flight-duration-display").textContent = "--:--";
        document.getElementById("captain-name-placeholder").textContent = "[Pilot Name]";
        // Reset engine oil fields to default values
        document.getElementById("engine-oil-departure").value = "0.00";
        document.getElementById("engine-oil-arrival").value = "0.00";
        this.hideValidationError();

        // NEW: Restore placeholders after reset
        setTimeout(() => {
            this.setupPlaceholderClearing();
        }, 100);
    }

    initializeCustomPickers() {
        // Wait for the DOM to be ready
        setTimeout(() => {
            const dateInput = document.getElementById("flight-date");
            if (dateInput && !this.datePickerInstance) {
                this.datePickerInstance = new CustomDatePicker(dateInput);
            }

            const departureTimeInput = document.getElementById("departure-time");
            if (departureTimeInput && !this.timePickerInstances.departure) {
                this.timePickerInstances.departure = new CustomTimePicker(departureTimeInput);
            }

            const arrivalTimeInput = document.getElementById("arrival-time");
            if (arrivalTimeInput && !this.timePickerInstances.arrival) {
                this.timePickerInstances.arrival = new CustomTimePicker(arrivalTimeInput);
            }
        }, 100);
    }

    cleanupCustomPickers() {
        console.log('🧹 Cleaning up flight log custom pickers...');

        // Reset native input styles
        const dateInput = document.getElementById("flight-date");
        const departureTimeInput = document.getElementById("departure-time");
        const arrivalTimeInput = document.getElementById("arrival-time");

        [dateInput, departureTimeInput, arrivalTimeInput].forEach(input => {
            if (input) {
                input.style.opacity = '';
                input.style.position = '';
                input.style.width = '';
                input.style.height = '';
                input.style.pointerEvents = '';
            }
        });

        // Clean up custom picker instances using the destroy() method
        if (this.datePickerInstance) {
            this.datePickerInstance.destroy();
            this.datePickerInstance = null;
        }

        Object.entries(this.timePickerInstances).forEach(([key, instance]) => {
            if (instance && typeof instance.destroy === 'function') {
                instance.destroy();
                this.timePickerInstances[key] = null;
            }
        });

        console.log('✅ Flight log custom pickers cleaned up');
    }

    onClose(callback) {
        this.onCloseCallback = callback;
    }

    onSuccess(callback) {
        this.onSuccessCallback = callback;
    }

    destroy() {
        console.log('🧹 Destroying AddFlightLogModal...');

        this.cleanupCustomPickers();

        // Clean up autocomplete instances
        if (this['pilot-nameAutocomplete'] && typeof this['pilot-nameAutocomplete'].destroy === 'function') {
            this['pilot-nameAutocomplete'].destroy();
        }
        if (this['instructor-nameAutocomplete'] && typeof this['instructor-nameAutocomplete'].destroy === 'function') {
            this['instructor-nameAutocomplete'].destroy();
        }

        // Remove modal from DOM
        if (this.modal && this.modal.parentNode) {
            this.modal.parentNode.removeChild(this.modal);
        }

        // Clear references
        this.modal = null;
        this.container = null;
        this.datePickerInstance = null;
        this.timePickerInstances = {
            departure: null,
            arrival: null
        };

        console.log('✅ AddFlightLogModal destroyed');
    }

    // Helper method to convert date and time to UTC ISO string
    convertToUTCISOString(dateString, timeString) {
        const localDateTime = new Date(`${dateString}T${timeString}`);
        return localDateTime.toISOString();
    }
}