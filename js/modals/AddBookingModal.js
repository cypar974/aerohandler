// ./js/modals/AddBookingModal.js
import { supabase } from "../supabase.js";
import { CustomDatePicker } from "../components/customDatePicker.js";
import { CustomTimePicker } from "../components/customTimePicker.js";
import { showToast } from "../components/showToast.js";
import { DataSources } from "../components/data-sources.js";
import { Autocomplete } from "../components/autocomplete.js";

export class AddBookingModal {
    constructor(containerElement = null) {
        this.container = containerElement;
        this.modal = null;
        this.isOpen = false;
        this.isInitialized = false;
        this.onCloseCallback = null;
        this.onSuccessCallback = null;
        this.datePickerInstance = null;
        this.timePickerInstances = {
            start: null,
            end: null
        };
        this.planes = [];
        this.students = [];
        this.instructors = [];
        this.combinedPersonnel = [];
        this.currentBookingType = 'instruction'; // 'instruction' or 'regular'

        // Add this to track autocomplete instances
        this.autocompleteInstances = {};

        // Bind methods to ensure proper context
        this.handleModalClick = this.handleModalClick.bind(this);
        this.handleEscapeKey = this.handleEscapeKey.bind(this);
        this.handleFormSubmit = this.handleFormSubmit.bind(this);
        this.handleCancelClick = this.handleCancelClick.bind(this);
        this.handleTabSwitch = this.handleTabSwitch.bind(this);
    }

    async init() {
        if (this.isInitialized) {
            console.log('AddBookingModal already initialized');
            return;
        }

        try {
            await this.fetchData();
            this.render();
            this.attachEvents();
            this.isInitialized = true;
            console.log('AddBookingModal initialized successfully');
        } catch (error) {
            console.error('Failed to initialize AddBookingModal:', error);
            throw error;
        }
    }

    async fetchData() {
        try {
            const [planesResponse, combinedPersonnel] = await Promise.all([
                supabase.from("planes").select("id, tail_number, model"),
                DataSources.loadCombined() // This would load both students and instructors
            ]);

            if (planesResponse.error) throw planesResponse.error;

            this.planes = planesResponse.data || [];
            this.combinedPersonnel = combinedPersonnel;

            // Split combined data back into students and instructors
            this.students = combinedPersonnel.filter(p => p.type === 'student');
            this.instructors = combinedPersonnel.filter(p => p.type === 'instructor');

        } catch (error) {
            console.error('Error fetching modal data:', error);
            showToast('Error loading form data: ' + error.message, 'error');
        }
    }

    render() {
        // ✅ ALWAYS CREATE A NEW MODAL - NO REUSING
        // Remove existing modal if present
        if (this.modal && document.body.contains(this.modal)) {
            document.body.removeChild(this.modal);
        }

        this.modal = document.createElement('div');
        this.modal.id = "add-booking-modal";
        this.modal.className = "hidden fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm";
        this.modal.innerHTML = this.getModalHTML();
        document.body.appendChild(this.modal);
        console.log('✅ Modal DOM created fresh');
    }

    getModalHTML() {
        return `
            <div class="bg-gray-900 rounded-2xl w-full max-w-4xl shadow-2xl border border-gray-700 transform transition-all duration-300 scale-95 opacity-0 max-h-[90vh] flex flex-col">
                <!-- Modal Header -->
                <div class="flex-shrink-0 flex items-center justify-between p-6 border-b border-gray-700">
                    <div class="flex items-center space-x-3">
                        <div class="p-2 bg-blue-600 rounded-lg">
                            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                            </svg>
                        </div>
                        <div>
                            <h2 class="text-xl font-bold text-white">Create New Booking</h2>
                            <p class="text-sm text-gray-400">Schedule flight training sessions</p>
                        </div>
                    </div>
                    <button id="cancel-booking-modal" class="p-2 hover:bg-gray-800 rounded-lg transition-colors duration-200">
                        <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <!-- Booking Type Tabs -->
                <div class="flex-shrink-0 border-b border-gray-700">
                    <div class="flex p-4 space-x-1">
                        <button type="button" id="tab-instruction"
                            class="booking-type-tab booking-type-tab-active px-4 py-2 rounded-lg font-medium text-sm transition-colors duration-200">
                            Instruction
                        </button>
                        <button type="button" id="tab-regular"
                            class="booking-type-tab px-4 py-2 rounded-lg font-medium text-sm transition-colors duration-200">
                            Regular
                        </button>
                    </div>
                </div>

                <!-- Modal Body -->
                <div class="flex-1 overflow-y-auto">
                    <div class="p-6">
                        <form id="booking-form" class="space-y-6">
                            <!-- Schedule Information Section -->
                            <div class="bg-gray-800 p-6 rounded-xl border border-gray-700">
                                <h2 class="text-xl font-semibold mb-4 text-blue-400">Schedule Information</h2>
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label class="block mb-2 text-sm font-medium text-gray-300">Booking Date *</label>
                                        <input type="date" id="booking-date"
                                            class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            required>
                                    </div>
                                    <div>
                                        <label class="block mb-2 text-sm font-medium text-gray-300">Start Time *</label>
                                        <input type="time" id="booking-start"
                                            class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            required>
                                    </div>
                                    <div>
                                        <label class="block mb-2 text-sm font-medium text-gray-300">End Time *</label>
                                        <input type="time" id="booking-end"
                                            class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            required>
                                    </div>
                                    <div class="md:col-span-3">
                                        <label class="block mb-2 text-sm font-medium text-gray-300">Calculated Duration</label>
                                        <div id="booking-duration-display"
                                            class="p-3 bg-gray-700 rounded border border-gray-600 text-yellow-400 font-mono text-lg">
                                            --:--
                                        </div>
                                        <small class="text-gray-400">Automatically calculated from start and end times</small>
                                    </div>
                                </div>
                            </div>

                            <!-- Aircraft Section -->
                            <div class="bg-gray-800 p-6 rounded-xl border border-gray-700">
                                <h2 class="text-xl font-semibold mb-4 text-green-400">Aircraft</h2>
                                <div class="grid grid-cols-1 gap-4">
                                    <div>
                                        <label class="block mb-2 text-sm font-medium text-gray-300">Plane *</label>
                                        <select id="booking-plane"
                                            class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            required>
                                            <option value="">Select Plane</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <!-- Personnel Section - Instruction Type -->
                            <div id="personnel-instruction" class="bg-gray-800 p-6 rounded-xl border border-gray-700">
                                <h2 class="text-xl font-semibold mb-4 text-purple-400">Personnel - Instruction</h2>
                                <div class="space-y-4">
                                    <div class="relative">
                                        <label class="block mb-2 text-sm font-medium text-gray-300">Instructor *</label>
                                        <input type="text" id="instructor-name"
                                            class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Start typing instructor name..." required autocomplete="off">
                                        <input type="hidden" id="instructor-uuid">
                                        <ul id="instructor-suggestions"
                                            class="absolute left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg hidden z-50 max-h-60 overflow-y-auto">
                                        </ul>
                                    </div>
                                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div class="relative">
                                            <label class="block mb-2 text-sm font-medium text-gray-300">Student 1 *</label>
                                            <input type="text" id="student1-name"
                                                class="student-input w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="Start typing student name..." required autocomplete="off">
                                            <input type="hidden" id="student1-uuid">
                                            <ul
                                                class="autocomplete-suggestions absolute left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg hidden z-50 max-h-60 overflow-y-auto">
                                            </ul>
                                        </div>
                                        <div class="relative">
                                            <label class="block mb-2 text-sm font-medium text-gray-300">Student 2</label>
                                            <input type="text" id="student2-name"
                                                class="student-input w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="Start typing student name..." autocomplete="off">
                                            <input type="hidden" id="student2-uuid">
                                            <ul
                                                class="autocomplete-suggestions absolute left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg hidden z-50 max-h-60 overflow-y-auto">
                                            </ul>
                                        </div>
                                        <div class="relative">
                                            <label class="block mb-2 text-sm font-medium text-gray-300">Student 3</label>
                                            <input type="text" id="student3-name"
                                                class="student-input w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="Start typing student name..." autocomplete="off">
                                            <input type="hidden" id="student3-uuid">
                                            <ul
                                                class="autocomplete-suggestions absolute left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg hidden z-50 max-h-60 overflow-y-auto">
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Personnel Section - Regular Type -->
                            <div id="personnel-regular" class="bg-gray-800 p-6 rounded-xl border border-gray-700 hidden">
                                <h2 class="text-xl font-semibold mb-4 text-purple-400">Personnel - Regular</h2>
                                <div class="space-y-4">
                                    <div class="relative">
                                        <label class="block mb-2 text-sm font-medium text-gray-300">Pilot *</label>
                                        <input type="text" id="pilot-name"
                                            class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Start typing pilot name..." autocomplete="off">
                                        <input type="hidden" id="pilot-uuid">
                                        <ul id="pilot-suggestions"
                                            class="absolute left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg hidden z-50 max-h-60 overflow-y-auto">
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <!-- Flight Details Section -->
                            <div class="bg-gray-800 p-6 rounded-xl border border-gray-700">
                                <h2 class="text-xl font-semibold mb-4 text-orange-400">Flight Details</h2>
                                <div class="space-y-4">
                                    <div>
                                        <label class="block mb-2 text-sm font-medium text-gray-300">Flight Description</label>
                                        <textarea id="booking-desc" rows="3"
                                            class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Enter flight purpose, training objectives, or special instructions..."></textarea>
                                    </div>
                                </div>
                            </div>

                            <!-- Validation Messages -->
                            <div id="validation-messages" class="hidden p-4 bg-red-900/50 border border-red-700 rounded-lg">
                                <div class="flex items-center space-x-2 text-red-300">
                                    <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    <span id="validation-text" class="text-sm"></span>
                                </div>
                            </div>

                            <!-- Loading State -->
                            <div id="loading-state" class="hidden flex items-center justify-center space-x-2 py-4">
                                <div class="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                                <span class="text-gray-400">Creating booking...</span>
                            </div>
                        </form>
                    </div>

                    <!-- Modal Footer - Fixed at bottom -->
                    <div class="flex-shrink-0 flex justify-end space-x-3 p-6 border-t border-gray-700 bg-gray-800/50">
                        <button type="button" id="cancel-booking-btn"
                            class="px-6 py-2.5 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors duration-200 font-medium">
                            Cancel
                        </button>
                        <button type="submit" form="booking-form"
                            class="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors duration-200 font-medium flex items-center space-x-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            <span>Create Booking</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    attachEvents() {
        console.log('🔗 Attaching modal events...');

        // Remove existing event listeners first
        this.removeEventListeners();

        // Add event listeners
        this.modal.addEventListener('click', this.handleModalClick);
        document.addEventListener('keydown', this.handleEscapeKey);

        // Get fresh references to the buttons each time
        const cancelModalBtn = document.getElementById('cancel-booking-modal');
        const cancelBtn = document.getElementById('cancel-booking-btn');
        const form = document.getElementById("booking-form");
        const tabInstruction = document.getElementById('tab-instruction');
        const tabRegular = document.getElementById('tab-regular');

        if (cancelModalBtn) {
            cancelModalBtn.addEventListener('click', this.handleCancelClick);
            console.log('✅ Cancel modal button event attached');
        }
        if (cancelBtn) {
            cancelBtn.addEventListener('click', this.handleCancelClick);
            console.log('✅ Cancel button event attached');
        }
        if (form) {
            form.addEventListener("submit", this.handleFormSubmit);
            console.log('✅ Form submit event attached');
        }

        // Tab switching - CRITICAL: These were missing!
        if (tabInstruction) {
            tabInstruction.addEventListener('click', () => this.handleTabSwitch('instruction'));
            console.log('✅ Instruction tab event attached');
        }
        if (tabRegular) {
            tabRegular.addEventListener('click', () => this.handleTabSwitch('regular'));
            console.log('✅ Regular tab event attached');
        }

        // Setup additional event listeners
        this.setupEventListeners();
        this.setupAutoCalculations();

        console.log('✅ All events attached successfully');
    }

    handleModalClick(e) {
        if (e.target === this.modal) {
            this.close();
        }
    }

    handleEscapeKey(e) {
        if (e.key === 'Escape' && this.isOpen) {
            this.close();
        }
    }

    handleFormSubmit(e) {
        e.preventDefault();
        this.submitBooking();
    }

    handleCancelClick() {
        this.close();
    }

    handleTabSwitch(type) {
        console.log('🔄 Tab clicked, switching to:', type);
        this.switchBookingType(type);
    }

    removeEventListeners() {
        console.log('🔗 Removing modal events...');

        if (this.modal) {
            this.modal.removeEventListener('click', this.handleModalClick);
        }
        document.removeEventListener('keydown', this.handleEscapeKey);

        // Note: We don't remove individual button listeners here anymore
        // because we'll re-attach them fresh each time in attachEvents()
        console.log('✅ Events removed');
    }

    async show(params = {}) {
        if (this.isOpen) {
            console.log('Modal already open');
            return;
        }

        try {
            // ✅ ALWAYS CREATE A FRESH MODAL INSTANCE
            this.modal = null; // Force recreation
            this.isInitialized = false; // Force re-initialization

            // Re-initialize completely fresh
            await this.init();

            // Reset form and prepare
            this.resetForm();

            // Show modal with animation
            this.modal.classList.remove("hidden");
            this.isOpen = true;

            const modalContent = this.modal.querySelector('.bg-gray-900');
            setTimeout(() => {
                modalContent.classList.remove("scale-95", "opacity-0");
                modalContent.classList.add("scale-100", "opacity-100");
            }, 10);

            // Load data and setup components
            await this.loadDropdowns();
            this.setDefaultValues(params);

            // Initialize custom pickers
            setTimeout(() => {
                this.initializeCustomPickers();
            }, 200);

            // Setup event listeners for autocomplete
            this.setupEventListeners();

            console.log('AddBookingModal shown successfully');

        } catch (error) {
            console.error('Error showing modal:', error);
            showToast('Error opening booking form: ' + error.message, 'error');
        }
    }

    close() {
        if (!this.isOpen || !this.modal) {
            return;
        }

        this.isOpen = false;
        const modalContent = this.modal.querySelector('.bg-gray-900');

        if (modalContent) {
            modalContent.classList.remove("scale-100", "opacity-100");
            modalContent.classList.add("scale-95", "opacity-0");
        }

        setTimeout(() => {
            // ✅ COMPLETELY REMOVE THE MODAL FROM DOM
            if (this.modal && this.modal.parentNode) {
                this.modal.parentNode.removeChild(this.modal);
            }
            this.modal = null; // ✅ Reset modal reference

            this.cleanup(); // ✅ Cleanup all instances

            if (this.onCloseCallback) {
                this.onCloseCallback();
            }
        }, 200);
    }

    switchBookingType(type) {
        console.log('🔄 Switching booking type to:', type);
        this.currentBookingType = type;

        // Update tab styles
        document.querySelectorAll('.booking-type-tab').forEach(tab => {
            tab.classList.remove('booking-type-tab-active');
        });

        const activeTab = document.getElementById(`tab-${type}`);
        if (activeTab) {
            activeTab.classList.add('booking-type-tab-active');
        } else {
            console.error('❌ Tab not found:', `tab-${type}`);
        }

        // Show/hide personnel sections and manage required attributes
        const instructionSection = document.getElementById('personnel-instruction');
        const regularSection = document.getElementById('personnel-regular');

        if (type === 'instruction') {
            if (instructionSection) instructionSection.classList.remove('hidden');
            if (regularSection) regularSection.classList.add('hidden');

            // Set required attributes for instruction fields
            const instructorName = document.getElementById('instructor-name');
            const student1Name = document.getElementById('student1-name');
            if (instructorName) instructorName.setAttribute('required', 'required');
            if (student1Name) student1Name.setAttribute('required', 'required');

            // Remove required from regular fields
            const pilotName = document.getElementById('pilot-name');
            if (pilotName) pilotName.removeAttribute('required');
        } else {
            if (instructionSection) instructionSection.classList.add('hidden');
            if (regularSection) regularSection.classList.remove('hidden');

            // Set required attribute for regular pilot field
            const pilotName = document.getElementById('pilot-name');
            if (pilotName) pilotName.setAttribute('required', 'required');

            // Remove required from instruction fields
            const instructorName = document.getElementById('instructor-name');
            const student1Name = document.getElementById('student1-name');
            if (instructorName) instructorName.removeAttribute('required');
            if (student1Name) student1Name.removeAttribute('required');
        }

        console.log('✅ Booking type switched to:', type);
    }

    setDefaultValues(params = {}) {
        const now = new Date();
        const today = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        document.getElementById("booking-date").value = today;

        // Set default times (next hour to 2 hours later)
        const nextHour = new Date();
        nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
        const endTime = new Date(nextHour);
        endTime.setHours(endTime.getHours() + 2);

        document.getElementById("booking-start").value = nextHour.toTimeString().slice(0, 5);
        document.getElementById("booking-end").value = endTime.toTimeString().slice(0, 5);

        // Pre-fill plane if provided
        if (params.planeId) {
            document.getElementById("booking-plane").value = params.planeId;
        }

        // Check if we have a person ID to pre-fill (could be student, instructor, or any personnel)
        if (params.personId) {
            // Find the person in combined personnel (searches both students and instructors)
            const person = this.combinedPersonnel.find(p => p.id === params.personId);

            if (person) {
                // ALWAYS pre-fill the regular flight pilot field with this person
                document.getElementById("pilot-name").value = person.name;
                document.getElementById("pilot-uuid").value = params.personId;

                // Additionally, if the person is a student, pre-fill student1 for instruction flights
                if (person.type === 'student') {
                    document.getElementById("student1-name").value = person.name;
                    document.getElementById("student1-uuid").value = params.personId;
                }
                // If the person is an instructor, pre-fill instructor for instruction flights
                else if (person.type === 'instructor') {
                    document.getElementById("instructor-name").value = person.name;
                    document.getElementById("instructor-uuid").value = params.personId;
                }
            }
        }

        // Default to instruction tab (but both personnel sections will be pre-filled if personId provided)
        this.switchBookingType('instruction');
    }

    async loadDropdowns() {
        const planeSelect = document.getElementById("booking-plane");

        // Clear existing options
        planeSelect.innerHTML = '<option value="">Select Plane</option>';

        // Populate planes
        this.planes.forEach(plane => {
            planeSelect.innerHTML += `<option value="${plane.id}">${plane.tail_number} - ${plane.model}</option>`;
        });
    }

    setupEventListeners() {
        // Instructor name autocomplete
        this.setupAdvancedAutocomplete("instructor-name", "instructor-uuid", 'instructors');

        // Student autocompletes
        this.setupAdvancedAutocomplete("student1-name", "student1-uuid", 'students');
        this.setupAdvancedAutocomplete("student2-name", "student2-uuid", 'students');
        this.setupAdvancedAutocomplete("student3-name", "student3-uuid", 'students');

        // Pilot autocomplete (searches both students and instructors)
        this.setupAdvancedAutocomplete("pilot-name", "pilot-uuid", 'both');
    }

    setupAdvancedAutocomplete(inputId, hiddenId, type = 'instructors') {
        const inputElement = document.getElementById(inputId);
        const hiddenElement = document.getElementById(hiddenId);

        if (!inputElement) return;

        // Clean up existing instance if it exists
        if (this.autocompleteInstances[inputId]) {
            this.autocompleteInstances[inputId].destroy();
        }

        // Determine data source based on type
        let dataSource = [];
        if (type === 'instructors') {
            dataSource = this.instructors;
        } else if (type === 'students') {
            dataSource = this.students;
        } else if (type === 'both') {
            dataSource = this.combinedPersonnel;
        }

        // Create autocomplete instance and store it
        this.autocompleteInstances[inputId] = new Autocomplete({
            inputElement: inputElement,
            dataSource: dataSource,
            displayField: 'name',
            valueField: 'id',
            additionalFields: ['email'],
            placeholder: inputElement.placeholder,
            noResultsText: 'No matches found',
            onSelect: (selected) => {
                hiddenElement.value = selected.id;
                console.log(`Selected ${type}:`, selected);
            },
            onInput: (query) => {
                // Clear hidden field when input is cleared
                if (!query.trim()) {
                    hiddenElement.value = "";
                }
            }
        });
    }

    setupAutoCalculations() {
        console.log('🔄 Setting up auto calculations...');

        const calculateDuration = () => {
            console.log('📅 Calculating duration...');
            const startTime = document.getElementById("booking-start");
            const endTime = document.getElementById("booking-end");
            const durationDisplay = document.getElementById("booking-duration-display");

            if (!startTime || !endTime || !durationDisplay) {
                console.log('❌ Missing elements for calculation');
                return;
            }

            console.log('Start time:', startTime.value, 'End time:', endTime.value);

            if (!startTime.value || !endTime.value) {
                durationDisplay.textContent = "--:--";
                console.log('❌ Missing time values');
                return;
            }

            const [startHours, startMinutes] = startTime.value.split(':').map(Number);
            const [endHours, endMinutes] = endTime.value.split(':').map(Number);

            let totalMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);

            // Handle overnight bookings
            if (totalMinutes < 0) {
                totalMinutes += 24 * 60;
            }

            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            const decimalHours = (totalMinutes / 60).toFixed(2);

            durationDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} (${decimalHours}h)`;

            // Store decimal hours in a data attribute for form submission
            durationDisplay.setAttribute('data-decimal-hours', decimalHours);

            console.log('✅ Duration calculated:', durationDisplay.textContent);
        };

        // Get fresh references to the inputs
        const startTime = document.getElementById("booking-start");
        const endTime = document.getElementById("booking-end");

        if (startTime) {
            // Remove existing listeners to avoid duplicates
            startTime.removeEventListener("change", calculateDuration);
            startTime.removeEventListener("input", calculateDuration);

            // Add new listeners
            startTime.addEventListener("change", calculateDuration);
            startTime.addEventListener("input", calculateDuration);
            console.log('✅ Start time listeners attached');
        }

        if (endTime) {
            // Remove existing listeners to avoid duplicates
            endTime.removeEventListener("change", calculateDuration);
            endTime.removeEventListener("input", calculateDuration);

            // Add new listeners
            endTime.addEventListener("change", calculateDuration);
            endTime.addEventListener("input", calculateDuration);
            console.log('✅ End time listeners attached');
        }

        // Calculate immediately
        setTimeout(calculateDuration, 100);

        console.log('✅ Auto calculations setup complete');
    }

    async validateForm() {
        const requiredFields = [
            'booking-date', 'booking-start', 'booking-end',
            'booking-plane'
        ];

        for (const fieldId of requiredFields) {
            const field = document.getElementById(fieldId);
            if (!field.value.trim()) {
                this.showValidationError(`Please fill in the ${field.labels[0]?.textContent || fieldId} field`);
                field.focus();
                return false;
            }
        }

        // Validate based on booking type
        if (this.currentBookingType === 'instruction') {
            // Validate instructor
            if (!document.getElementById("instructor-uuid").value) {
                this.showValidationError("Please select a valid instructor from the suggestions");
                document.getElementById("instructor-name").focus();
                return false;
            }

            // Validate at least student 1 is filled
            if (!document.getElementById("student1-uuid").value) {
                this.showValidationError("Please select at least one student (Student 1 is required)");
                document.getElementById("student1-name").focus();
                return false;
            }
        } else {
            // Validate regular booking - pilot
            if (!document.getElementById("pilot-uuid").value) {
                this.showValidationError("Please select a valid pilot from the suggestions");
                document.getElementById("pilot-name").focus();
                return false;
            }
        }

        // Validate times
        const startTime = document.getElementById("booking-start").value;
        const endTime = document.getElementById("booking-end").value;

        if (startTime >= endTime) {
            this.showValidationError("End time must be after start time");
            return false;
        }

        // Validate date is not in the past
        const bookingDate = new Date(document.getElementById("booking-date").value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (bookingDate < today) {
            this.showValidationError("Cannot create bookings in the past");
            return false;
        }

        // Validate maximum duration (e.g., 8 hours)
        const startDateTime = new Date(`${document.getElementById("booking-date").value}T${startTime}`);
        const endDateTime = new Date(`${document.getElementById("booking-date").value}T${endTime}`);
        const durationHours = (endDateTime - startDateTime) / (1000 * 60 * 60);

        if (durationHours > 8) {
            this.showValidationError("Booking duration cannot exceed 8 hours");
            return false;
        }

        // Check for overlapping bookings
        const planeId = document.getElementById("booking-plane").value;
        const overlappingBookings = await this.checkForOverlappingBookings(
            planeId,
            startDateTime.toISOString(),
            endDateTime.toISOString()
        );

        if (overlappingBookings) {
            this.showValidationError("This plane is already booked during the selected time period");
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

    async submitBooking() {
        if (!(await this.validateForm())) return;

        const loadingEl = document.getElementById("loading-state");
        const submitBtn = document.querySelector('button[type="submit"]');

        try {
            loadingEl.classList.remove("hidden");
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<div class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div><span>Creating...</span>';

            // Get date and time values
            const bookingDate = document.getElementById("booking-date").value;
            const startTime = document.getElementById("booking-start").value;
            const endTime = document.getElementById("booking-end").value;

            // Create Date objects in local timezone, then convert to ISO string (UTC)
            const startDateTime = new Date(`${bookingDate}T${startTime}`);
            const endDateTime = new Date(`${bookingDate}T${endTime}`);

            // Gather form data with proper UTC timestamps
            const formData = {
                start_time: startDateTime.toISOString(),
                end_time: endDateTime.toISOString(),
                plane_id: document.getElementById("booking-plane").value,
                description: document.getElementById("booking-desc").value || null,
                booking_type: this.currentBookingType
            };

            // Add personnel based on booking type
            if (this.currentBookingType === 'instruction') {
                formData.instructor_id = document.getElementById("instructor-uuid").value;
                formData.pilot_id = document.getElementById("student1-uuid").value;

                // Only set student2_id and student3_id if they have values
                const student2Id = document.getElementById("student2-uuid").value;
                const student3Id = document.getElementById("student3-uuid").value;
                formData.student2_id = student2Id || null;
                formData.student3_id = student3Id || null;
            } else {
                // Regular flight - pilot is the main person
                formData.pilot_id = document.getElementById("pilot-uuid").value;

                // Clear instruction-related fields for regular flights
                formData.instructor_id = null;
                formData.student2_id = null;
                formData.student3_id = null;
            }

            console.log('Submitting booking:', formData);

            // Submit to database
            const { data, error } = await supabase
                .from("bookings")
                .insert([formData])
                .select()
                .single();

            if (error) throw error;

            showToast('Booking created successfully!', 'success');
            this.close();

            if (this.onSuccessCallback) {
                this.onSuccessCallback(data);
            }

        } catch (error) {
            console.error('Error creating booking:', error);
            showToast('Error creating booking: ' + error.message, 'error');
        } finally {
            loadingEl.classList.add("hidden");
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg><span>Create Booking</span>';
        }
    }

    cleanupAutocompleteInstances() {
        // Destroy all autocomplete instances
        Object.values(this.autocompleteInstances).forEach(instance => {
            if (instance && typeof instance.destroy === 'function') {
                instance.destroy();
            }
        });
        this.autocompleteInstances = {};
    }

    resetForm() {
        const form = document.getElementById("booking-form");
        if (form) {
            form.reset();
        }

        // Clear hidden fields
        const hiddenFields = [
            "instructor-uuid", "student1-uuid", "student2-uuid",
            "student3-uuid", "pilot-uuid"
        ];

        hiddenFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = "";
            }
        });

        // Reset duration display
        const durationDisplay = document.getElementById("booking-duration-display");
        if (durationDisplay) {
            durationDisplay.textContent = "--:--";
        }

        // Reset booking type
        this.currentBookingType = 'instruction';
        this.switchBookingType('instruction');
        this.hideValidationError();

        // Clear autocomplete input fields
        const autocompleteFields = [
            'instructor-name', 'student1-name', 'student2-name',
            'student3-name', 'pilot-name'
        ];

        autocompleteFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = "";
            }
            // Clear the selected item in autocomplete instances
            if (this.autocompleteInstances[fieldId]) {
                this.autocompleteInstances[fieldId].clear();
            }
        });
    }

    initializeCustomPickers() {
        console.log('🎯 Initializing custom pickers...');

        // Clean up any existing instances first
        this.cleanupCustomPickers();

        // Wait for DOM to be fully ready and modal to be visible
        setTimeout(() => {
            const dateInput = document.getElementById("booking-date");
            if (dateInput && !this.datePickerInstance) {
                try {
                    this.datePickerInstance = new CustomDatePicker(dateInput);
                    console.log('✅ Date picker initialized');
                } catch (error) {
                    console.error('❌ Failed to initialize date picker:', error);
                }
            }

            const startTimeInput = document.getElementById("booking-start");
            if (startTimeInput && !this.timePickerInstances.start) {
                try {
                    this.timePickerInstances.start = new CustomTimePicker(startTimeInput);
                    console.log('✅ Start time picker initialized');
                } catch (error) {
                    console.error('❌ Failed to initialize start time picker:', error);
                }
            }

            const endTimeInput = document.getElementById("booking-end");
            if (endTimeInput && !this.timePickerInstances.end) {
                try {
                    this.timePickerInstances.end = new CustomTimePicker(endTimeInput);
                    console.log('✅ End time picker initialized');
                } catch (error) {
                    console.error('❌ Failed to initialize end time picker:', error);
                }
            }
        }, 250); // Increased delay to ensure DOM is ready
    }

    cleanupCustomPickers() {
        console.log('🧹 Cleaning up custom pickers...');

        // Remove any existing custom picker containers from DOM
        const customPickers = document.querySelectorAll('.custom-date-picker-container, .custom-time-picker-container');
        customPickers.forEach(picker => {
            if (picker.parentNode) {
                picker.parentNode.removeChild(picker);
            }
        });

        // Reset native input styles and make them visible again
        const dateInput = document.getElementById("booking-date");
        const startTimeInput = document.getElementById("booking-start");
        const endTimeInput = document.getElementById("booking-end");

        [dateInput, startTimeInput, endTimeInput].forEach(input => {
            if (input) {
                input.style.opacity = '';
                input.style.position = '';
                input.style.width = '';
                input.style.height = '';
                input.style.pointerEvents = '';
                input.removeAttribute('readonly');
            }
        });

        // Properly destroy custom picker instances
        if (this.datePickerInstance && typeof this.datePickerInstance.destroy === 'function') {
            this.datePickerInstance.destroy();
            this.datePickerInstance = null;
        }

        if (this.timePickerInstances.start && typeof this.timePickerInstances.start.destroy === 'function') {
            this.timePickerInstances.start.destroy();
            this.timePickerInstances.start = null;
        }

        if (this.timePickerInstances.end && typeof this.timePickerInstances.end.destroy === 'function') {
            this.timePickerInstances.end.destroy();
            this.timePickerInstances.end = null;
        }

        console.log('✅ Custom pickers cleaned up');
    }

    cleanup() {
        console.log('🧹 Cleaning up modal completely...');

        this.cleanupAutocompleteInstances();
        this.cleanupCustomPickers();
        this.removeEventListeners();

        // Reset all state
        this.isOpen = false;
        this.isInitialized = false;

        console.log('✅ Modal cleanup completed');
    }

    onClose(callback) {
        this.onCloseCallback = callback;
    }

    onSuccess(callback) {
        this.onSuccessCallback = callback;
    }

    async checkForOverlappingBookings(planeId, startTime, endTime) {
        try {
            const { data, error } = await supabase
                .from("bookings")
                .select("id")
                .eq("plane_id", planeId)
                .or(`and(start_time.lte.${startTime},end_time.gte.${startTime}),and(start_time.lte.${endTime},end_time.gte.${endTime}),and(start_time.gte.${startTime},end_time.lte.${endTime})`);

            if (error) throw error;
            return data && data.length > 0;
        } catch (error) {
            console.error("Error checking overlapping bookings:", error);
            return false;
        }
    }
}