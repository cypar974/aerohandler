// ./js/modals/EditBookingModal.js
import { supabase } from "../supabase.js";
import { CustomDatePicker } from "../components/customDatePicker.js";
import { CustomTimePicker } from "../components/customTimePicker.js";
import { showToast } from "../components/showToast.js";
import { DataSources } from "../components/data-sources.js";
import { Autocomplete } from "../components/autocomplete.js";
import { BookingCancelModal } from "./BookingCancelModal.js"

export class EditBookingModal {
    constructor(options = {}) {
        this.booking = options.booking || null;
        this.planes = options.planes || [];
        this.students = options.students || [];
        this.instructors = options.instructors || [];
        this.onSave = options.onSave || null;
        this.onClose = options.onClose || null;

        this.modal = null;
        this.bookingId = null;
        this.originalBooking = null;
        this.isLoading = false;

        // Form elements - initialize as null
        this.form = null;
        this.bookingTypeDisplay = null;
        this.planeSelect = null;

        // Autocomplete instances
        this.pilotAutocomplete = null;
        this.instructorAutocomplete = null;
        this.student2Autocomplete = null;
        this.student3Autocomplete = null;

        // Picker instances
        this.datePicker = null;
        this.startTimePicker = null;
        this.endTimePicker = null;

        // Data stores
        this.combinedPeople = [];

        // Callback
        this.onSuccessCallback = null;
    }

    async init() {
        await this.loadDataSources();
        this.createModal();
        this.setupEventListeners();
    }

    async loadDataSources() {
        try {
            // If data wasn't passed in constructor, load it
            if (this.planes.length === 0) {
                const { data: planesData, error: planesError } = await supabase
                    .from('planes')
                    .select('*')
                    .order('tail_number');

                if (planesError) throw planesError;
                this.planes = planesData || [];
            }

            // Load people data if needed
            if (this.students.length === 0 || this.instructors.length === 0) {
                this.students = await DataSources.loadStudents();
                this.instructors = await DataSources.loadInstructors();
            }

            this.combinedPeople = await DataSources.loadCombined();

        } catch (error) {
            console.error('Error loading data sources:', error);
            showToast('Error loading data: ' + error.message, 'error');
        }
    }

    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        this.modal.innerHTML = `
        <div class="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
            <div class="p-6 overflow-y-auto custom-scrollbar" style="max-height: calc(90vh - 2rem);">
                <!-- Header -->
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-xl font-bold text-white">Edit Booking</h2>
                    <button class="text-gray-400 hover:text-white transition-colors duration-200 close-modal">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <!-- Loading State -->
                <div id="edit-booking-loading" class="hidden">
                    <div class="flex items-center justify-center py-8">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        <span class="ml-3 text-white">Loading booking data...</span>
                    </div>
                </div>

                <!-- Form -->
                <form id="edit-booking-form" class="hidden space-y-6">
                    <!-- Booking Type Display -->
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Booking Type</label>
                        <div id="booking-type-display" class="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white font-medium">
                            <!-- Will be populated dynamically -->
                        </div>
                    </div>

                    <!-- Plane Selection -->
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Plane *</label>
                        <select id="plane-select" required
                            class="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 custom-select">
                            <option value="">Select a plane</option>
                        </select>
                    </div>

                    <!-- Pilot Selection -->
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Pilot *</label>
                        <input type="text" id="pilot-input" required
                            class="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            placeholder="Search for pilot...">
                    </div>

                    <!-- Instructor Section (for instruction bookings) -->
                    <div id="instructor-section" class="hidden">
                        <label class="block text-sm font-medium text-gray-300 mb-2">Instructor *</label>
                        <input type="text" id="instructor-input"
                            class="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            placeholder="Search for instructor...">
                    </div>

                    <!-- Additional Students Section (for instruction bookings) -->
                    <div id="students-section" class="hidden space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Additional Student 1</label>
                            <input type="text" id="student2-input"
                                class="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                placeholder="Search for student...">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Additional Student 2</label>
                            <input type="text" id="student3-input"
                                class="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                placeholder="Search for student...">
                        </div>
                    </div>

                    <!-- Date and Time -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Date *</label>
                            <input type="text" id="date-input" required readonly
                                class="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 cursor-pointer">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Start Time *</label>
                            <input type="text" id="start-time" required readonly
                                class="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 cursor-pointer">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">End Time *</label>
                            <input type="text" id="end-time" required readonly
                                class="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 cursor-pointer">
                        </div>
                    </div>

                    <!-- Description -->
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Description</label>
                        <textarea id="description" rows="3"
                            class="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none custom-scrollbar"
                            placeholder="Optional description..."></textarea>
                    </div>

                    <!-- Form Actions -->
                    <div class="flex justify-between pt-4 border-t border-gray-700">
                        <div>
                            <button type="button" id="cancel-booking-btn" class="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors duration-200 font-medium flex items-center space-x-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                </svg>
                                <span>Cancel Booking</span>
                            </button>
                        </div>
                        <div class="flex space-x-3">
                            <button type="button" class="px-6 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors duration-200 font-medium close-modal">
                                Close
                            </button>
                            <button type="submit" class="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors duration-200 font-medium">
                                Update Booking
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    `;

        document.body.appendChild(this.modal);
        this.addCustomStyles();
        this.cacheFormElements();
        this.initializeAutocompletes();
        this.initializeDateAndTimePickers();
    }

    addCustomStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .custom-scrollbar::-webkit-scrollbar {
                width: 6px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
                background: #374151;
                border-radius: 3px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
                background: #6B7280;
                border-radius: 3px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: #9CA3AF;
            }
            .custom-select {
                background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
                background-position: right 0.5rem center;
                background-repeat: no-repeat;
                background-size: 1.5em 1.5em;
                padding-right: 2.5rem;
                -webkit-appearance: none;
                -moz-appearance: none;
                appearance: none;
            }
            .custom-select:focus {
                background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2360a5fa' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
            }
        `;
        document.head.appendChild(style);
    }

    cacheFormElements() {
        this.form = this.modal.querySelector('#edit-booking-form');
        this.bookingTypeDisplay = this.modal.querySelector('#booking-type-display');
        this.planeSelect = this.modal.querySelector('#plane-select');
        this.dateInput = this.modal.querySelector('#date-input');
        this.startTimeInput = this.modal.querySelector('#start-time');
        this.endTimeInput = this.modal.querySelector('#end-time');
        this.descriptionTextarea = this.modal.querySelector('#description');
    }

    initializeAutocompletes() {
        // Pilot autocomplete (students + instructors)
        this.pilotAutocomplete = new Autocomplete({
            inputElement: this.modal.querySelector('#pilot-input'),
            dataSource: this.combinedPeople,
            displayField: 'name',
            valueField: 'id',
            additionalFields: ['email'],
            placeholder: 'Search for pilot (student or instructor)...',
            onSelect: (selected) => {
                console.log('Pilot selected:', selected);
            }
        });

        // Instructor autocomplete (instructors only)
        this.instructorAutocomplete = new Autocomplete({
            inputElement: this.modal.querySelector('#instructor-input'),
            dataSource: this.instructors,
            displayField: 'name',
            valueField: 'id',
            additionalFields: ['email'],
            placeholder: 'Search for instructor...',
            onSelect: (selected) => {
                console.log('Instructor selected:', selected);
            }
        });

        // Student autocompletes (students only)
        this.student2Autocomplete = new Autocomplete({
            inputElement: this.modal.querySelector('#student2-input'),
            dataSource: this.students,
            displayField: 'name',
            valueField: 'id',
            additionalFields: ['email'],
            placeholder: 'Search for student...',
            onSelect: (selected) => {
                this.validateNoDuplicateStudents();
            }
        });

        this.student3Autocomplete = new Autocomplete({
            inputElement: this.modal.querySelector('#student3-input'),
            dataSource: this.students,
            displayField: 'name',
            valueField: 'id',
            additionalFields: ['email'],
            placeholder: 'Search for student...',
            onSelect: (selected) => {
                this.validateNoDuplicateStudents();
            }
        });
    }

    initializeDateAndTimePickers() {
        // Single date picker for both start and end
        this.datePicker = new CustomDatePicker(this.dateInput);

        // Time pickers
        this.startTimePicker = new CustomTimePicker(this.startTimeInput);
        this.endTimePicker = new CustomTimePicker(this.endTimeInput);
    }

    setupEventListeners() {
        // Store reference to bound close function
        this.boundClose = this.close.bind(this);

        // Close modal events - use once if possible
        this.modal.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', this.boundClose);
        });

        // Form submission
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Cancel booking button
        const cancelBookingBtn = this.modal.querySelector('#cancel-booking-btn');
        if (cancelBookingBtn) {
            cancelBookingBtn.addEventListener('click', () => this.handleCancelBooking());
        }

        // Click outside to close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.boundClose();
            }
        });

        // ESC key to close - use once and check if modal still exists
        this.escHandler = (e) => {
            if (e.key === 'Escape' && this.modal && this.modal.parentNode) {
                this.boundClose();
            }
        };
        document.addEventListener('keydown', this.escHandler);
    }

    validateNoDuplicateStudents() {
        const student2 = this.student2Autocomplete.getSelectedItem();
        const student3 = this.student3Autocomplete.getSelectedItem();

        if (student2 && student3 && student2.id === student3.id) {
            showToast('Cannot select the same student twice', 'error');
            this.student3Autocomplete.clear();
        }
    }

    async render() {
        console.log('Rendering EditBookingModal');

        // If booking was passed in constructor, use it directly
        if (this.booking) {
            await this.init();
            this.bookingId = this.booking.id;
            this.originalBooking = this.booking;
            this.populateForm(this.booking);
            this.modal.querySelector('#edit-booking-loading').classList.add('hidden');
            this.form.classList.remove('hidden');
            return;
        }

        // Otherwise load by ID (backward compatibility)
        await this.init();

        if (this.bookingId) {
            this.modal.querySelector('#edit-booking-loading').classList.remove('hidden');
            this.form.classList.add('hidden');

            try {
                await this.loadBookingData(this.bookingId);
                this.modal.querySelector('#edit-booking-loading').classList.add('hidden');
                this.form.classList.remove('hidden');
            } catch (error) {
                console.error('Error loading booking:', error);
                showToast('Error loading booking: ' + error.message, 'error');
                this.close();
            }
        }
    }

    async loadBookingData(bookingId) {
        const { data: booking, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('id', bookingId)
            .single();

        if (error) throw error;

        this.originalBooking = booking;
        this.populateForm(booking);
    }

    populateForm(booking) {
        // Set booking type display
        const typeDisplay = booking.booking_type === 'instruction' ? 'Instruction Flight' : 'Regular Flight';
        const typeColor = booking.booking_type === 'instruction' ? 'bg-purple-600' : 'bg-green-600';
        this.bookingTypeDisplay.innerHTML = `
        <div class="flex items-center justify-between">
            <span>${typeDisplay}</span>
            <span class="px-2 py-1 text-xs rounded ${typeColor}">${booking.booking_type}</span>
        </div>
    `;

        // Populate plane select
        this.populatePlaneSelect(booking.plane_id);

        // Set date and time (auto-filled from booking)
        const startTime = new Date(booking.start_time);
        const endTime = new Date(booking.end_time);

        // Use the same date for both start and end (since flights are same-day)
        const dateString = startTime.toISOString().split('T')[0];
        const startTimeString = startTime.toTimeString().substring(0, 5);
        const endTimeString = endTime.toTimeString().substring(0, 5);

        // Use the new setValue methods to properly pre-fill and pre-select
        if (this.datePicker && typeof this.datePicker.setValue === 'function') {
            this.datePicker.setValue(dateString);
        } else {
            // Fallback
            this.dateInput.value = dateString;
            this.dateInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        if (this.startTimePicker && typeof this.startTimePicker.setValue === 'function') {
            this.startTimePicker.setValue(startTimeString);
        } else {
            // Fallback
            this.startTimeInput.value = startTimeString;
            this.startTimeInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        if (this.endTimePicker && typeof this.endTimePicker.setValue === 'function') {
            this.endTimePicker.setValue(endTimeString);
        } else {
            // Fallback
            this.endTimeInput.value = endTimeString;
            this.endTimeInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Set description
        this.descriptionTextarea.value = booking.description || '';

        // Set people based on booking type and show/hide appropriate sections
        if (booking.booking_type === 'instruction') {
            this.setPersonInAutocomplete(this.pilotAutocomplete, booking.pilot_id);
            this.setPersonInAutocomplete(this.instructorAutocomplete, booking.instructor_id);
            this.setPersonInAutocomplete(this.student2Autocomplete, booking.student2_id);
            this.setPersonInAutocomplete(this.student3Autocomplete, booking.student3_id);

            // Show instruction-specific fields
            this.showInstructionFields();
        } else {
            // Regular booking - only pilot
            this.setPersonInAutocomplete(this.pilotAutocomplete, booking.pilot_id);

            // Hide instruction-specific fields
            this.hideInstructionFields();
        }
    }

    populatePlaneSelect(selectedPlaneId) {
        this.planeSelect.innerHTML = '<option value="">Select a plane</option>';

        this.planes.forEach(plane => {
            const option = document.createElement('option');
            option.value = plane.id;
            option.textContent = plane.tail_number;
            option.selected = plane.id === selectedPlaneId;
            this.planeSelect.appendChild(option);
        });
    }

    setPersonInAutocomplete(autocomplete, personId) {
        if (!personId) {
            autocomplete.clear();
            return;
        }

        let person;
        if (autocomplete === this.instructorAutocomplete || autocomplete === this.student2Autocomplete || autocomplete === this.student3Autocomplete) {
            // For instructor and student fields, search in specific collections
            const source = autocomplete === this.instructorAutocomplete ? this.instructors : this.students;
            person = source.find(p => p.id === personId);
        } else {
            // For pilot, search in combined collection
            person = this.combinedPeople.find(p => p.id === personId);
        }

        if (person) {
            // CHANGED: Ensure we use the correct name field
            const displayName = person.name ||
                (person.first_name && person.last_name ? `${person.first_name} ${person.last_name}` :
                    person.full_name || '');

            autocomplete.inputElement.value = displayName;
            autocomplete.selectedItem = {
                id: person.id,
                value: displayName,
                rawItem: person
            };
        } else {
            autocomplete.clear();
        }
    }

    showInstructionFields() {
        this.modal.querySelector('#instructor-section').classList.remove('hidden');
        this.modal.querySelector('#students-section').classList.remove('hidden');
    }

    hideInstructionFields() {
        this.modal.querySelector('#instructor-section').classList.add('hidden');
        this.modal.querySelector('#students-section').classList.add('hidden');
    }

    async handleSubmit(e) {
        e.preventDefault();

        if (this.isLoading) return;

        // Validate form
        if (!this.validateForm()) {
            return;
        }

        this.isLoading = true;

        // Update button state
        const submitBtn = this.form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Updating...';
        submitBtn.disabled = true;

        try {
            const formData = this.getFormData();

            // Use the onSave callback if provided (new system)
            if (this.onSave) {
                await this.onSave(formData);
            } else {
                // Otherwise use the old system (backward compatibility)
                await this.updateBooking(formData);
                showToast('Booking updated successfully!', 'success');
                this.close();

                // Trigger success callback if exists
                if (this.onSuccessCallback) {
                    this.onSuccessCallback(formData);
                }

                // Trigger refresh for updates too
                const refreshEvent = new CustomEvent('refreshBookingsTable', {
                    detail: { action: 'updated', booking: this.originalBooking }
                });
                window.dispatchEvent(refreshEvent);
            }
        } catch (error) {
            console.error('Error updating booking:', error);
            showToast('Error updating booking: ' + error.message, 'error');
        } finally {
            this.isLoading = false;
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    validateForm() {
        // Basic required fields
        if (!this.planeSelect.value) {
            showToast('Please select a plane', 'error');
            return false;
        }

        if (!this.pilotAutocomplete.getSelectedItem()) {
            showToast('Please select a pilot', 'error');
            return false;
        }

        // Instruction-specific validation
        if (this.originalBooking.booking_type === 'instruction') {
            if (!this.instructorAutocomplete.getSelectedItem()) {
                showToast('Please select an instructor for instruction booking', 'error');
                return false;
            }
        }

        // Date and time validation
        if (!this.dateInput.value || !this.startTimeInput.value || !this.endTimeInput.value) {
            showToast('Please select date and times', 'error');
            return false;
        }

        const startDateTime = new Date(`${this.dateInput.value}T${this.startTimeInput.value}`);
        const endDateTime = new Date(`${this.dateInput.value}T${this.endTimeInput.value}`);

        if (endDateTime <= startDateTime) {
            showToast('End time must be after start time', 'error');
            return false;
        }

        const durationMinutes = (endDateTime - startDateTime) / (1000 * 60);
        if (durationMinutes < 10) {
            showToast('Booking duration must be at least 10 minutes', 'error');
            return false;
        }

        return true;
    }

    getFormData() {
        const startDateTime = new Date(`${this.dateInput.value}T${this.startTimeInput.value}`);
        const endDateTime = new Date(`${this.dateInput.value}T${this.endTimeInput.value}`);

        const formData = {
            plane_id: this.planeSelect.value,
            pilot_id: this.pilotAutocomplete.getSelectedItem().id,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            description: this.descriptionTextarea.value.trim() || null
        };

        // Add instruction-specific fields
        if (this.originalBooking.booking_type === 'instruction') {
            formData.instructor_id = this.instructorAutocomplete.getSelectedItem()?.id || null;
            formData.student2_id = this.student2Autocomplete.getSelectedItem()?.id || null;
            formData.student3_id = this.student3Autocomplete.getSelectedItem()?.id || null;
        }

        return formData;
    }

    async updateBooking(formData) {
        const { error } = await supabase
            .from('bookings')
            .update(formData)
            .eq('id', this.bookingId);

        if (error) throw error;
    }

    close() {
        // Only destroy if not already destroyed
        if (this.modal && this.modal.parentNode) {
            this.destroy();
        }

        if (this.onClose) {
            this.onClose();
        }
    }

    resetForm() {
        if (this.form) {
            this.form.reset();
        }

        // Clear autocompletes
        this.pilotAutocomplete?.clear();
        this.instructorAutocomplete?.clear();
        this.student2Autocomplete?.clear();
        this.student3Autocomplete?.clear();

        this.bookingId = null;
        this.originalBooking = null;
        this.isLoading = false;
    }

    onSuccess(callback) {
        this.onSuccessCallback = callback;
    }

    destroy() {
        console.log('EditBookingModal - Complete destruction');

        // Remove event listeners first
        if (this.modal) {
            this.modal.querySelectorAll('.close-modal').forEach(btn => {
                btn.removeEventListener('click', this.boundClose);
            });

            this.modal.removeEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.boundClose();
                }
            });
        }

        // Remove ESC handler
        if (this.escHandler) {
            document.removeEventListener('keydown', this.escHandler);
            this.escHandler = null;
        }

        // Clean up autocompletes
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

        // Clean up date/time pickers
        if (this.datePicker) {
            this.datePicker.destroy?.();
            this.datePicker = null;
        }
        if (this.startTimePicker) {
            this.startTimePicker.destroy?.();
            this.startTimePicker = null;
        }
        if (this.endTimePicker) {
            this.endTimePicker.destroy?.();
            this.endTimePicker = null;
        }

        // Remove modal from DOM
        if (this.modal && this.modal.parentNode) {
            this.modal.parentNode.removeChild(this.modal);
            this.modal = null;
        }

        // Remove custom styles
        const styles = document.querySelectorAll('style');
        styles.forEach(style => {
            if (style.textContent.includes('custom-scrollbar') || style.textContent.includes('custom-select')) {
                style.remove();
            }
        });

        // Clear data
        this.planes = [];
        this.students = [];
        this.instructors = [];
        this.combinedPeople = [];
        this.bookingId = null;
        this.originalBooking = null;
        this.isLoading = false;
        this.onSuccessCallback = null;
        this.boundClose = null;
    }

    // Backward compatibility method
    async show(bookingId) {
        this.bookingId = bookingId;
        await this.render();
    }

    handleCancelBooking() {
        if (!this.originalBooking) return;

        // Store the booking data before closing the modal
        const bookingToCancel = { ...this.originalBooking };

        // Close the edit modal first
        this.close();

        // Show the cancellation modal
        const cancelModal = new BookingCancelModal({
            booking: bookingToCancel,
            onConfirm: async (booking) => {
                try {
                    // Call the existing onCancel callback if provided
                    if (this.onCancel) {
                        await this.onCancel(booking);
                    } else {
                        // Otherwise use default cancellation logic
                        await this.cancelBooking(booking);
                    }
                    showToast('Booking cancelled successfully!', 'success');
                } catch (error) {
                    console.error('Error cancelling booking:', error);
                    showToast('Error cancelling booking: ' + error.message, 'error');
                    throw error; // Re-throw to let BookingCancelModal handle it
                }
            },
            onCancel: () => {
                // If user cancels the cancellation, reopen the edit modal
                if (this.booking) {
                    this.show(this.booking.id);
                }
            }
        });

        cancelModal.render();
    }

    async cancelBooking(booking) {
        const { error } = await supabase
            .from('bookings')
            .delete()
            .eq('id', booking.id);

        if (error) throw error;

        // Trigger success callback if exists
        if (this.onSuccessCallback) {
            this.onSuccessCallback({ cancelled: true, booking });
        }

        // Trigger a custom event to refresh the bookings table
        const refreshEvent = new CustomEvent('refreshBookingsTable', {
            detail: { action: 'cancelled', booking }
        });
        window.dispatchEvent(refreshEvent);
    }

    hide() {
        this.close();
    }
}