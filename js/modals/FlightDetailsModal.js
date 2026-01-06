// ./modals/FlightDetailsModal.js
import { supabase } from "../supabase.js";
import { showToast } from "../components/showToast.js";
import { Autocomplete, setupPersonAutocomplete } from "../components/autocomplete.js";

export class FlightDetailsModal {
    constructor(config = {}) {
        console.log('🔧 FlightDetailsModal constructor called');

        // Static counter to track instances
        if (!FlightDetailsModal.instanceCount) {
            FlightDetailsModal.instanceCount = 0;
        }
        FlightDetailsModal.instanceCount++;

        // Check if there's already a modal before creating a new one
        const existingModals = document.querySelectorAll('#flight-details-modal');
        if (existingModals.length > 0) {
            existingModals.forEach(modal => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            });
        }

        this.modal = null;
        this.currentFlight = config.flight || null;

        // Data sources for Autocomplete
        this.planes = config.planes || [];
        this.students = config.students || [];
        this.instructors = config.instructors || [];
        // Combine people for easier autocomplete filtering
        this.allPeople = [...this.students, ...this.instructors];

        this.onEdit = config.onEdit || (() => { });
        this.onClose = config.onClose || (() => { });

        this.relatedData = null;
        this.eventListeners = [];
        this.isOpen = false;
        this.isEditing = false; // New state for Edit Mode
        this.autocompleteInstances = []; // Track active autocompletes to destroy them
        this.animationDuration = 300;
        this.config = config;

        // Add instance tracking
        this.instanceId = Date.now() + Math.random();

        this.createModal();
    }

    static cleanupAll() {
        const existingModals = document.querySelectorAll('#flight-details-modal');
        existingModals.forEach(modal => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        });
        FlightDetailsModal.instanceCount = 0;
    }

    show(flightData) {
        if (this.isOpen) return;

        this.currentFlight = flightData;
        this.isOpen = true;
        this.isEditing = false; // Reset to view mode on open

        if (!this.modal || !this.modal.parentNode) {
            this.createModal();
        }

        // Reset UI state
        this.updateHeaderButtons();
        this.showLoadingState();
        this.setupEventListeners();

        requestAnimationFrame(() => {
            if (this.modal && this.modal.parentNode) {
                this.modal.classList.remove('hidden');
                requestAnimationFrame(() => {
                    const modalContent = this.modal.querySelector('.bg-gray-900');
                    if (modalContent) {
                        modalContent.classList.remove("scale-95", "opacity-0");
                        modalContent.classList.add("scale-100", "opacity-100");
                    }
                    this.populateData(flightData);
                });
            }
        });
    }

    hide() {
        if (!this.modal || !this.isOpen) return;

        this.isOpen = false;

        // Clean up autocompletes if they exist
        this.destroyAutocompletes();

        const modalContent = this.modal.querySelector('.bg-gray-900');
        if (modalContent) {
            modalContent.classList.remove("scale-100", "opacity-100");
            modalContent.classList.add("scale-95", "opacity-0");
        }

        setTimeout(() => {
            this.destroy();
        }, this.animationDuration);
    }

    destroy() {
        this.cleanupEventListeners();
        this.destroyAutocompletes();

        if (this.modal && this.modal.parentNode) {
            this.modal.parentNode.removeChild(this.modal);
        }

        this.modal = null;
        this.currentFlight = null;
        this.relatedData = null;
        this.isOpen = false;

        if (FlightDetailsModal.instanceCount > 0) {
            FlightDetailsModal.instanceCount--;
        }
    }

    cleanupEventListeners() {
        this.eventListeners.forEach(({ element, event, handler }) => {
            if (element && element.removeEventListener) {
                element.removeEventListener(event, handler);
            }
        });
        this.eventListeners = [];
    }

    destroyAutocompletes() {
        this.autocompleteInstances.forEach(instance => {
            if (instance && typeof instance.destroy === 'function') {
                instance.destroy();
            }
        });
        this.autocompleteInstances = [];
    }

    createModal() {
        const existingModals = document.querySelectorAll('#flight-details-modal');
        existingModals.forEach(modal => modal.remove());

        if (this.modal && this.modal.parentNode) {
            this.modal.parentNode.removeChild(this.modal);
        }

        this.modal = document.createElement('div');
        this.modal.id = 'flight-details-modal';
        this.modal.className = 'hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm';
        this.modal.innerHTML = `
        <div class="bg-gray-900 p-6 rounded-xl w-full max-w-4xl shadow-lg max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-95 opacity-0 custom-scrollbar">
            <div class="flex justify-between items-center mb-6">
                <div class="flex items-center space-x-3">
                    <h2 class="text-2xl font-bold" id="flight-modal-title">Flight Details</h2>
                    <div id="flight-modal-loading-indicator" class="hidden flex items-center space-x-2">
                        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                        <span class="text-sm text-gray-400">Loading...</span>
                    </div>
                </div>
                <div class="flex items-center space-x-3">
                    <button id="edit-flight-btn" class="hidden px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm transition-colors">
                        Edit
                    </button>
                    <button id="close-flight-modal" class="text-gray-400 hover:text-white text-2xl transition-colors">
                        &times;
                    </button>
                </div>
            </div>

            <div id="flight-details-content">
                </div>

            <div class="flex justify-end space-x-2 mt-6 pt-4 border-t border-gray-700" id="modal-footer-actions">
                <button id="close-flight-details" class="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors">
                    Close
                </button>
            </div>
        </div>
        <style>
            .custom-scrollbar::-webkit-scrollbar { width: 8px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: #374151; border-radius: 4px; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #6B7280; border-radius: 4px; }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #9CA3AF; }
        </style>
    `;

        document.body.appendChild(this.modal);
    }

    setupEventListeners() {
        this.cleanupEventListeners();

        const closeModalBtn = this.modal.querySelector('#close-flight-modal');
        const closeDetailsBtn = this.modal.querySelector('#close-flight-details');
        const editBtn = this.modal.querySelector('#edit-flight-btn');

        if (!closeModalBtn || !closeDetailsBtn) return;

        const closeModalHandler = () => {
            if (this.onClose) this.onClose();
            this.hide();
        };

        const toggleEditHandler = () => {
            this.toggleEditMode();
        };

        const modalClickHandler = (e) => {
            if (e.target === this.modal) {
                if (this.onClose) this.onClose();
                this.hide();
            }
        };

        const keydownHandler = (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                // If editing, maybe just cancel edit? For now, close modal.
                if (this.onClose) this.onClose();
                this.hide();
            }
        };

        closeModalBtn.addEventListener('click', closeModalHandler);
        closeDetailsBtn.addEventListener('click', closeModalHandler);
        if (editBtn) editBtn.addEventListener('click', toggleEditHandler);
        this.modal.addEventListener('click', modalClickHandler);
        document.addEventListener('keydown', keydownHandler);

        this.eventListeners = [
            { element: closeModalBtn, event: 'click', handler: closeModalHandler },
            { element: closeDetailsBtn, event: 'click', handler: closeModalHandler },
            { element: editBtn, event: 'click', handler: toggleEditHandler },
            { element: this.modal, event: 'click', handler: modalClickHandler },
            { element: document, event: 'keydown', handler: keydownHandler }
        ];
    }

    updateHeaderButtons() {
        const editBtn = this.modal.querySelector('#edit-flight-btn');
        const title = this.modal.querySelector('#flight-modal-title');

        if (editBtn) {
            // Show edit button only if not currently editing and data is loaded
            if (this.isEditing) {
                editBtn.classList.add('hidden');
                title.textContent = 'Edit Flight';
                title.classList.add('text-blue-400');
            } else {
                editBtn.classList.remove('hidden');
                title.textContent = 'Flight Details';
                title.classList.remove('text-blue-400');
            }
        }
    }

    async populateData(flightData) {
        try {
            // If editing, render the form immediately without fetching related data again (we assume we have it)
            if (this.isEditing) {
                this.renderEditForm(flightData);
                return;
            }

            // Normal View Mode Loading
            this.showLoadingState();

            if (flightData.plane && (flightData.pilot || flightData.instructor)) {
                // Pre-loaded data logic
                this.relatedData = {
                    plane: flightData.plane,
                    instructor: flightData.instructor,
                    pilot: flightData.pilot
                };
            } else {
                await this.loadRelatedData(flightData);
            }

            const content = document.getElementById('flight-details-content');
            if (content) {
                content.style.opacity = '0';
                await new Promise(resolve => setTimeout(resolve, 50));

                content.innerHTML = this.generateFlightHTML(flightData, this.relatedData);

                content.style.opacity = '1';
                content.style.transition = 'opacity 0.3s ease';
            }

            this.hideLoadingState();
            this.updateHeaderButtons(); // Ensure button visibility is correct

        } catch (error) {
            console.error('❌ Error populating flight details:', error);
            this.showErrorState('Error loading flight details');
        }
    }

    toggleEditMode() {
        this.isEditing = !this.isEditing;
        this.populateData(this.currentFlight);
        this.updateHeaderButtons();
    }

    renderEditForm(flightData) {
        const content = document.getElementById('flight-details-content');
        const footer = document.getElementById('modal-footer-actions');

        // Hide standard close button in footer, we will add Save/Cancel
        if (footer) footer.innerHTML = '';

        // Prepare data for inputs
        const pilot = this.relatedData?.pilot;
        const instructor = this.relatedData?.instructor;
        const plane = this.relatedData?.plane;

        content.innerHTML = `
            <div class="space-y-6 animate-fade-in">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="bg-gray-800 p-4 rounded-lg border border-gray-700">
                        <label class="block text-sm font-medium text-gray-400 mb-1">Date</label>
                        <input type="date" id="edit-flight-date" 
                            class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            value="${flightData.flight_date ? flightData.flight_date.split('T')[0] : ''}">
                    </div>
                    
                    <div class="bg-gray-800 p-4 rounded-lg border border-gray-700 relative z-30">
                        <label class="block text-sm font-medium text-gray-400 mb-1">Aircraft</label>
                        <input type="text" id="edit-plane-search" 
                            class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="Search tail number..."
                            value="${plane ? plane.tail_number : ''}">
                        <input type="hidden" id="edit-plane-id" value="${flightData.plane_id || ''}">
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="bg-gray-800 p-4 rounded-lg border border-gray-700 relative z-20">
                        <label class="block text-sm font-medium text-yellow-400 mb-1">Pilot</label>
                        <input type="text" id="edit-pilot-search" 
                            class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-yellow-500 focus:outline-none"
                            placeholder="Search pilot..."
                            value="${pilot ? (pilot.first_name + ' ' + pilot.last_name) : ''}">
                        <input type="hidden" id="edit-pilot-uuid" value="${flightData.pilot_uuid || ''}">
                    </div>

                    <div class="bg-gray-800 p-4 rounded-lg border border-gray-700 relative z-20">
                        <label class="block text-sm font-medium text-purple-400 mb-1">Instructor</label>
                        <input type="text" id="edit-instructor-search" 
                            class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                            placeholder="Search instructor (optional)..."
                            value="${instructor ? (instructor.first_name + ' ' + instructor.last_name) : ''}">
                        <input type="hidden" id="edit-instructor-uuid" value="${flightData.instructor_uuid || ''}">
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="bg-gray-800 p-4 rounded-lg border border-gray-700">
                        <div class="grid grid-cols-2 gap-2">
                            <div>
                                <label class="block text-xs text-gray-400 mb-1">Dep</label>
                                <input type="text" id="edit-dep" class="w-full bg-gray-700 rounded px-2 py-1 uppercase" value="${flightData.departure_icao || ''}">
                            </div>
                            <div>
                                <label class="block text-xs text-gray-400 mb-1">Arr</label>
                                <input type="text" id="edit-arr" class="w-full bg-gray-700 rounded px-2 py-1 uppercase" value="${flightData.arrival_icao || ''}">
                            </div>
                        </div>
                    </div>
                    <div class="bg-gray-800 p-4 rounded-lg border border-gray-700">
                        <label class="block text-sm font-medium text-gray-400 mb-1">Duration</label>
                        <input type="number" step="0.1" id="edit-duration" 
                            class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                            value="${flightData.flight_duration || 0}">
                    </div>
                </div>

                <div class="flex justify-end space-x-3 pt-4 border-t border-gray-700">
                    <button id="cancel-edit-btn" class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors">
                        Cancel
                    </button>
                    <button id="save-edit-btn" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded transition-colors flex items-center">
                        <span class="mr-2">💾</span> Save Changes
                    </button>
                </div>
            </div>
        `;

        // Initialize functionality
        this.setupEditAutocompletes();
        this.setupEditActions();
    }

    setupEditAutocompletes() {
        this.destroyAutocompletes();

        // 1. Plane Autocomplete
        // Map planes to format expected by Autocomplete ({id, name, ...})
        const planeDataSource = this.planes.map(p => ({
            id: p.id,
            name: p.tail_number,
            model: p.model,
            status: p.status
        }));

        const planeInput = document.getElementById('edit-plane-search');
        const planeHidden = document.getElementById('edit-plane-id');

        if (planeInput) {
            const planeAC = new Autocomplete({
                inputElement: planeInput,
                dataSource: planeDataSource,
                displayField: 'name',
                valueField: 'id',
                additionalFields: ['model'],
                placeholder: 'Type tail number...',
                onSelect: (item) => {
                    if (planeHidden) planeHidden.value = item.id;
                },
                onInput: (val) => {
                    if (!val && planeHidden) planeHidden.value = '';
                }
            });
            this.autocompleteInstances.push(planeAC);
        }

        // 2. Pilot Autocomplete (using setupPersonAutocomplete helper)
        const pilotAC = setupPersonAutocomplete({
            inputId: 'edit-pilot-search',
            hiddenId: 'edit-pilot-uuid',
            peopleData: this.allPeople, // Contains students, instructors, etc.
            roleFilter: 'pilots', // Allow students, pilots, instructors
            onSelect: (item) => console.log('Selected Pilot:', item.name)
        });
        if (pilotAC) this.autocompleteInstances.push(pilotAC);

        // 3. Instructor Autocomplete
        const instructorAC = setupPersonAutocomplete({
            inputId: 'edit-instructor-search',
            hiddenId: 'edit-instructor-uuid',
            peopleData: this.allPeople,
            roleFilter: 'instructors', // Strict filter
            onSelect: (item) => console.log('Selected Instructor:', item.name)
        });
        if (instructorAC) this.autocompleteInstances.push(instructorAC);
    }

    setupEditActions() {
        const cancelBtn = document.getElementById('cancel-edit-btn');
        const saveBtn = document.getElementById('save-edit-btn');

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.isEditing = false;
                this.populateData(this.currentFlight); // Revert to view mode
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                await this.handleSaveChanges();
            });
        }
    }

    async handleSaveChanges() {
        // Collect data from inputs
        const updatedData = {
            ...this.currentFlight,
            flight_date: document.getElementById('edit-flight-date').value,
            plane_id: document.getElementById('edit-plane-id').value,
            pilot_uuid: document.getElementById('edit-pilot-uuid').value,
            instructor_uuid: document.getElementById('edit-instructor-uuid').value || null, // Optional
            departure_icao: document.getElementById('edit-dep').value.toUpperCase(),
            arrival_icao: document.getElementById('edit-arr').value.toUpperCase(),
            flight_duration: parseFloat(document.getElementById('edit-duration').value) || 0
        };

        // Basic validation
        if (!updatedData.plane_id || !updatedData.pilot_uuid) {
            showToast('Please select a valid Aircraft and Pilot', 'error');
            return;
        }

        const saveBtn = document.getElementById('save-edit-btn');
        const originalText = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div> Saving...`;

        try {
            // Call the callback provided in constructor
            if (this.onEdit) {
                await this.onEdit(updatedData);
            }

            // Update local state and revert to view
            this.currentFlight = updatedData;
            // We need to reload related data because IDs changed (plane/pilot names might be different)
            this.relatedData = null; // force reload
            this.isEditing = false;
            this.populateData(this.currentFlight);

            showToast('Flight updated successfully', 'success');

        } catch (error) {
            console.error('Save failed:', error);
            showToast('Failed to save changes', 'error');
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
        }
    }

    // ... (Existing helper methods like showLoadingState, hideLoadingState, loadRelatedData, etc.) ...
    showLoadingState() {
        const content = document.getElementById('flight-details-content');
        const headerIndicator = document.getElementById('flight-modal-loading-indicator');

        if (headerIndicator) headerIndicator.classList.remove('hidden');

        if (content) {
            content.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                <div class="text-lg text-gray-300">Loading flight details...</div>
            </div>`;
        }
    }

    hideLoadingState() {
        const headerIndicator = document.getElementById('flight-modal-loading-indicator');
        if (headerIndicator) headerIndicator.classList.add('hidden');
    }

    showErrorState(message) {
        const content = document.getElementById('flight-details-content');
        if (content) {
            content.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12">
                <div class="text-red-500 text-4xl mb-4">⚠️</div>
                <div class="text-lg text-gray-300 text-center">${message}</div>
                <button id="retry-flight-loading" class="mt-4 px-4 py-2 bg-blue-600 rounded hover:bg-blue-500">Retry</button>
            </div>`;
            const retryBtn = document.getElementById('retry-flight-loading');
            if (retryBtn) retryBtn.onclick = () => this.populateData(this.currentFlight);
        }
    }

    // Reuse existing loadRelatedData and fetchPersonByUserId exactly as they were
    async fetchPersonByUserId(userId) {
        if (!userId) return null;
        try {
            const { data: userRows, error: userError } = await supabase
                .schema('api').rpc('get_user_by_id', { user_uuid: userId });
            if (userError || !userRows || userRows.length === 0) return null;
            const user = userRows[0];
            if (!user.person_id) return null;
            let rpcName = '', paramName = '';
            switch (user.role) {
                case 'student': rpcName = 'get_student_by_id'; paramName = 'student_uuid'; break;
                case 'instructor': rpcName = 'get_instructor_by_id'; paramName = 'instructor_uuid'; break;
                case 'regular_pilot': rpcName = 'get_regular_pilot_by_id'; paramName = 'pilot_uuid'; break;
                case 'maintenance_technician': rpcName = 'get_maintenance_technician_by_id'; paramName = 'technician_uuid'; break;
                case 'other_person': rpcName = 'get_other_person_by_id'; paramName = 'person_uuid'; break;
                default: return null;
            }
            if (rpcName) {
                const { data: profileRows } = await supabase.schema('api').rpc(rpcName, { [paramName]: user.person_id });
                if (profileRows && profileRows.length > 0) return { ...profileRows[0], role: user.role };
            }
            return null;
        } catch (err) { return null; }
    }

    async loadRelatedData(flightData) {
        try {
            let planeData = null;
            if (flightData.plane_id) {
                const { data: planeRows } = await supabase.schema('api').rpc('get_plane_by_id', { plane_uuid: flightData.plane_id });
                planeData = planeRows?.[0] || null;
            }
            let pilotData = flightData.pilot_uuid ? await this.fetchPersonByUserId(flightData.pilot_uuid) : null;
            let instructorData = flightData.instructor_uuid ? await this.fetchPersonByUserId(flightData.instructor_uuid) : null;

            this.relatedData = { plane: planeData, instructor: instructorData, pilot: pilotData };
        } catch (error) {
            console.error('Error loading related data', error);
            this.relatedData = { plane: null, instructor: null, pilot: null };
        }
    }

    // Keeps the exact same HTML generation for the View Mode
    generateFlightHTML(flightData, relatedData) {
        const pilot = relatedData?.pilot;
        const instructor = relatedData?.instructor;
        const plane = relatedData?.plane;
        const dep = flightData.departure_icao || flightData.departure_iata || '???';
        const arr = flightData.arrival_icao || flightData.arrival_iata || '???';
        const touchAndGo = flightData.touch_and_go_and_full_lfmd_count ?? flightData.touch_and_go_and_full_LFMD_count ?? 0;

        return `
        <div class="space-y-6">
            <div class="bg-gray-800 p-4 rounded-lg">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="text-lg font-semibold">${flightData.type_of_flight} Flight</h3>
                        <p class="text-gray-400">${dep} → ${arr}</p>
                        <p class="text-gray-400 text-sm">${new Date(flightData.flight_date).toLocaleDateString()}</p>
                    </div>
                    <div class="text-right">
                        <div class="text-2xl font-bold text-blue-400">${flightData.flight_duration || 0}h</div>
                        <span class="px-2 py-1 rounded text-xs bg-blue-600">${flightData.type_of_flight}</span>
                    </div>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-gray-800 p-4 rounded-lg">
                    <h4 class="text-lg font-semibold mb-3 text-blue-400">Flight Information</h4>
                    <div class="space-y-2">
                        <div class="flex justify-between"><span class="text-gray-400">Date:</span><span>${new Date(flightData.flight_date).toLocaleDateString()}</span></div>
                        <div class="flex justify-between"><span class="text-gray-400">Route:</span><span class="font-medium">${dep} → ${arr}</span></div>
                         <div class="flex justify-between"><span class="text-gray-400">Times:</span><span>${new Date(flightData.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(flightData.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
                    </div>
                </div>
                <div class="bg-gray-800 p-4 rounded-lg">
                    <h4 class="text-lg font-semibold mb-3 text-green-400">Aircraft</h4>
                    <div class="space-y-2">
                        ${plane ? `
                        <div class="flex justify-between"><span class="text-gray-400">Tail Number:</span><span class="font-medium">${plane.tail_number}</span></div>
                        <div class="flex justify-between"><span class="text-gray-400">Status:</span><span class="px-2 py-1 rounded text-xs ${plane.status === 'available' ? 'bg-green-600' : 'bg-yellow-600'}">${plane.status}</span></div>
                        ` : '<div class="text-gray-400">Aircraft info not available</div>'}
                    </div>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-gray-800 p-4 rounded-lg">
                    <h4 class="text-lg font-semibold mb-3 text-yellow-400">Pilot</h4>
                    <div class="space-y-2">
                        ${pilot ? `
                        <div class="flex justify-between"><span class="text-gray-400">Name:</span><span class="font-medium">${pilot.first_name} ${pilot.last_name}</span></div>
                        <div class="flex justify-between"><span class="text-gray-400">Email:</span><span>${pilot.email}</span></div>
                        ` : '<div class="text-gray-400">Pilot info not found</div>'}
                    </div>
                </div>
                <div class="bg-gray-800 p-4 rounded-lg">
                    <h4 class="text-lg font-semibold mb-3 text-purple-400">Instructor</h4>
                    <div class="space-y-2">
                        ${instructor ? `
                        <div class="flex justify-between"><span class="text-gray-400">Name:</span><span class="font-medium">${instructor.first_name} ${instructor.last_name}</span></div>
                        ` : '<div class="text-gray-400">No instructor</div>'}
                    </div>
                </div>
            </div>
             <div class="bg-gray-800 p-4 rounded-lg">
                <h4 class="text-lg font-semibold mb-3 text-orange-400">Flight Operations</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="space-y-2">
                        <div class="flex justify-between"><span class="text-gray-400">Landings:</span><span class="font-medium">${flightData.landings_count || 0}</span></div>
                        <div class="flex justify-between"><span class="text-gray-400">Touch & Go:</span><span class="font-medium">${touchAndGo}</span></div>
                    </div>
                </div>
            </div>
        </div>
        `;
    }
}