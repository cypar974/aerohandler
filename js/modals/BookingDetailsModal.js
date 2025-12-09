// ./components/modals/BookingDetailsModal.js
import { supabase } from "../supabase.js";
import { showToast } from "../components/showToast.js";

export class BookingDetailsModal {
    constructor(config = {}) {
        console.log('🔧 BookingDetailsModal constructor called');

        // Static counter to track instances
        if (!BookingDetailsModal.instanceCount) {
            BookingDetailsModal.instanceCount = 0;
        }
        BookingDetailsModal.instanceCount++;
        console.log('🔧 Modal instance count:', BookingDetailsModal.instanceCount);

        // Check if there's already a modal before creating a new one
        const existingModals = document.querySelectorAll('#booking-details-modal');
        if (existingModals.length > 0) {
            console.log('🔧 Found existing modals, removing them first');
            existingModals.forEach(modal => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            });
        }

        this.modal = null;
        this.currentBooking = config.booking || null;
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
        const existingModals = document.querySelectorAll('#booking-details-modal');
        existingModals.forEach(modal => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        });
        BookingDetailsModal.instanceCount = 0;
    }

    // Update the show method to include a better initial state
    show(bookingData) {
        // Prevent multiple instances more aggressively
        if (this.isOpen) {
            console.log('🔧 Modal already open, ignoring show call');
            return;
        }

        this.currentBooking = bookingData;
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
                    this.populateData(bookingData);
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
        this.currentBooking = null;
        this.relatedData = null;
        this.isOpen = false;

        // Decrement instance count
        if (BookingDetailsModal.instanceCount > 0) {
            BookingDetailsModal.instanceCount--;
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

        const existingModals = document.querySelectorAll('#booking-details-modal');
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
        this.modal.id = 'booking-details-modal';
        this.modal.className = 'hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm';
        this.modal.innerHTML = `
        <div class="bg-gray-900 p-6 rounded-xl w-full max-w-4xl shadow-lg max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-95 opacity-0 custom-scrollbar">
            <div class="flex justify-between items-center mb-6">
                <div class="flex items-center space-x-3">
                    <h2 class="text-2xl font-bold">Booking Details</h2>
                    <div id="modal-loading-indicator" class="hidden flex items-center space-x-2">
                        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                        <span class="text-sm text-gray-400">Loading...</span>
                    </div>
                </div>
                <button id="close-booking-modal" class="text-gray-400 hover:text-white text-2xl transition-colors">
                    &times;
                </button>
            </div>

            <div id="booking-details-content">
                <!-- Content will be populated dynamically -->
            </div>

            <div class="flex justify-end space-x-2 mt-6 pt-4 border-t border-gray-700">
                <button id="close-booking-details" class="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors">
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

        const closeModalBtn = this.modal.querySelector('#close-booking-modal');
        const closeDetailsBtn = this.modal.querySelector('#close-booking-details');

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
        const content = document.getElementById('booking-details-content');
        if (content) {
            content.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12">
                <div class="text-red-500 text-4xl mb-4">⚠️</div>
                <div class="text-lg text-gray-300 text-center">${message}</div>
                <div class="text-sm text-gray-500 mt-2">Please try again or contact support</div>
                <button id="retry-loading" class="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded transition-colors">
                    Retry
                </button>
            </div>
        `;

            // Add retry functionality
            const retryBtn = document.getElementById('retry-loading');
            if (retryBtn && this.currentBooking) {
                retryBtn.addEventListener('click', () => {
                    this.populateData(this.currentBooking);
                });
            }
        }
    }

    showLoadingState() {
        const content = document.getElementById('booking-details-content');
        const headerIndicator = document.getElementById('modal-loading-indicator');

        if (headerIndicator) {
            headerIndicator.classList.remove('hidden');
        }

        if (content) {
            content.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                <div class="text-lg text-gray-300">Loading booking details...</div>
                <div class="text-sm text-gray-500 mt-2">Fetching flight information, aircraft details, and crew data</div>
                <div class="mt-4 w-64 bg-gray-700 rounded-full h-2">
                    <div class="bg-blue-500 h-2 rounded-full animate-pulse"></div>
                </div>
            </div>
        `;
        }
    }


    async populateData(bookingData) {
        try {
            // Show initial loading state
            this.updateLoadingProgress(0, "Starting to load booking details...");

            // Check if we already have pre-loaded data
            if (bookingData.plane && (bookingData.students || bookingData.pilot)) {
                console.log('🔧 Using pre-loaded data');
                this.updateLoadingProgress(50, "Processing pre-loaded data...");

                // Simulate progress for pre-loaded data
                await new Promise(resolve => setTimeout(resolve, 500));

                this.relatedData = {
                    plane: bookingData.plane,
                    instructor: bookingData.instructor,
                    students: bookingData.students || [],
                    pilot: bookingData.pilot,
                    bookingType: bookingData.booking_type,
                    pilotType: bookingData.pilot_type || 'student'
                };

                this.updateLoadingProgress(100, "Finalizing display...");
                await new Promise(resolve => setTimeout(resolve, 300));

            } else {
                // Load data the standard way
                await this.loadRelatedData(bookingData);
            }

            // Smooth transition to content
            const content = document.getElementById('booking-details-content');
            if (content) {
                content.style.opacity = '0.7';
                content.style.transition = 'opacity 0.4s ease';

                await new Promise(resolve => setTimeout(resolve, 200));

                content.innerHTML = this.generateBookingHTML(bookingData, this.relatedData);

                await new Promise(resolve => setTimeout(resolve, 50));
                content.style.opacity = '1';
            }

            // Hide loading state
            this.hideLoadingState();

        } catch (error) {
            console.error('❌ Error populating booking details:', error);
            this.showErrorState('Error loading booking details');
            showToast('Error loading booking details', 'error');
        }
    }

    hideLoadingState() {
        const headerIndicator = document.getElementById('modal-loading-indicator');
        if (headerIndicator) {
            headerIndicator.classList.add('hidden');
        }
    }

    async loadRelatedData(bookingData) {
        try {
            console.log('🔧 Starting to load related data for booking:', bookingData.id);

            // Initialize progress tracking
            let progress = 0;
            const totalSteps = 4; // plane, pilot, instructor, students
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
                .eq('id', bookingData.plane_id)
                .single();

            if (planeError) {
                console.error('❌ Error loading plane:', planeError);
                throw new Error(`Failed to load aircraft: ${planeError.message}`);
            }

            if (!planeData) {
                console.warn('⚠️ No plane found for ID:', bookingData.plane_id);
            }

            // Step 2: Load instructor data if present
            updateProgress(2);
            let instructorData = null;
            if (bookingData.instructor_id) {
                console.log('🔧 Loading instructor data...');
                const { data: instructor, error: instructorError } = await supabase
                    .from('instructors')
                    .select('*')
                    .eq('id', bookingData.instructor_id)
                    .single();

                if (instructorError) {
                    console.error('❌ Error loading instructor:', instructorError);
                    // Don't throw - instructor might not be critical
                } else {
                    instructorData = instructor;
                    // CHANGED: Add name field for consistency
                    instructorData.name = `${instructor.first_name || ''} ${instructor.last_name || ''}`.trim();
                }
            }

            // Step 3: Load pilot data - handle both student and instructor pilots
            updateProgress(3);
            console.log('🔧 Loading pilot data...');
            let pilotData = null;

            if (bookingData.pilot_id) {
                // Strategy: Try instructors first (less common), then students
                const { data: instructorPilot, error: instructorError } = await supabase
                    .from('instructors')
                    .select('*')
                    .eq('id', bookingData.pilot_id)
                    .single();

                if (!instructorError && instructorPilot) {
                    pilotData = instructorPilot;
                    pilotData.type = 'instructor';
                    // CHANGED: Construct name from first_name + last_name
                    pilotData.name = `${instructorPilot.first_name || ''} ${instructorPilot.last_name || ''}`.trim();
                    console.log('🔧 Pilot is an instructor:', pilotData.name);
                } else {
                    // Try students table
                    const { data: studentPilot, error: studentError } = await supabase
                        .from('students')
                        .select('*')
                        .eq('id', bookingData.pilot_id)
                        .single();

                    if (!studentError && studentPilot) {
                        pilotData = studentPilot;
                        pilotData.type = 'student';
                        pilotData.name = `${studentPilot.first_name} ${studentPilot.last_name}`;
                        console.log('🔧 Pilot is a student:', pilotData.name);
                    } else {
                        console.warn('⚠️ No pilot found for ID:', bookingData.pilot_id);
                    }
                }
            }

            // Step 4: Load additional students for instruction flights
            updateProgress(4);
            console.log('🔧 Loading student data...');
            let studentsData = [];

            if (bookingData.booking_type === 'instruction') {
                console.log('🔧 Loading instruction flight students...');

                // For instruction flights, include all students (pilot + additional students)
                if (pilotData && pilotData.type === 'student') {
                    studentsData.push(pilotData);
                }

                // Load additional students (student2_id, student3_id)
                const additionalStudentIds = [
                    bookingData.student2_id,
                    bookingData.student3_id
                ].filter(Boolean);

                console.log('🔧 Additional student IDs:', additionalStudentIds);

                if (additionalStudentIds.length > 0) {
                    const { data: additionalStudents, error: studentsError } = await supabase
                        .from('students')
                        .select('*')
                        .in('id', additionalStudentIds);

                    if (studentsError) {
                        console.error('❌ Error loading additional students:', studentsError);
                        // Continue without additional students
                    } else if (additionalStudents) {
                        // CHANGED: Add name field to each student
                        const studentsWithNames = additionalStudents.map(student => ({
                            ...student,
                            name: `${student.first_name} ${student.last_name}`
                        }));
                        studentsData = [...studentsData, ...studentsWithNames];
                        console.log('🔧 Loaded additional students:', additionalStudents.length);
                    }
                }
            } else if (bookingData.booking_type === 'regular' && pilotData) {
                // For regular flights, include the pilot regardless of type
                studentsData.push(pilotData);
            }

            studentsData = studentsData.map(student => ({
                ...student,
                name: student.name || `${student.first_name} ${student.last_name}`
            }));

            // Final progress update
            this.updateLoadingProgress(100, "Finalizing booking details...");

            // Compile all related data
            this.relatedData = {
                plane: planeData,
                instructor: instructorData,
                students: studentsData,
                pilot: pilotData,
                pilotType: pilotData?.type || 'student',
                bookingType: bookingData.booking_type
            };

            console.log('✅ Successfully loaded related data:', {
                plane: planeData?.tail_number || 'None',
                instructor: instructorData?.first_name || 'None',
                students: studentsData.length,
                pilot: pilotData ? (pilotData.type === 'instructor' ? pilotData.first_name : `${pilotData.first_name} ${pilotData.last_name}`) : 'None',
                bookingType: bookingData.booking_type
            });

        } catch (error) {
            console.error('❌ Critical error in loadRelatedData:', error);

            // Set fallback data structure
            this.relatedData = {
                plane: null,
                instructor: null,
                students: [],
                pilot: null,
                pilotType: 'student',
                bookingType: bookingData.booking_type
            };

            throw error; // Re-throw to be caught by populateData
        }
    }

    // Add helper methods for progress tracking
    getProgressMessage(step) {
        const messages = {
            1: "Loading aircraft information...",
            2: "Fetching instructor details...",
            3: "Loading pilot data...",
            4: "Gathering student information..."
        };
        return messages[step] || "Loading booking details...";
    }

    updateLoadingProgress(percent, message) {
        const content = document.getElementById('booking-details-content');
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

    generateBookingHTML(bookingData, relatedData) {
        const plane = relatedData?.plane;
        const instructor = relatedData?.instructor;
        const students = relatedData?.students || [];
        const bookingType = relatedData?.bookingType || 'instruction';

        const startTime = new Date(bookingData.start_time);
        const endTime = new Date(bookingData.end_time);
        const duration = (endTime - startTime) / (1000 * 60 * 60); // hours

        return `
    <div class="space-y-6">
        <!-- Header Section -->
        <div class="bg-gray-800 p-4 rounded-lg">
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="text-lg font-semibold">Flight Booking</h3>
                    <p class="text-gray-400">
                        ${startTime.toLocaleDateString()} • 
                        ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                        ${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
                <div class="text-right">
                    <div class="text-2xl font-bold text-blue-400">${duration.toFixed(1)}h</div>
                    <span class="px-2 py-1 rounded text-xs bg-blue-600">Booking</span>
                </div>
            </div>
        </div>

        <!-- Booking Information -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Time & Duration -->
            <div class="bg-gray-800 p-4 rounded-lg">
                <h4 class="text-lg font-semibold mb-3 text-blue-400">Time Information</h4>
                <div class="space-y-2">
                    <div class="flex justify-between">
                        <span class="text-gray-400">Date:</span>
                        <span>${startTime.toLocaleDateString()}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-400">Start Time:</span>
                        <span class="font-medium">
                            ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-400">End Time:</span>
                        <span class="font-medium">
                            ${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-400">Duration:</span>
                        <span class="font-bold text-blue-400">${duration.toFixed(1)} hours</span>
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
                    ` : `<div class="text-gray-400">Aircraft information not available</div>`}
                </div>
            </div>
        </div>

        <!-- Pilot Information for Regular Flights -->
        ${bookingType === 'regular' ? `
        <div class="bg-gray-800 p-4 rounded-lg">
            <h4 class="text-lg font-semibold mb-4 text-yellow-400">Pilot Information</h4>
            ${students.length > 0 ? `
            <div class="overflow-x-auto pb-4">
                <div class="flex space-x-4 min-w-max">
                    ${students.map((person) => {
            const isInstructor = person.type === 'instructor' || person.license_number?.includes('CFI'); // Adjust based on your data structure
            return `
                <div class="bg-gray-700 p-4 rounded-lg min-w-[280px] flex-shrink-0 shadow-lg">
                    <div class="flex justify-between items-center mb-3">
                        <span class="font-medium text-white">${isInstructor ? person.full_name : `${person.first_name} ${person.last_name}`}</span>
                        <span class="px-2 py-1 rounded text-xs ${isInstructor ? 'bg-purple-600' : 'bg-blue-600'}">
                            ${isInstructor ? 'Instructor Pilot' : 'Student Pilot'}
                        </span>
                    </div>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-400">Email:</span>
                            <span class="text-white">${person.email || 'N/A'}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Total Hours:</span>
                            <span class="font-bold text-yellow-400">${person.total_hours || 0}h</span>
                        </div>
                        ${person.license_number ? `
                        <div class="flex justify-between">
                            <span class="text-gray-400">License:</span>
                            <span class="text-white">${person.license_number}</span>
                        </div>` : ''}
                        ${person.ratings ? `
                        <div class="flex justify-between">
                            <span class="text-gray-400">Ratings:</span>
                            <span class="text-white">${person.ratings}</span>
                        </div>` : ''}
                    </div>
                </div>`;
        }).join('')}
                </div>
            </div>
            ` : `
            <div class="text-gray-400 text-center py-4">No pilot assigned</div>
            `}
        </div>
        ` : ''}

        <!-- Students & Instructor Information for Instruction Flights -->
        ${bookingType === 'instruction' ? `
        <!-- Students Section -->
        <div class="bg-gray-800 p-4 rounded-lg">
            <h4 class="text-lg font-semibold mb-4 text-yellow-400">
                Students
                ${students.length > 0 ? ` (${students.length})` : ''}
            </h4>
            
            ${students.length > 0 ? `
            <div class="overflow-x-auto pb-4">
                <div class="flex space-x-4 min-w-max">
                    ${students.map((person, index) => {
            return `
                        <div class="bg-gray-700 p-4 rounded-lg min-w-[280px] flex-shrink-0 shadow-lg">
                            <div class="flex justify-between items-center mb-3">
                                <span class="font-medium text-white">${person.first_name} ${person.last_name}</span>
                                <span class="px-2 py-1 rounded text-xs ${index === 0 ? 'bg-blue-600' : 'bg-gray-600'}">
                                    ${index === 0 ? 'Primary Student' : 'Student'}
                                </span>
                            </div>
                            <div class="space-y-2 text-sm">
                                <div class="flex justify-between">
                                    <span class="text-gray-400">Email:</span>
                                    <span class="text-white">${person.email || 'N/A'}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-400">Total Hours:</span>
                                    <span class="font-bold text-yellow-400">${person.total_hours || 0}h</span>
                                </div>
                                ${person.license_number ? `
                                <div class="flex justify-between">
                                    <span class="text-gray-400">License:</span>
                                    <span class="text-white">${person.license_number}</span>
                                </div>` : ''}
                                ${person.ratings ? `
                                <div class="flex justify-between">
                                    <span class="text-gray-400">Ratings:</span>
                                    <span class="text-white">${person.ratings}</span>
                                </div>` : ''}
                            </div>
                        </div>`;
        }).join('')}
                </div>
            </div>
            ` : `
            <div class="text-gray-400 text-center py-4">No students assigned</div>
            `}
        </div>

        <!-- Instructor Section -->
            ${instructor ? `
            <div class="bg-gray-800 p-4 rounded-lg">
                <h4 class="text-lg font-semibold mb-4 text-purple-400">Instructor</h4>
                <div class="bg-gray-700 p-4 rounded-lg shadow-lg">
                    <div class="flex justify-between items-center mb-3">
                        <span class="font-medium text-white">${instructor.name}</span>
                        <span class="px-2 py-1 rounded text-xs bg-purple-600">Instructor</span>
                    </div>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-400">Email:</span>
                            <span class="text-white">${instructor.email || 'N/A'}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Total Hours:</span>
                            <span class="font-bold text-purple-400">${instructor.total_hours || 0}h</span>
                        </div>
                        ${instructor.ratings ? `
                        <div class="flex justify-between">
                            <span class="text-gray-400">Ratings:</span>
                            <span class="text-white">${instructor.ratings}</span>
                        </div>` : ''}
                    </div>
                </div>
            </div>
            ` : ''}

        ` : ''}

        <!-- Description -->
        ${bookingData.description ? `
        <div class="bg-gray-800 p-4 rounded-lg">
            <h4 class="text-lg font-semibold mb-3 text-gray-300">Description</h4>
            <p class="text-gray-400 bg-gray-700 p-3 rounded">${bookingData.description}</p>
        </div>
        ` : ''}

        <!-- Booking Type -->
        <div class="bg-gray-800 p-4 rounded-lg">
            <h4 class="text-lg font-semibold mb-3 text-gray-300">Booking Type</h4>
            <div class="flex justify-between items-center">
                <span class="text-gray-400">Type:</span>
                <span class="px-3 py-1 rounded-full text-sm font-medium ${bookingType === 'instruction'
                ? 'bg-blue-600 text-blue-100'
                : 'bg-green-600 text-green-100'}">
                    ${bookingType === 'instruction' ? 'Instruction' : 'Regular Flight'}
                </span>
            </div>
        </div>

        <!-- System Information -->
        <div class="bg-gray-800 p-4 rounded-lg">
            <h4 class="text-lg font-semibold mb-3 text-gray-300">System Information</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-2">
                    <div class="flex justify-between">
                        <span class="text-gray-400">Booking ID:</span>
                        <span class="font-mono text-sm">${bookingData.id}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-400">Created:</span>
                        <span>${new Date(bookingData.created_at).toLocaleString()}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;
    }

    render() {
        if (this.currentBooking && !this.isOpen) {
            console.log('🔧 render() called, showing modal');
            this.show(this.currentBooking);
        } else if (this.isOpen) {
            console.log('🔧 render() called but modal already open');
        } else {
            console.log('🔧 render() called but no booking data');
        }
    }

}