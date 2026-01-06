// ./components/modals/EditBookingModal.js
import { supabase } from "../supabase.js";
import { showToast } from "../components/showToast.js";
import { CustomDatePicker } from "../components/customDatePicker.js";
import { CustomTimePicker } from "../components/customTimePicker.js";
import { Autocomplete } from "../components/autocomplete.js";
import { BookingCancelModal } from "./BookingCancelModal.js";

export class EditBookingModal {
    constructor(config = {}) {
        console.log('🔧 EditBookingModal constructor called');

        // Static counter to track instances
        if (!EditBookingModal.instanceCount) EditBookingModal.instanceCount = 0;
        EditBookingModal.instanceCount++;

        this.cleanupExistingModals();

        // Config & State
        this.booking = config.booking || null;
        this.onClose = config.onClose || (() => { });
        this.onSave = config.onSave || null; // Optional override

        // Data Caches
        this.planes = config.planes || [];
        this.allUsers = []; // Will hold combined { id (user_uuid), name, role, email }

        this.modal = null;
        this.isOpen = false;

        // Form Components
        this.pilotAutocomplete = null;
        this.instructorAutocomplete = null;
        this.student2Autocomplete = null;
        this.student3Autocomplete = null;
        this.datePicker = null;
        this.startTimePicker = null;
        this.endTimePicker = null;

        this.createModal();
    }

    cleanupExistingModals() {
        const existing = document.querySelectorAll('#edit-booking-modal');
        existing.forEach(el => el.remove());
    }

    createModal() {
        this.modal = document.createElement('div');
        this.modal.id = 'edit-booking-modal';
        this.modal.className = 'hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm';

        this.modal.innerHTML = `
        <div class="bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col transform transition-all duration-300 scale-95 opacity-0">
            <div class="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-800">
                <h2 class="text-xl font-bold text-white flex items-center gap-2">
                    <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    Edit Booking
                </h2>
                <button id="close-edit-modal" class="text-gray-400 hover:text-white transition-colors">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>

            <div class="flex-1 overflow-y-auto custom-scrollbar relative min-h-[400px]">
                
                <div id="edit-loading-overlay" class="absolute inset-0 bg-gray-900 z-10 flex flex-col items-center justify-center p-8 transition-opacity duration-300">
                    <div class="relative mb-6">
                        <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
                        <div class="absolute inset-0 flex items-center justify-center">
                            <span id="loading-percent" class="text-sm font-bold text-blue-400">0%</span>
                        </div>
                    </div>
                    <div id="loading-text" class="text-lg text-gray-300 text-center mb-2">Preparing editor...</div>
                    <div class="w-64 bg-gray-700 rounded-full h-2 mb-4">
                        <div id="loading-bar" class="bg-blue-500 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
                    </div>
                </div>

                <form id="edit-booking-form" class="p-6 space-y-6 opacity-0 transition-opacity duration-500">
                    
                    <div id="booking-type-banner" class="p-3 rounded-lg font-medium text-center shadow-inner"></div>

                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Aircraft *</label>
                        <select id="edit-plane-select" required class="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all">
                            <option value="">Select an aircraft...</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Pilot in Command *</label>
                        <input type="text" id="edit-pilot-input" class="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Search pilot...">
                    </div>

                    <div id="edit-instructor-section" class="hidden animate-fade-in">
                        <label class="block text-sm font-medium text-gray-300 mb-2">Instructor *</label>
                        <input type="text" id="edit-instructor-input" class="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Search instructor...">
                    </div>

                    <div id="edit-students-section" class="hidden space-y-4 animate-fade-in">
                        <div class="p-4 bg-gray-800 rounded-lg border border-gray-700">
                            <h3 class="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Additional Students</h3>
                            <div class="space-y-4">
                                <div>
                                    <label class="block text-xs text-gray-500 mb-1">Student 2</label>
                                    <input type="text" id="edit-student2-input" class="w-full p-2.5 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:ring-2 focus:ring-blue-500" placeholder="Search student...">
                                </div>
                                <div>
                                    <label class="block text-xs text-gray-500 mb-1">Student 3</label>
                                    <input type="text" id="edit-student3-input" class="w-full p-2.5 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:ring-2 focus:ring-blue-500" placeholder="Search student...">
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Date *</label>
                            <input type="text" id="edit-date-input" required readonly class="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white cursor-pointer focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Start Time *</label>
                            <input type="text" id="edit-start-time" required readonly class="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white cursor-pointer focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">End Time *</label>
                            <input type="text" id="edit-end-time" required readonly class="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white cursor-pointer focus:ring-2 focus:ring-blue-500">
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Description</label>
                        <textarea id="edit-description" rows="3" class="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 custom-scrollbar focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none" placeholder="Flight details, route, lesson notes..."></textarea>
                    </div>
                </form>
            </div>

            <div id="edit-modal-footer" class="hidden p-6 border-t border-gray-700 bg-gray-800 flex justify-between items-center">
                <button type="button" id="btn-cancel-booking-action" class="px-4 py-2 text-red-400 hover:bg-red-900/30 hover:text-red-300 rounded-lg transition-colors flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    Cancel Booking
                </button>
                <div class="flex gap-3">
                    <button type="button" id="btn-close-edit" class="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium">
                        Discard Changes
                    </button>
                    <button type="button" id="btn-save-edit" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium shadow-lg shadow-blue-900/20 flex items-center gap-2">
                        <span>Save Changes</span>
                        <svg id="save-spinner" class="hidden w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    </button>
                </div>
            </div>
        </div>

        <style>
            .animate-fade-in { animation: fadeIn 0.3s ease-out; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
        </style>
        `;

        document.body.appendChild(this.modal);
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Modal Controls
        const close = () => this.hide();
        this.modal.querySelector('#close-edit-modal').addEventListener('click', close);
        this.modal.querySelector('#btn-close-edit').addEventListener('click', close);

        // Save
        this.modal.querySelector('#btn-save-edit').addEventListener('click', () => this.handleSave());

        // Cancel Booking (Delete)
        this.modal.querySelector('#btn-cancel-booking-action').addEventListener('click', () => this.handleCancelBooking());

        // Click Outside
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) close();
        });

        // ESC Key
        const escHandler = (e) => {
            if (e.key === 'Escape' && this.isOpen) close();
        };
        document.addEventListener('keydown', escHandler);
        this.escHandler = escHandler; // Store for cleanup
    }

    // =========================================================================
    // LOADING & INITIALIZATION
    // =========================================================================

    updateLoading(percent, message) {
        const overlay = this.modal.querySelector('#edit-loading-overlay');
        const bar = this.modal.querySelector('#loading-bar');
        const text = this.modal.querySelector('#loading-text');
        const percentText = this.modal.querySelector('#loading-percent');

        if (overlay && !overlay.classList.contains('hidden')) {
            bar.style.width = `${percent}%`;
            text.textContent = message;
            percentText.textContent = `${Math.round(percent)}%`;
        }
    }

    async render() {
        // FIX 1: Force remove any stuck Cancel Modals that might be blocking the screen
        const zombieModal = document.getElementById('booking-cancel-modal');
        if (zombieModal) zombieModal.remove();

        // FIX 2: Resurrect DOM if destroyed
        let isFreshDOM = false;
        if (!this.modal) {
            this.createModal();
            isFreshDOM = true;
        }

        if (this.isOpen) return;
        this.isOpen = true;

        // Animate In
        this.modal.classList.remove('hidden');
        requestAnimationFrame(() => {
            const content = this.modal.querySelector('.bg-gray-900');
            if (content) {
                content.classList.remove('scale-95', 'opacity-0');
                content.classList.add('scale-100', 'opacity-100');
            }
        });

        try {
            // Initialize if fresh DOM or if data was lost
            if (isFreshDOM || !this.pilotAutocomplete) {
                await this.initializeData();
            }
        } catch (error) {
            console.error('Error initializing edit modal:', error);
            showToast('Failed to load booking data', 'error');
            this.hide();
        }
    }

    async initializeData() {
        this.updateLoading(10, "Establishing connection...");

        try {
            // 1. Always Fetch Fleet to ensure we have model names from 
            // We removed the 'if (this.planes.length === 0)' check so we don't rely on incomplete parent data
            this.updateLoading(30, "Loading fleet data...");
            const { data: fleetData, error: fleetError } = await supabase
                .schema('api')
                .rpc('get_plane_fleet'); //

            if (fleetError) throw fleetError;
            this.planes = fleetData || [];

            // 2. Fetch All Users & Map them
            // We need to join users + person tables effectively, or use existing views
            // Since your SQL has a `, let's try to utilize the data we have
            this.updateLoading(50, "Fetching member directory...");
            await this.loadAndMapUsers();

            // 3. Prepare Form
            this.updateLoading(80, "Configuring editor...");

            // Initialize Pickers
            this.initializePickers();

            // Initialize Autocompletes
            this.initializeAutocompletes();

            // 4. Populate Data
            this.updateLoading(90, "Mapping booking details...");
            this.populateForm();

            // 5. Reveal Form
            await new Promise(r => setTimeout(r, 500)); // Smooth visual transition
            this.modal.querySelector('#edit-loading-overlay').classList.add('hidden'); // Hide overlay
            this.modal.querySelector('#edit-loading-overlay').classList.add('opacity-0');
            this.modal.querySelector('#edit-booking-form').classList.remove('opacity-0');

            // CHANGE: Reveal the footer now that loading is complete
            const footer = this.modal.querySelector('#edit-modal-footer');
            if (footer) {
                footer.classList.remove('hidden');
            }

        } catch (error) {
            console.error("Critical error in EditBookingModal:", error);
            throw error;
        }
    }

    async loadAndMapUsers() {
        // In the new SQL, 'users' table links Auth ID to Person ID.
        // We need a list that has: id (User UUID), name, role, email.

        // Strategy: Fetch 'users' and join with '' via person_id
        // Or simpler: Fetch  and find their User ID.

        // 1. Get all Users (Auth/Role map)
        const { data: usersData, error: usersError } = await supabase
            .schema('api').rpc('get_users');

        if (usersError) throw usersError;

        // 2. Get Person Details (Names)
        // FIX: Use secure RPC instead of view
        const { data: membersData, error: membersError } = await supabase.schema('api').rpc('get_members');

        if (membersError) throw membersError;

        // 3. Join them in JS
        this.allUsers = usersData.map(u => {
            const person = membersData.find(m => m.id === u.person_id);
            return {
                id: u.id, // This is the USER UUID (needed for bookings table)
                person_id: u.person_id,
                role: u.role,
                name: person ? `${person.first_name} ${person.last_name}` : 'Unknown',
                type: person ? person.type : u.role, // from view
                email: person ? person.email : null // View doesn't have email in some versions, but tables do. 
                // Use the user's email if view is missing it, 
                // though users table doesn't usually store email in new schema (auth does).
                // Assuming  might be updated or we use the name mostly.
            };
        }).filter(u => u.name !== 'Unknown'); // Filter out broken links

        console.log(`Mapped ${this.allUsers.length} users for autocomplete.`);
    }

    // =========================================================================
    // FORM SETUP
    // =========================================================================

    initializePickers() {
        this.datePicker = new CustomDatePicker(this.modal.querySelector('#edit-date-input'));
        this.startTimePicker = new CustomTimePicker(this.modal.querySelector('#edit-start-time'));
        this.endTimePicker = new CustomTimePicker(this.modal.querySelector('#edit-end-time'));
    }

    initializeAutocompletes() {
        // Pilot (Can be Student, Regular Pilot, Instructor)
        this.pilotAutocomplete = new Autocomplete({
            inputElement: this.modal.querySelector('#edit-pilot-input'),
            dataSource: this.allUsers,
            allowedTypes: ['student', 'regular_pilot', 'instructor'],
            displayField: 'name',
            valueField: 'id', // Storing User UUID
            placeholder: 'Search pilot...',
            onSelect: (item) => console.log('Selected Pilot:', item)
        });

        // Instructor (Strict)
        this.instructorAutocomplete = new Autocomplete({
            inputElement: this.modal.querySelector('#edit-instructor-input'),
            dataSource: this.allUsers,
            allowedTypes: ['instructor'],
            displayField: 'name',
            valueField: 'id',
            placeholder: 'Search instructor...',
        });

        // Students (Strict)
        this.student2Autocomplete = new Autocomplete({
            inputElement: this.modal.querySelector('#edit-student2-input'),
            dataSource: this.allUsers,
            allowedTypes: ['student'],
            displayField: 'name',
            valueField: 'id',
            placeholder: 'Search additional student...',
        });

        this.student3Autocomplete = new Autocomplete({
            inputElement: this.modal.querySelector('#edit-student3-input'),
            dataSource: this.allUsers,
            allowedTypes: ['student'],
            displayField: 'name',
            valueField: 'id',
            placeholder: 'Search additional student...',
        });
    }

    populateForm() {
        const b = this.booking;
        if (!b) return;

        // 1. Plane
        const planeSelect = this.modal.querySelector('#edit-plane-select');
        planeSelect.innerHTML = '<option value="">Select Aircraft</option>';
        this.planes.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `${p.tail_number} (${p.model_name || p.model || 'Unknown'})`;
            if (p.id === b.plane_id) opt.selected = true;
            planeSelect.appendChild(opt);
        });

        // 2. Dates
        const start = new Date(b.start_time);
        const end = new Date(b.end_time);

        // Helper to format HH:MM
        const timeStr = (d) => d.toTimeString().substring(0, 5);
        const dateStr = (d) => d.toISOString().split('T')[0];

        if (this.datePicker.setValue) this.datePicker.setValue(dateStr(start));
        else this.modal.querySelector('#edit-date-input').value = dateStr(start);

        if (this.startTimePicker.setValue) this.startTimePicker.setValue(timeStr(start));
        else this.modal.querySelector('#edit-start-time').value = timeStr(start);

        if (this.endTimePicker.setValue) this.endTimePicker.setValue(timeStr(end));
        else this.modal.querySelector('#edit-end-time').value = timeStr(end);

        // 3. Description
        this.modal.querySelector('#edit-description').value = b.description || '';

        // 4. Booking Type & People
        const typeBanner = this.modal.querySelector('#booking-type-banner');
        const instSection = this.modal.querySelector('#edit-instructor-section');
        const studSection = this.modal.querySelector('#edit-students-section');

        // Set Pilot (Common to both)
        this.setAutocompleteValue(this.pilotAutocomplete, b.pilot_id);

        if (b.booking_type === 'instruction') {
            typeBanner.textContent = 'Instruction Flight';
            typeBanner.className = 'p-3 rounded-lg font-bold text-center shadow-inner bg-purple-900/50 text-purple-200 border border-purple-700/50';

            instSection.classList.remove('hidden');
            studSection.classList.remove('hidden');

            this.setAutocompleteValue(this.instructorAutocomplete, b.instructor_id);
            this.setAutocompleteValue(this.student2Autocomplete, b.student2_id);
            this.setAutocompleteValue(this.student3Autocomplete, b.student3_id);
        } else {
            typeBanner.textContent = 'Regular Rental / Private Flight';
            typeBanner.className = 'p-3 rounded-lg font-bold text-center shadow-inner bg-green-900/50 text-green-200 border border-green-700/50';

            instSection.classList.add('hidden');
            studSection.classList.add('hidden');
        }
    }

    setAutocompleteValue(acInstance, userId) {
        if (!userId || !acInstance) return;
        const user = this.allUsers.find(u => u.id === userId);
        if (user) {
            acInstance.inputElement.value = user.name;
            acInstance.selectedItem = {
                id: user.id,
                value: user.name,
                rawItem: user
            };
        }
    }

    // =========================================================================
    // ACTIONS
    // =========================================================================

    async handleSave() {
        const btn = this.modal.querySelector('#btn-save-edit');
        const spinner = this.modal.querySelector('#save-spinner');

        try {
            // UI Loading State
            btn.disabled = true;
            btn.classList.add('opacity-75', 'cursor-not-allowed');
            spinner.classList.remove('hidden');

            // 1. Validate
            const payload = this.getFormData();
            if (!payload) throw new Error("Validation failed");

            // 2. Send Update via RPC
            // FIX: Removed fallback to direct table update. Only RPC is allowed.
            const { error } = await supabase.schema('api').rpc('update_booking', {
                booking_uuid: this.booking.id,
                payload: payload
            });

            if (error) throw error;

            showToast('Booking updated successfully', 'success');

            // 3. Callback & Cleanup
            if (this.onSave) this.onSave();

            // Refresh Events
            window.dispatchEvent(new CustomEvent('refreshBookingsTable'));
            window.dispatchEvent(new CustomEvent('bookingUpdated', { detail: { id: this.booking.id } }));

            this.hide();

        } catch (err) {
            if (err.message !== "Validation failed") {
                console.error(err);
                showToast(err.message || 'Error updating booking', 'error');
            }
        } finally {
            btn.disabled = false;
            btn.classList.remove('opacity-75', 'cursor-not-allowed');
            spinner.classList.add('hidden');
        }
    }

    getFormData() {
        const planeId = this.modal.querySelector('#edit-plane-select').value;
        const pilot = this.pilotAutocomplete.selectedItem;
        const date = this.modal.querySelector('#edit-date-input').value;
        const startTime = this.modal.querySelector('#edit-start-time').value;
        const endTime = this.modal.querySelector('#edit-end-time').value;
        const description = this.modal.querySelector('#edit-description').value;

        if (!planeId) { showToast('Please select an aircraft', 'error'); return null; }
        if (!pilot) { showToast('Please select a pilot', 'error'); return null; }
        if (!date || !startTime || !endTime) { showToast('Please check date and times', 'error'); return null; }

        const startISO = `${date}T${startTime}:00`;
        const endISO = `${date}T${endTime}:00`;

        if (new Date(endISO) <= new Date(startISO)) {
            showToast('End time must be after start time', 'error');
            return null;
        }

        const payload = {
            plane_id: planeId,
            pilot_id: pilot.id,
            start_time: new Date(startISO).toISOString(),
            end_time: new Date(endISO).toISOString(),
            description: description,
            booking_type: this.booking.booking_type // Preserve type
        };

        if (this.booking.booking_type === 'instruction') {
            const inst = this.instructorAutocomplete.selectedItem;
            if (!inst) { showToast('Instructor is required for instruction flights', 'error'); return null; }

            payload.instructor_id = inst.id;
            payload.student2_id = this.student2Autocomplete.selectedItem?.id || null;
            payload.student3_id = this.student3Autocomplete.selectedItem?.id || null;
        } else {
            // Nullify instruction fields if switching types (though UI prevents type switch here)
            payload.instructor_id = null;
            payload.student2_id = null;
            payload.student3_id = null;
        }

        return payload;
    }

    handleCancelBooking() {
        this.hide();
        const cancelModal = new BookingCancelModal({
            booking: this.booking,
            onConfirm: async () => {
                // The modal handles the API call
                window.dispatchEvent(new CustomEvent('refreshBookingsTable'));
            },
            onCancel: () => {
                // Re-open edit modal if they regret clicking cancel
                this.render();
            }
        });
        cancelModal.render();
    }

    hide() {
        if (!this.modal) return;
        this.isOpen = false;

        // Animate Out
        const content = this.modal.querySelector('.bg-gray-900');
        if (content) {
            content.classList.remove('scale-100', 'opacity-100');
            content.classList.add('scale-95', 'opacity-0');
        }

        setTimeout(() => {
            if (this.modal && this.modal.parentNode) {
                this.modal.parentNode.removeChild(this.modal);
            }
            this.destroy();
        }, 300);
    }

    destroy() {
        if (this.escHandler) document.removeEventListener('keydown', this.escHandler);

        // Cleanup components and NULL them out so render() knows to rebuild them
        if (this.pilotAutocomplete) {
            this.pilotAutocomplete.destroy();
            this.pilotAutocomplete = null;
        }
        if (this.instructorAutocomplete) {
            this.instructorAutocomplete.destroy();
            this.instructorAutocomplete = null;
        }
        if (this.student2Autocomplete) {
            this.student2Autocomplete.destroy();
            this.student2Autocomplete = null;
        }
        if (this.student3Autocomplete) {
            this.student3Autocomplete.destroy();
            this.student3Autocomplete = null;
        }

        // Pickers usually don't have destroy methods, but we must null the reference
        this.datePicker = null;
        this.startTimePicker = null;
        this.endTimePicker = null;

        this.modal = null;
        if (EditBookingModal.instanceCount > 0) EditBookingModal.instanceCount--;
    }
}