// ./js/modals/AddBookingModal.js
import { supabase } from "../supabase.js";
import { CustomDatePicker } from "../components/customDatePicker.js";
import { CustomTimePicker } from "../components/customTimePicker.js";
import { showToast } from "../components/showToast.js";
import { setupPersonAutocomplete } from "../components/autocomplete.js";
import { getMembers } from "../utils/memberData.js";

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
        this.combinedPersonnel = [];
        this.personToUserMap = {};
        this.currentBookingType = 'instruction';


        this.autocompleteInstances = {};


        this.handleModalClick = this.handleModalClick.bind(this);
        this.handleEscapeKey = this.handleEscapeKey.bind(this);
        this.handleFormSubmit = this.handleFormSubmit.bind(this);
        this.handleCancelClick = this.handleCancelClick.bind(this);
        this.handleTabSwitch = this.handleTabSwitch.bind(this);
    }

    /**
     * Initialize data fetching and basic setup.
     */
    async init() {
        if (this.isInitialized) return;

        try {
            await this.fetchData();
            this.render();
            this.attachEvents();
            this.isInitialized = true;
            console.log('AddBookingModal initialized successfully');
        } catch (error) {
            console.error('Failed to initialize AddBookingModal:', error);
            showToast('Failed to initialize booking form', 'error');
        }
    }

    /**
     * Fetches Planes and User Mappings.
     * Crucial: Maps Person IDs (from View) to User IDs (from Auth Table).
     */
    async fetchData() {
        try {
            console.log("🔄 Fetching modal data...");
            const roles = ['student', 'instructor', 'regular_pilot', 'maintenance_technician', 'other_person'];


            const [planesResponse, membersResponse, ...userResponses] = await Promise.all([
                supabase.schema('api').rpc('get_planes'),
                getMembers(),
                ...roles.map(role => supabase.schema('api').rpc('get_users_by_role', { user_role: role }))
            ]);

            if (planesResponse.error) throw planesResponse.error;
            if (membersResponse.error) throw membersResponse.error;

            this.planes = planesResponse.data || [];
            this.combinedPersonnel = membersResponse.data || [];


            this.personToUserMap = {};
            let mapCount = 0;

            userResponses.forEach(response => {
                if (response.data) {
                    response.data.forEach(u => {


                        if (u.person_id && u.id) {
                            this.personToUserMap[u.person_id] = u.id;
                            mapCount++;
                        }
                    });
                }
            });

            console.log(`✅ Data loaded. Mapped ${mapCount} users to persons.`);

        } catch (error) {
            console.error('❌ Error fetching modal data:', error);
            showToast('Error loading form data: ' + error.message, 'error');
        }
    }

    render() {
        if (this.modal && document.body.contains(this.modal)) {
            document.body.removeChild(this.modal);
        }

        this.modal = document.createElement('div');
        this.modal.id = "add-booking-modal";
        this.modal.className = "hidden fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm";
        this.modal.innerHTML = this.getModalHTML();
        document.body.appendChild(this.modal);
    }

    getModalHTML() {
        return `
            <div class="bg-gray-900 rounded-2xl w-full max-w-4xl shadow-2xl border border-gray-700 transform transition-all duration-300 scale-95 opacity-0 max-h-[90vh] flex flex-col">
                <div class="flex-shrink-0 flex items-center justify-between p-6 border-b border-gray-700">
                    <div class="flex items-center space-x-3">
                        <div class="p-2 bg-blue-600 rounded-lg">
                            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
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

                <div class="flex-1 overflow-y-auto">
                    <div class="p-6">
                        <form id="booking-form" class="space-y-6">
                            <div class="bg-gray-800 p-6 rounded-xl border border-gray-700">
                                <h2 class="text-xl font-semibold mb-4 text-blue-400">Schedule Information</h2>
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label class="block mb-2 text-sm font-medium text-gray-300">Booking Date *</label>
                                        <input type="date" id="booking-date" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white" required>
                                    </div>
                                    <div>
                                        <label class="block mb-2 text-sm font-medium text-gray-300">Start Time *</label>
                                        <input type="time" id="booking-start" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white" required>
                                    </div>
                                    <div>
                                        <label class="block mb-2 text-sm font-medium text-gray-300">End Time *</label>
                                        <input type="time" id="booking-end" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white" required>
                                    </div>
                                    <div class="md:col-span-3">
                                        <label class="block mb-2 text-sm font-medium text-gray-300">Calculated Duration</label>
                                        <div id="booking-duration-display" class="p-3 bg-gray-700 rounded border border-gray-600 text-yellow-400 font-mono text-lg">--:--</div>
                                    </div>
                                </div>
                            </div>

                            <div class="bg-gray-800 p-6 rounded-xl border border-gray-700">
                                <h2 class="text-xl font-semibold mb-4 text-green-400">Aircraft</h2>
                                <div>
                                    <label class="block mb-2 text-sm font-medium text-gray-300">Plane *</label>
                                    <select id="booking-plane" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white" required>
                                        <option value="">Select Plane</option>
                                    </select>
                                </div>
                            </div>

                            <div id="personnel-instruction" class="bg-gray-800 p-6 rounded-xl border border-gray-700">
                                <h2 class="text-xl font-semibold mb-4 text-purple-400">Personnel - Instruction</h2>
                                <div class="space-y-4">
                                    <div class="relative">
                                        <label class="block mb-2 text-sm font-medium text-gray-300">Instructor *</label>
                                        <input type="text" id="instructor-name" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white" placeholder="Type instructor name..." required autocomplete="off">
                                        <input type="hidden" id="instructor-uuid">
                                    </div>
                                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div class="relative">
                                            <label class="block mb-2 text-sm font-medium text-gray-300">Student 1 *</label>
                                            <input type="text" id="student1-name" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white" placeholder="Type student name..." required autocomplete="off">
                                            <input type="hidden" id="student1-uuid">
                                        </div>
                                        <div class="relative">
                                            <label class="block mb-2 text-sm font-medium text-gray-300">Student 2</label>
                                            <input type="text" id="student2-name" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white" placeholder="Type student name..." autocomplete="off">
                                            <input type="hidden" id="student2-uuid">
                                        </div>
                                        <div class="relative">
                                            <label class="block mb-2 text-sm font-medium text-gray-300">Student 3</label>
                                            <input type="text" id="student3-name" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white" placeholder="Type student name..." autocomplete="off">
                                            <input type="hidden" id="student3-uuid">
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div id="personnel-regular" class="bg-gray-800 p-6 rounded-xl border border-gray-700 hidden">
                                <h2 class="text-xl font-semibold mb-4 text-purple-400">Personnel - Regular</h2>
                                <div class="relative">
                                    <label class="block mb-2 text-sm font-medium text-gray-300">Pilot *</label>
                                    <input type="text" id="pilot-name" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white" placeholder="Type pilot name..." autocomplete="off">
                                    <input type="hidden" id="pilot-uuid">
                                </div>
                            </div>

                            <div class="bg-gray-800 p-6 rounded-xl border border-gray-700">
                                <h2 class="text-xl font-semibold mb-4 text-orange-400">Flight Details</h2>
                                <label class="block mb-2 text-sm font-medium text-gray-300">Flight Description</label>
                                <textarea id="booking-desc" rows="3" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white" placeholder="Enter purpose or instructions..."></textarea>
                            </div>

                            <div id="validation-messages" class="hidden p-4 bg-red-900/50 border border-red-700 rounded-lg">
                                <div class="flex items-center space-x-2 text-red-300">
                                    <span id="validation-text" class="text-sm"></span>
                                </div>
                            </div>

                            <div id="loading-state" class="hidden flex items-center justify-center space-x-2 py-4">
                                <div class="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                                <span class="text-gray-400">Creating booking...</span>
                            </div>
                        </form>
                    </div>

                    <div class="flex-shrink-0 flex justify-end space-x-3 p-6 border-t border-gray-700 bg-gray-800/50">
                        <button type="button" id="cancel-booking-btn" class="px-6 py-2.5 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700">Cancel</button>
                        <button type="submit" form="booking-form" class="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 flex items-center space-x-2">
                            <span>Create Booking</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    attachEvents() {
        this.removeEventListeners();

        this.modal.addEventListener('click', this.handleModalClick);
        document.addEventListener('keydown', this.handleEscapeKey);

        document.getElementById('cancel-booking-modal')?.addEventListener('click', this.handleCancelClick);
        document.getElementById('cancel-booking-btn')?.addEventListener('click', this.handleCancelClick);
        document.getElementById("booking-form")?.addEventListener("submit", this.handleFormSubmit);
        document.getElementById('tab-instruction')?.addEventListener('click', () => this.handleTabSwitch('instruction'));
        document.getElementById('tab-regular')?.addEventListener('click', () => this.handleTabSwitch('regular'));

        this.setupEventListeners();
        this.setupAutoCalculations();
    }

    setupEventListeners() {
        this.cleanupAutocompleteInstances();



        const commonConfig = { peopleData: this.combinedPersonnel };

        this.autocompleteInstances['instructor'] = setupPersonAutocomplete({ ...commonConfig, inputId: 'instructor-name', hiddenId: 'instructor-uuid', roleFilter: 'instructors' });
        this.autocompleteInstances['student1'] = setupPersonAutocomplete({ ...commonConfig, inputId: 'student1-name', hiddenId: 'student1-uuid', roleFilter: 'students' });
        this.autocompleteInstances['student2'] = setupPersonAutocomplete({ ...commonConfig, inputId: 'student2-name', hiddenId: 'student2-uuid', roleFilter: 'students' });
        this.autocompleteInstances['student3'] = setupPersonAutocomplete({ ...commonConfig, inputId: 'student3-name', hiddenId: 'student3-uuid', roleFilter: 'students' });
        this.autocompleteInstances['pilot'] = setupPersonAutocomplete({ ...commonConfig, inputId: 'pilot-name', hiddenId: 'pilot-uuid', roleFilter: 'pilots' });
    }

    cleanupAutocompleteInstances() {
        Object.values(this.autocompleteInstances).forEach(instance => {
            if (instance && typeof instance.destroy === 'function') instance.destroy();
        });
        this.autocompleteInstances = {};
    }

    setupAutoCalculations() {
        const calculateDuration = () => {
            const start = document.getElementById("booking-start")?.value;
            const end = document.getElementById("booking-end")?.value;
            const display = document.getElementById("booking-duration-display");

            if (!start || !end || !display) return;

            const [sH, sM] = start.split(':').map(Number);
            const [eH, eM] = end.split(':').map(Number);
            let mins = (eH * 60 + eM) - (sH * 60 + sM);
            if (mins < 0) mins += 1440;

            const h = Math.floor(mins / 60);
            const m = mins % 60;
            display.textContent = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} (${(mins / 60).toFixed(2)}h)`;
        };

        document.getElementById("booking-start")?.addEventListener("change", calculateDuration);
        document.getElementById("booking-end")?.addEventListener("change", calculateDuration);
        setTimeout(calculateDuration, 100);
    }

    handleModalClick(e) { if (e.target === this.modal) this.close(); }
    handleEscapeKey(e) { if (e.key === 'Escape' && this.isOpen) this.close(); }
    handleCancelClick() { this.close(); }
    handleTabSwitch(type) { this.switchBookingType(type); }

    handleFormSubmit(e) {
        e.preventDefault();
        this.submitBooking();
    }

    removeEventListeners() {
        if (this.modal) this.modal.removeEventListener('click', this.handleModalClick);
        document.removeEventListener('keydown', this.handleEscapeKey);
    }

    async show(params = {}) {
        if (this.isOpen) return;

        try {
            await this.init();
            this.resetForm();

            this.modal.classList.remove("hidden");
            this.isOpen = true;

            const modalContent = this.modal.querySelector('.bg-gray-900');
            setTimeout(() => {
                modalContent.classList.remove("scale-95", "opacity-0");
                modalContent.classList.add("scale-100", "opacity-100");
            }, 10);

            await this.loadDropdowns();
            this.setDefaultValues(params);

            setTimeout(() => {
                this.initializeCustomPickers();
                this.setupEventListeners();
            }, 200);

        } catch (error) {
            console.error('Error showing modal:', error);
            showToast(error.message, 'error');
        }
    }

    close() {
        if (!this.isOpen || !this.modal) return;
        this.isOpen = false;

        const modalContent = this.modal.querySelector('.bg-gray-900');
        if (modalContent) {
            modalContent.classList.remove("scale-100", "opacity-100");
            modalContent.classList.add("scale-95", "opacity-0");
        }

        setTimeout(() => {
            if (this.modal && this.modal.parentNode) this.modal.parentNode.removeChild(this.modal);
            this.modal = null;
            this.cleanup();
            if (this.onCloseCallback) this.onCloseCallback();
        }, 200);
    }

    switchBookingType(type) {
        this.currentBookingType = type;
        document.querySelectorAll('.booking-type-tab').forEach(tab => tab.classList.remove('booking-type-tab-active'));
        document.getElementById(`tab-${type}`)?.classList.add('booking-type-tab-active');

        const instrDiv = document.getElementById('personnel-instruction');
        const regDiv = document.getElementById('personnel-regular');

        if (type === 'instruction') {
            instrDiv?.classList.remove('hidden');
            regDiv?.classList.add('hidden');
            document.getElementById('instructor-name')?.setAttribute('required', 'true');
            document.getElementById('student1-name')?.setAttribute('required', 'true');
            document.getElementById('pilot-name')?.removeAttribute('required');
        } else {
            instrDiv?.classList.add('hidden');
            regDiv?.classList.remove('hidden');
            document.getElementById('pilot-name')?.setAttribute('required', 'true');
            document.getElementById('instructor-name')?.removeAttribute('required');
            document.getElementById('student1-name')?.removeAttribute('required');
        }
    }

    setDefaultValues(params = {}) {
        const now = new Date();
        document.getElementById("booking-date").value = now.toISOString().split('T')[0];

        const nextH = new Date(now); nextH.setHours(nextH.getHours() + 1, 0, 0, 0);
        const endH = new Date(nextH); endH.setHours(endH.getHours() + 2);

        document.getElementById("booking-start").value = nextH.toTimeString().slice(0, 5);
        document.getElementById("booking-end").value = endH.toTimeString().slice(0, 5);

        if (params.planeId) document.getElementById("booking-plane").value = params.planeId;

        if (params.personId) {
            const p = this.combinedPersonnel.find(x => x.id === params.personId);
            if (p) {
                const name = `${p.first_name} ${p.last_name}`;
                if (p.type === 'student') {
                    document.getElementById("student1-name").value = name;
                    document.getElementById("student1-uuid").value = p.id;
                } else if (p.type === 'instructor') {
                    document.getElementById("instructor-name").value = name;
                    document.getElementById("instructor-uuid").value = p.id;
                }

                document.getElementById("pilot-name").value = name;
                document.getElementById("pilot-uuid").value = p.id;
            }
        }
        this.switchBookingType('instruction');
    }

    async loadDropdowns() {
        try {
            const { data: models } = await supabase.schema('api').rpc('get_plane_models');
            const modelMap = {};
            if (models) models.forEach(m => modelMap[m.id] = m.model_name);

            const select = document.getElementById("booking-plane");
            select.innerHTML = '<option value="">Select Plane</option>';
            this.planes.forEach(p => {
                const name = modelMap[p.model_id] || 'Unknown';
                select.innerHTML += `<option value="${p.id}">${p.tail_number} - ${name}</option>`;
            });
        } catch (err) {
            console.error("Dropdown load failed", err);
        }
    }

    async validateForm() {
        const required = ['booking-date', 'booking-start', 'booking-end', 'booking-plane'];
        for (const id of required) {
            if (!document.getElementById(id).value.trim()) {
                this.showError(`Missing required field.`);
                return false;
            }
        }

        const start = document.getElementById("booking-start").value;
        const end = document.getElementById("booking-end").value;
        if (start >= end) { this.showError("End time must be after start time"); return false; }

        if (this.currentBookingType === 'instruction') {
            if (!document.getElementById("instructor-uuid").value) { this.showError("Please select an Instructor from the list."); return false; }
            if (!document.getElementById("student1-uuid").value) { this.showError("Please select Student 1 from the list."); return false; }
        } else {
            if (!document.getElementById("pilot-uuid").value) { this.showError("Please select a Pilot from the list."); return false; }
        }

        this.hideError();
        return true;
    }

    showError(msg) {
        const div = document.getElementById("validation-messages");
        document.getElementById("validation-text").textContent = msg;
        div.classList.remove("hidden");
    }
    hideError() { document.getElementById("validation-messages").classList.add("hidden"); }

    async submitBooking() {
        if (!(await this.validateForm())) return;
        this.hideError();

        const btn = document.querySelector('button[type="submit"]');
        const load = document.getElementById("loading-state");

        try {
            load.classList.remove("hidden");
            btn.disabled = true;

            const date = document.getElementById("booking-date").value;
            const startT = document.getElementById("booking-start").value;
            const endT = document.getElementById("booking-end").value;

            const { data: { user } } = await supabase.auth.getUser();


            const resolveUserId = (personId, roleLabel) => {
                if (!personId) return null;


                const userId = this.personToUserMap[personId];


                if (!userId) {
                    throw new Error(`The selected ${roleLabel} does not have an active User Account. Please ensure they are registered as a user.`);
                }
                return userId;
            };

            const payload = {
                start_time: new Date(`${date}T${startT}`).toISOString(),
                end_time: new Date(`${date}T${endT}`).toISOString(),
                plane_id: document.getElementById("booking-plane").value,
                description: document.getElementById("booking-desc").value || null,
                booking_type: this.currentBookingType,
                created_by: user?.id || null
            };

            if (this.currentBookingType === 'instruction') {
                payload.instructor_id = resolveUserId(document.getElementById("instructor-uuid").value, "Instructor");
                payload.pilot_id = resolveUserId(document.getElementById("student1-uuid").value, "Student 1");
                payload.student2_id = resolveUserId(document.getElementById("student2-uuid").value, "Student 2");
                payload.student3_id = resolveUserId(document.getElementById("student3-uuid").value, "Student 3");
            } else {
                payload.pilot_id = resolveUserId(document.getElementById("pilot-uuid").value, "Pilot");
                payload.instructor_id = null;
                payload.student2_id = null;
                payload.student3_id = null;
            }

            console.log('🚀 Submitting Payload:', payload);

            const { data, error } = await supabase.schema('api').rpc('insert_booking', { payload });
            if (error) throw error;

            this.close();
            if (this.onSuccessCallback) this.onSuccessCallback(data);

        } catch (error) {
            console.error('Submission Error:', error);

            this.showError(error.message);

            if (!error.message.includes("active User Account")) {
                showToast(error.message, 'error');
            }
        } finally {
            load.classList.add("hidden");
            btn.disabled = false;
        }
    }

    resetForm() {
        document.getElementById("booking-form")?.reset();
        ["instructor", "student1", "student2", "student3", "pilot"].forEach(k => {
            if (document.getElementById(`${k}-uuid`)) document.getElementById(`${k}-uuid`).value = "";
            if (document.getElementById(`${k}-name`)) document.getElementById(`${k}-name`).value = "";
        });
        const disp = document.getElementById("booking-duration-display");
        if (disp) disp.textContent = "--:--";
        this.switchBookingType('instruction');
        this.hideError();
    }

    initializeCustomPickers() {
        this.cleanupCustomPickers();
        setTimeout(() => {
            try {
                const d = document.getElementById("booking-date");
                if (d) this.datePickerInstance = new CustomDatePicker(d);

                const t1 = document.getElementById("booking-start");
                if (t1) this.timePickerInstances.start = new CustomTimePicker(t1);

                const t2 = document.getElementById("booking-end");
                if (t2) this.timePickerInstances.end = new CustomTimePicker(t2);
            } catch (e) { console.warn("Picker init warning", e); }
        }, 250);
    }

    cleanupCustomPickers() {

        document.querySelectorAll('.custom-date-picker-container, .custom-time-picker-container').forEach(e => e.remove());
        if (this.datePickerInstance?.destroy) this.datePickerInstance.destroy();
        if (this.timePickerInstances.start?.destroy) this.timePickerInstances.start.destroy();
        if (this.timePickerInstances.end?.destroy) this.timePickerInstances.end.destroy();

        ["booking-date", "booking-start", "booking-end"].forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.style.cssText = ''; el.removeAttribute('readonly'); }
        });
    }

    cleanup() {
        this.cleanupAutocompleteInstances();
        this.cleanupCustomPickers();
        this.removeEventListeners();
        this.isOpen = false;
        this.isInitialized = false;
    }

    onClose(cb) { this.onCloseCallback = cb; }
    onSuccess(cb) { this.onSuccessCallback = cb; }
}