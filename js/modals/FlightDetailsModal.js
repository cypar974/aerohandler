// ./modals/FlightDetailsModal.js
import { supabase } from "../supabase.js";
import { showToast } from "../components/showToast.js";

export class FlightDetailsModal {
    constructor(config = {}) {
        console.log('🔧 FlightDetailsModal constructor called');

        // Static counter to track instances
        if (!FlightDetailsModal.instanceCount) {
            FlightDetailsModal.instanceCount = 0;
        }
        FlightDetailsModal.instanceCount++;
        console.log('🔧 Modal instance count:', FlightDetailsModal.instanceCount);

        // Check if there's already a modal before creating a new one
        const existingModals = document.querySelectorAll('#flight-details-modal');
        if (existingModals.length > 0) {
            console.log('🔧 Found existing modals, removing them first');
            existingModals.forEach(modal => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            });
        }

        this.modal = null;
        this.currentFlight = config.flight || null;
        this.planes = config.planes || [];
        this.students = config.students || [];
        this.instructors = config.instructors || [];
        this.onEdit = config.onEdit || (() => { });
        this.onClose = config.onClose || (() => { });
        this.relatedData = null;
        this.eventListeners = [];
        this.isOpen = false;
        this.animationDuration = 300;
        this.config = config;

        // Add instance tracking
        this.instanceId = Date.now() + Math.random();
        console.log('🔧 Creating modal instance:', this.instanceId);

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

    // Update the show method to include a better initial state
    show(flightData) {
        // Prevent multiple instances more aggressively
        if (this.isOpen) {
            console.log('🔧 Modal already open, ignoring show call');
            return;
        }

        this.currentFlight = flightData;
        this.isOpen = true;

        // Ensure modal is in DOM before proceeding
        if (!this.modal || !this.modal.parentNode) {
            console.log('🔧 Modal not in DOM, recreating');
            this.createModal();
        }

        // Show loading state immediately when modal opens
        this.showLoadingState();

        this.setupEventListeners();

        // Trigger animation after DOM update
        requestAnimationFrame(() => {
            if (this.modal && this.modal.parentNode) {
                this.modal.classList.remove('hidden');
                requestAnimationFrame(() => {
                    const modalContent = this.modal.querySelector('.bg-gray-900');
                    if (modalContent) {
                        modalContent.classList.remove("scale-95", "opacity-0");
                        modalContent.classList.add("scale-100", "opacity-100");
                    }
                    console.log('🔧 Modal show animation complete');

                    // Now populate the data after the modal is visible
                    this.populateData(flightData);
                });
            }
        });
    }

    hide() {
        if (!this.modal) {
            console.log('🔧 Modal already destroyed, ignoring hide');
            return;
        }

        if (!this.isOpen) {
            console.log('🔧 Modal not open, ignoring hide');
            return;
        }

        console.log('🔧 Hiding modal');
        this.isOpen = false;

        // Animate out
        const modalContent = this.modal.querySelector('.bg-gray-900');
        if (modalContent) {
            modalContent.classList.remove("scale-100", "opacity-100");
            modalContent.classList.add("scale-95", "opacity-0");
        }

        // Remove from DOM after animation
        setTimeout(() => {
            this.destroy();
        }, this.animationDuration);
    }

    destroy() {
        console.log('🔧 Destroying modal instance:', this.instanceId);

        this.cleanupEventListeners();

        if (this.modal && this.modal.parentNode) {
            this.modal.parentNode.removeChild(this.modal);
        }

        this.modal = null;
        this.currentFlight = null;
        this.relatedData = null;
        this.isOpen = false;

        // Decrement instance count
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

    createModal() {
        console.log('🔧 createModal() called');

        const existingModals = document.querySelectorAll('#flight-details-modal');
        existingModals.forEach(modal => {
            if (modal.parentNode) {
                console.log('🔧 Removing duplicate modal in createModal');
                modal.parentNode.removeChild(modal);
            }
        });

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
                    <h2 class="text-2xl font-bold">Flight Details</h2>
                    <div id="flight-modal-loading-indicator" class="hidden flex items-center space-x-2">
                        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                        <span class="text-sm text-gray-400">Loading...</span>
                    </div>
                </div>
                <button id="close-flight-modal" class="text-gray-400 hover:text-white text-2xl transition-colors">
                    &times;
                </button>
            </div>

            <div id="flight-details-content">
                <!-- Content will be populated dynamically -->
            </div>

            <div class="flex justify-end space-x-2 mt-6 pt-4 border-t border-gray-700">
                <button id="close-flight-details" class="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors">
                    Close
                </button>
            </div>
        </div>

        <style>
            .custom-scrollbar::-webkit-scrollbar {
                width: 8px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
                background: #374151;
                border-radius: 4px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
                background: #6B7280;
                border-radius: 4px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: #9CA3AF;
            }
        </style>
    `;

        document.body.appendChild(this.modal);
        console.log('🔧 Modal created and appended to body');
    }

    setupEventListeners() {
        // Clean up any existing listeners first
        this.cleanupEventListeners();

        const closeModalBtn = this.modal.querySelector('#close-flight-modal');
        const closeDetailsBtn = this.modal.querySelector('#close-flight-details');

        if (!closeModalBtn || !closeDetailsBtn) {
            console.error('🔧 Close buttons not found in modal');
            return;
        }

        const closeModalHandler = () => {
            console.log('🔧 Close modal button clicked');
            if (this.onClose) {
                this.onClose();
            }
            this.hide();
        };

        const closeDetailsHandler = () => {
            console.log('🔧 Close details button clicked');
            if (this.onClose) {
                this.onClose();
            }
            this.hide();
        };

        const modalClickHandler = (e) => {
            if (e.target === this.modal) {
                console.log('🔧 Modal backdrop clicked');
                if (this.onClose) {
                    this.onClose();
                }
                this.hide();
            }
        };

        const keydownHandler = (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                console.log('🔧 Escape key pressed');
                if (this.onClose) {
                    this.onClose();
                }
                this.hide();
            }
        };

        // Add event listeners
        closeModalBtn.addEventListener('click', closeModalHandler);
        closeDetailsBtn.addEventListener('click', closeDetailsHandler);
        this.modal.addEventListener('click', modalClickHandler);
        document.addEventListener('keydown', keydownHandler);

        // Store for cleanup
        this.eventListeners = [
            { element: closeModalBtn, event: 'click', handler: closeModalHandler },
            { element: closeDetailsBtn, event: 'click', handler: closeDetailsHandler },
            { element: this.modal, event: 'click', handler: modalClickHandler },
            { element: document, event: 'keydown', handler: keydownHandler }
        ];

        console.log('🔧 Event listeners setup complete');
    }

    showErrorState(message) {
        const content = document.getElementById('flight-details-content');
        if (content) {
            content.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12">
                <div class="text-red-500 text-4xl mb-4">⚠️</div>
                <div class="text-lg text-gray-300 text-center">${message}</div>
                <div class="text-sm text-gray-500 mt-2">Please try again or contact support</div>
                <button id="retry-flight-loading" class="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded transition-colors">
                    Retry
                </button>
            </div>
        `;

            // Add retry functionality
            const retryBtn = document.getElementById('retry-flight-loading');
            if (retryBtn && this.currentFlight) {
                retryBtn.addEventListener('click', () => {
                    this.populateData(this.currentFlight);
                });
            }
        }
    }

    showLoadingState() {
        const content = document.getElementById('flight-details-content');
        const headerIndicator = document.getElementById('flight-modal-loading-indicator');

        if (headerIndicator) {
            headerIndicator.classList.remove('hidden');
        }

        if (content) {
            content.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                <div class="text-lg text-gray-300">Loading flight details...</div>
                <div class="text-sm text-gray-500 mt-2">Fetching flight information, aircraft details, and crew data</div>
                <div class="mt-4 w-64 bg-gray-700 rounded-full h-2">
                    <div class="bg-blue-500 h-2 rounded-full animate-pulse"></div>
                </div>
            </div>
        `;
        }
    }

    async populateData(flightData) {
        try {
            // Show initial loading state
            this.updateLoadingProgress(0, "Starting to load flight details...");

            // Check if we already have pre-loaded data
            if (flightData.plane && (flightData.pilot || flightData.instructor)) {
                console.log('🔧 Using pre-loaded data');
                this.updateLoadingProgress(50, "Processing pre-loaded data...");

                // Simulate progress for pre-loaded data
                await new Promise(resolve => setTimeout(resolve, 500));

                this.relatedData = {
                    plane: flightData.plane,
                    instructor: flightData.instructor,
                    pilot: flightData.pilot
                };

                this.updateLoadingProgress(100, "Finalizing display...");
                await new Promise(resolve => setTimeout(resolve, 300));

            } else {
                // Load data the standard way
                await this.loadRelatedData(flightData);
            }

            // Smooth transition to content
            const content = document.getElementById('flight-details-content');
            if (content) {
                content.style.opacity = '0.7';
                content.style.transition = 'opacity 0.4s ease';

                await new Promise(resolve => setTimeout(resolve, 200));

                content.innerHTML = this.generateFlightHTML(flightData, this.relatedData);

                await new Promise(resolve => setTimeout(resolve, 50));
                content.style.opacity = '1';
            }

            // Hide loading state
            this.hideLoadingState();

        } catch (error) {
            console.error('❌ Error populating flight details:', error);
            this.showErrorState('Error loading flight details');
            showToast('Error loading flight details', 'error');
        }
    }

    hideLoadingState() {
        const headerIndicator = document.getElementById('flight-modal-loading-indicator');
        if (headerIndicator) {
            headerIndicator.classList.add('hidden');
        }
    }

    async loadRelatedData(flightData) {
        try {
            console.log('🔧 Starting to load related data for flight:', flightData.id);

            // Initialize progress tracking
            let progress = 0;
            const totalSteps = 3; // plane, pilot, instructor
            const updateProgress = (step) => {
                progress = Math.min(100, (step / totalSteps) * 100);
                this.updateLoadingProgress(progress, this.getProgressMessage(step));
            };

            // Step 1: Load plane data
            updateProgress(1);
            console.log('🔧 Loading plane data...');
            const { data: planeData, error: planeError } = await supabase
                .from('planes')
                .select('*')
                .eq('id', flightData.plane_id)
                .single();

            if (planeError) {
                console.error('❌ Error loading plane:', planeError);
                throw new Error(`Failed to load aircraft: ${planeError.message}`);
            }

            if (!planeData) {
                console.warn('⚠️ No plane found for ID:', flightData.plane_id);
            }

            // Step 2: Load pilot data
            updateProgress(2);
            let pilotData = null;
            if (flightData.pilot_uuid) {
                console.log('🔧 Loading pilot data...');
                const { data: pilot, error: pilotError } = await supabase
                    .from('students')
                    .select('*')
                    .eq('id', flightData.pilot_uuid)
                    .single();

                if (pilotError) {
                    console.error('❌ Error loading pilot:', pilotError);
                    // Don't throw - pilot might not be critical
                } else {
                    pilotData = pilot;
                }
            }

            // Step 3: Load instructor data if present
            updateProgress(3);
            let instructorData = null;
            if (flightData.instructor_uuid) {
                console.log('🔧 Loading instructor data...');
                const { data: instructor, error: instructorError } = await supabase
                    .from('instructors')
                    .select('*')
                    .eq('id', flightData.instructor_uuid)
                    .single();

                if (instructorError) {
                    console.error('❌ Error loading instructor:', instructorError);
                    // Don't throw - instructor might not be critical
                } else {
                    instructorData = instructor;
                }
            }

            // Final progress update
            this.updateLoadingProgress(100, "Finalizing flight details...");

            // Compile all related data
            this.relatedData = {
                plane: planeData,
                instructor: instructorData,
                pilot: pilotData
            };

            console.log('✅ Successfully loaded related data:', {
                plane: planeData?.tail_number || 'None',
                instructor: instructorData ? `${instructorData.first_name} ${instructorData.last_name}` : 'None',
                pilot: pilotData ? `${pilotData.first_name} ${pilotData.last_name}` : 'None'
            });

        } catch (error) {
            console.error('❌ Critical error in loadRelatedData:', error);

            // Set fallback data structure
            this.relatedData = {
                plane: null,
                instructor: null,
                pilot: null
            };

            throw error; // Re-throw to be caught by populateData
        }
    }

    // Add helper methods for progress tracking
    getProgressMessage(step) {
        const messages = {
            1: "Loading aircraft information...",
            2: "Fetching pilot details...",
            3: "Loading instructor data..."
        };
        return messages[step] || "Loading flight details...";
    }

    updateLoadingProgress(percent, message) {
        const content = document.getElementById('flight-details-content');
        if (!content) return;

        content.innerHTML = `
        <div class="flex flex-col items-center justify-center py-12">
            <!-- Animated spinner -->
            <div class="relative mb-6">
                <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
                <div class="absolute inset-0 flex items-center justify-center">
                    <span class="text-sm font-bold text-blue-400">${Math.round(percent)}%</span>
                </div>
            </div>
            
            <!-- Progress message -->
            <div class="text-lg text-gray-300 text-center mb-2">${message}</div>
            <div class="text-sm text-gray-500 text-center mb-6">
                Preparing flight details for viewing
            </div>
            
            <!-- Progress bar -->
            <div class="w-80 bg-gray-700 rounded-full h-3 mb-2">
                <div 
                    class="bg-blue-500 h-3 rounded-full transition-all duration-500 ease-out"
                    style="width: ${percent}%"
                ></div>
            </div>
            
            <!-- Progress percentage -->
            <div class="text-xs text-gray-400">
                ${Math.round(percent)}% complete
            </div>
            
            <!-- Loading tips -->
            <div class="mt-8 text-xs text-gray-500 text-center max-w-md">
                <div class="animate-pulse">📋 Gathering flight information</div>
                <div class="mt-1 animate-pulse" style="animation-delay: 0.2s">✈️ Loading aircraft details</div>
                <div class="mt-1 animate-pulse" style="animation-delay: 0.4s">👨‍✈️ Fetching crew data</div>
            </div>
        </div>
    `;
    }

    generateFlightHTML(flightData, relatedData) {
        const pilot = relatedData?.pilot;
        const instructor = relatedData?.instructor;
        const plane = relatedData?.plane;

        return `
        <div class="space-y-6">
            <!-- Header Section -->
            <div class="bg-gray-800 p-4 rounded-lg">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="text-lg font-semibold">${flightData.type_of_flight} Flight</h3>
                        <p class="text-gray-400">${flightData.departure_iata} → ${flightData.arrival_iata}</p>
                        <p class="text-gray-400 text-sm">${new Date(flightData.flight_date).toLocaleDateString()}</p>
                    </div>
                    <div class="text-right">
                        <div class="text-2xl font-bold text-blue-400">
                            ${flightData.flight_duration || 0}h
                        </div>
                        <span class="px-2 py-1 rounded text-xs bg-blue-600">
                            ${flightData.type_of_flight}
                        </span>
                    </div>
                </div>
            </div>

            <!-- Flight Information -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Basic Flight Details -->
                <div class="bg-gray-800 p-4 rounded-lg">
                    <h4 class="text-lg font-semibold mb-3 text-blue-400">Flight Information</h4>
                    <div class="space-y-2">
                        <div class="flex justify-between">
                            <span class="text-gray-400">Date:</span>
                            <span>${new Date(flightData.flight_date).toLocaleDateString()}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Type:</span>
                            <span class="font-medium">${flightData.type_of_flight}</span>
                        </div>
                        ${flightData.nature_of_flight ? `
                        <div class="flex justify-between">
                            <span class="text-gray-400">Nature:</span>
                            <span>${flightData.nature_of_flight}</span>
                        </div>
                        ` : ''}
                        <div class="flex justify-between">
                            <span class="text-gray-400">Duration:</span>
                            <span class="font-bold text-blue-400">${flightData.flight_duration || 0}h</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Route:</span>
                            <span class="font-medium">${flightData.departure_iata} → ${flightData.arrival_iata}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Times:</span>
                            <span>${flightData.departure_time} - ${flightData.arrival_time}</span>
                        </div>
                    </div>
                </div>

                <!-- Aircraft Details -->
                <div class="bg-gray-800 p-4 rounded-lg">
                    <h4 class="text-lg font-semibold mb-3 text-green-400">Aircraft</h4>
                    <div class="space-y-2">
                        ${plane ? `
                        <div class="flex justify-between">
                            <span class="text-gray-400">Tail Number:</span>
                            <span class="font-medium">${plane.tail_number}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Model:</span>
                            <span>${plane.model}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Status:</span>
                            <span class="px-2 py-1 rounded text-xs ${plane.status === 'available' ? 'bg-green-600' : 'bg-yellow-600'}">
                                ${plane.status}
                            </span>
                        </div>
                        ` : `
                        <div class="text-gray-400">Aircraft information not available</div>
                        `}
                    </div>
                </div>
            </div>

            <!-- Personnel Information -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Pilot Information -->
                <div class="bg-gray-800 p-4 rounded-lg">
                    <h4 class="text-lg font-semibold mb-3 text-yellow-400">Pilot</h4>
                    <div class="space-y-2">
                        ${pilot ? `
                        <div class="flex justify-between">
                            <span class="text-gray-400">Name:</span>
                            <span class="font-medium">${pilot.first_name} ${pilot.last_name}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Email:</span>
                            <span>${pilot.email}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Total Hours:</span>
                            <span class="font-bold text-yellow-400">${pilot.total_hours || 0}h</span>
                        </div>
                        ${pilot.license_number ? `
                        <div class="flex justify-between">
                            <span class="text-gray-400">License:</span>
                            <span>${pilot.license_number}</span>
                        </div>
                        ` : ''}
                        ` : `
                        <div class="text-gray-400">Pilot: ${flightData.pilot_name}</div>
                        `}
                    </div>
                </div>

                <!-- Instructor Information -->
                <div class="bg-gray-800 p-4 rounded-lg">
                    <h4 class="text-lg font-semibold mb-3 text-purple-400">Instructor</h4>
                    <div class="space-y-2">
                        ${instructor ? `
                        <div class="flex justify-between">
                            <span class="text-gray-400">Name:</span>
                            <span class="font-medium">${instructor.first_name} ${instructor.last_name}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Email:</span>
                            <span>${instructor.email}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Total Hours:</span>
                            <span class="font-bold text-purple-400">${instructor.total_hours || 0}h</span>
                        </div>
                        ${instructor.ratings ? `
                        <div class="flex justify-between">
                            <span class="text-gray-400">Ratings:</span>
                            <span>${instructor.ratings}</span>
                        </div>
                        ` : ''}
                        ` : flightData.instructor_name ? `
                        <div class="text-gray-400">Instructor: ${flightData.instructor_name}</div>
                        ` : `
                        <div class="text-gray-400">No instructor</div>
                        `}
                    </div>
                </div>
            </div>

            <!-- Flight Operations -->
            <div class="bg-gray-800 p-4 rounded-lg">
                <h4 class="text-lg font-semibold mb-3 text-orange-400">Flight Operations</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="space-y-2">
                        <h5 class="font-medium text-gray-300">Landings & Operations</h5>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Landings:</span>
                            <span class="font-medium">${flightData.landings_count || 0}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Touch & Go:</span>
                            <span class="font-medium">${flightData.touch_and_go_and_full_LFMD_count || 0}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Captain Signature:</span>
                            <span class="px-2 py-1 rounded text-xs ${flightData.signature_captain ? 'bg-green-600' : 'bg-gray-600'}">
                                ${flightData.signature_captain ? 'Yes' : 'No'}
                            </span>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <h5 class="font-medium text-gray-300">Hour Meter</h5>
                        ${flightData.hour_meter_departure ? `
                        <div class="flex justify-between">
                            <span class="text-gray-400">Departure:</span>
                            <span>${flightData.hour_meter_departure}h</span>
                        </div>
                        ` : ''}
                        ${flightData.hour_meter_arrival ? `
                        <div class="flex justify-between">
                            <span class="text-gray-400">Arrival:</span>
                            <span>${flightData.hour_meter_arrival}h</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>

            <!-- Fuel & Oil -->
            <div class="bg-gray-800 p-4 rounded-lg">
                <h4 class="text-lg font-semibold mb-3 text-red-400">Fuel & Oil</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="space-y-2">
                        <h5 class="font-medium text-gray-300">Fuel Added</h5>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Departure:</span>
                            <span class="font-medium">${flightData.fuel_added_departure || 0}L</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Arrival:</span>
                            <span class="font-medium">${flightData.fuel_added_arrival || 0}L</span>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <h5 class="font-medium text-gray-300">Oil Added</h5>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Engine Oil:</span>
                            <span class="font-medium">${flightData.engine_oil_added || 0}L</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Notes & Observations -->
            ${flightData.remarks || flightData.incidents_or_observations ? `
            <div class="bg-gray-800 p-4 rounded-lg">
                <h4 class="text-lg font-semibold mb-3 text-gray-300">Notes & Observations</h4>
                <div class="space-y-3">
                    ${flightData.remarks ? `
                    <div>
                        <h5 class="font-medium text-gray-300 mb-1">Remarks:</h5>
                        <p class="text-gray-400 bg-gray-700 p-3 rounded">${flightData.remarks}</p>
                    </div>
                    ` : ''}
                    ${flightData.incidents_or_observations ? `
                    <div>
                        <h5 class="font-medium text-gray-300 mb-1">Incidents/Observations:</h5>
                        <p class="text-gray-400 bg-gray-700 p-3 rounded">${flightData.incidents_or_observations}</p>
                    </div>
                    ` : ''}
                </div>
            </div>
            ` : ''}

            <!-- System Information -->
            <div class="bg-gray-800 p-4 rounded-lg">
                <h4 class="text-lg font-semibold mb-3 text-gray-300">System Information</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="space-y-2">
                        <div class="flex justify-between">
                            <span class="text-gray-400">Logged by:</span>
                            <span>${flightData.logged_by_user || 'System'}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Created:</span>
                            <span>${new Date(flightData.created_at).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    render() {
        if (this.currentFlight && !this.isOpen) {
            console.log('🔧 render() called, showing modal');
            this.show(this.currentFlight);
        } else if (this.isOpen) {
            console.log('🔧 render() called but modal already open');
        } else {
            console.log('🔧 render() called but no flight data');
        }
    }
}