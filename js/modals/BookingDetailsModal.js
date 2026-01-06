// ./components/modals/BookingDetailsModal.js
import { supabase } from "../supabase.js";
import { showToast } from "../components/showToast.js";
import { EditBookingModal } from "./EditBookingModal.js";
import { BookingCancelModal } from "./BookingCancelModal.js";

export class BookingDetailsModal {
    constructor(config = {}) {
        console.log('🔧 BookingDetailsModal constructor called');


        if (!BookingDetailsModal.instanceCount) {
            BookingDetailsModal.instanceCount = 0;
        }
        BookingDetailsModal.instanceCount++;
        console.log('🔧 Modal instance count:', BookingDetailsModal.instanceCount);


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


    show(bookingData) {

        const zombieModal = document.getElementById('booking-cancel-modal');
        if (zombieModal) {
            zombieModal.remove();
        }


        if (this.isOpen) {
            console.log('🔧 Modal already open, ignoring show call');
            return;
        }

        this.currentBooking = bookingData;
        this.isOpen = true;


        if (!this.modal || !this.modal.parentNode) {
            console.log('🔧 Modal not in DOM, recreating');
            this.createModal();
        }


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
                    console.log('🔧 Modal show animation complete');


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
        console.log('🔧 Destroying modal instance:', this.instanceId);

        this.cleanupEventListeners();

        if (this.modal && this.modal.parentNode) {
            this.modal.parentNode.removeChild(this.modal);
        }

        this.modal = null;
        this.currentBooking = null;
        this.relatedData = null;
        this.isOpen = false;


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
                modal.parentNode.removeChild(modal);
            }
        });

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
            </div>

            <div id="booking-modal-footer" class="hidden flex justify-end space-x-2 mt-6 pt-4 border-t border-gray-700">
                <button id="edit-booking-btn" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors flex items-center space-x-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                    <span>Edit</span>
                </button>
                <button id="cancel-booking-btn" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors flex items-center space-x-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                    <span>Cancel</span>
                </button>
                <button id="close-booking-details" class="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors">
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

        const closeModalBtn = this.modal.querySelector('#close-booking-modal');
        const closeDetailsBtn = this.modal.querySelector('#close-booking-details');
        const editBtn = this.modal.querySelector('#edit-booking-btn');
        const cancelBtn = this.modal.querySelector('#cancel-booking-btn');

        if (!closeModalBtn || !closeDetailsBtn) return;


        const closeModalHandler = () => {
            if (this.onClose) this.onClose();
            this.hide();
        };

        const editHandler = () => this.handleEdit();
        const cancelHandler = () => this.handleCancel();

        const modalClickHandler = (e) => {
            if (e.target === this.modal) {
                if (this.onClose) this.onClose();
                this.hide();
            }
        };

        const keydownHandler = (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                if (this.onClose) this.onClose();
                this.hide();
            }
        };


        closeModalBtn.addEventListener('click', closeModalHandler);
        closeDetailsBtn.addEventListener('click', closeModalHandler);
        this.modal.addEventListener('click', modalClickHandler);
        document.addEventListener('keydown', keydownHandler);


        if (editBtn) editBtn.addEventListener('click', editHandler);
        if (cancelBtn) cancelBtn.addEventListener('click', cancelHandler);


        this.eventListeners = [
            { element: closeModalBtn, event: 'click', handler: closeModalHandler },
            { element: closeDetailsBtn, event: 'click', handler: closeModalHandler },
            { element: this.modal, event: 'click', handler: modalClickHandler },
            { element: document, event: 'keydown', handler: keydownHandler },
            { element: editBtn, event: 'click', handler: editHandler },
            { element: cancelBtn, event: 'click', handler: cancelHandler }
        ].filter(l => l.element);
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

        const footer = document.getElementById('booking-modal-footer');
        if (footer) {
            footer.classList.add('hidden');
        }

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

            this.updateLoadingProgress(0, "Starting to load booking details...");


            if (bookingData.plane && (bookingData.students || bookingData.pilot)) {
                console.log('🔧 Using pre-loaded data');
                this.updateLoadingProgress(50, "Processing pre-loaded data...");


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

                await this.loadRelatedData(bookingData);
            }


            const content = document.getElementById('booking-details-content');
            if (content) {
                content.style.opacity = '0.7';
                content.style.transition = 'opacity 0.4s ease';

                await new Promise(resolve => setTimeout(resolve, 200));

                content.innerHTML = this.generateBookingHTML(bookingData, this.relatedData);

                await new Promise(resolve => setTimeout(resolve, 50));
                content.style.opacity = '1';

                const footer = document.getElementById('booking-modal-footer');
                if (footer) {
                    footer.classList.remove('hidden');
                }
            }


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

    async fetchUserProfile(userUuid) {
        if (!userUuid) return null;


        const { data: userData, error: userError } = await supabase
            .schema('api')
            .rpc('get_user_by_id', { user_uuid: userUuid });

        if (userError || !userData || userData.length === 0) {
            console.warn(`Could not resolve user ${userUuid}`, userError);
            return null;
        }

        const userMeta = userData[0];



        let rpcName = '';
        let paramName = '';
        let type = userMeta.role;

        switch (userMeta.role) {
            case 'student':
                rpcName = 'get_student_by_id';
                paramName = 'student_uuid';
                break;
            case 'instructor':
                rpcName = 'get_instructor_by_id';
                paramName = 'instructor_uuid';
                break;
            case 'regular_pilot':
                rpcName = 'get_regular_pilot_by_id';
                paramName = 'pilot_uuid';
                break;
            case 'maintenance_technician':
                rpcName = 'get_maintenance_technician_by_id';
                paramName = 'technician_uuid';
                break;
            default:

                return {
                    name: 'Unknown User',
                    type: userMeta.role
                };
        }



        const { data: profileData, error: profileError } = await supabase
            .schema('api')
            .rpc(rpcName, {
                [paramName]: userMeta.person_id
            });

        if (profileError || !profileData || profileData.length === 0) {
            console.warn(`Could not fetch profile for person ${userMeta.person_id}`, profileError);
            return null;
        }

        const profile = profileData[0];


        return {
            ...profile,
            name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
            type: type
        };
    }

    async loadRelatedData(bookingData) {
        try {
            console.log('🔧 Starting to load related data for booking:', bookingData.id);


            let progress = 0;
            const totalSteps = 4;
            const updateProgress = (step) => {
                progress = Math.min(100, (step / totalSteps) * 100);
                this.updateLoadingProgress(progress, this.getProgressMessage(step));
            };


            updateProgress(1);
            console.log('🔧 Loading plane data...');
            const { data: planeData, error: planeError } = await supabase
                .schema('api').rpc('get_plane_by_id', { plane_uuid: bookingData.plane_id });

            if (planeError) {
                console.error('❌ Error loading plane:', planeError);
                throw new Error(`Failed to load aircraft: ${planeError.message}`);
            }

            const plane = planeData && planeData.length > 0 ? planeData[0] : null;


            if (plane && plane.model_id) {
                const { data: modelData, error: modelError } = await supabase
                    .schema('api').rpc('get_plane_model_by_id', { model_uuid: plane.model_id });

                if (!modelError && modelData && modelData.length > 0) {
                    plane.model = modelData[0].model_name;
                } else {
                    plane.model = 'Unknown Model';
                }
            }

            if (!plane) {
                console.warn('⚠️ No plane found for ID:', bookingData.plane_id);
            }


            updateProgress(2);
            let instructorData = null;
            if (bookingData.instructor_id) {
                console.log('🔧 Loading instructor data...');

                instructorData = await this.fetchUserProfile(bookingData.instructor_id);
            }


            updateProgress(3);
            console.log('🔧 Loading pilot data...');
            let pilotData = null;
            if (bookingData.pilot_id) {

                pilotData = await this.fetchUserProfile(bookingData.pilot_id);
                console.log('🔧 Pilot loaded:', pilotData ? pilotData.name : 'None');
            }


            updateProgress(4);
            console.log('🔧 Loading student data...');
            let studentsData = [];

            if (bookingData.booking_type === 'instruction') {
                console.log('🔧 Loading instruction flight students...');


                if (pilotData && pilotData.type === 'student') {
                    studentsData.push(pilotData);
                }



                const additionalStudentIds = [
                    bookingData.student2_id,
                    bookingData.student3_id
                ].filter(Boolean);

                console.log('🔧 Additional student IDs:', additionalStudentIds);

                for (const userId of additionalStudentIds) {
                    const studentProfile = await this.fetchUserProfile(userId);
                    if (studentProfile) {
                        studentsData.push(studentProfile);
                    }
                }
            } else if (bookingData.booking_type === 'regular' && pilotData) {

                studentsData.push(pilotData);
            }


            this.updateLoadingProgress(100, "Finalizing booking details...");


            this.relatedData = {
                plane: plane,
                instructor: instructorData,
                students: studentsData,
                pilot: pilotData,
                pilotType: pilotData?.type || 'student',
                bookingType: bookingData.booking_type
            };

            console.log('✅ Successfully loaded related data:', {
                plane: plane?.tail_number || 'None',
                instructor: instructorData?.name || 'None',
                students: studentsData.length,
                pilot: pilotData?.name || 'None',
                bookingType: bookingData.booking_type
            });

        } catch (error) {
            console.error('❌ Critical error in loadRelatedData:', error);


            this.relatedData = {
                plane: null,
                instructor: null,
                students: [],
                pilot: null,
                pilotType: 'student',
                bookingType: bookingData.booking_type
            };

            throw error;
        }
    }


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
            <div class="relative mb-6">
                <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
                <div class="absolute inset-0 flex items-center justify-center">
                    <span class="text-sm font-bold text-blue-400">${Math.round(percent)}%</span>
                </div>
            </div>
            
            <div class="text-lg text-gray-300 text-center mb-2">${message}</div>
            <div class="text-sm text-gray-500 text-center mb-6">
                Preparing flight details for viewing
            </div>
            
            <div class="w-80 bg-gray-700 rounded-full h-3 mb-2">
                <div 
                    class="bg-blue-500 h-3 rounded-full transition-all duration-500 ease-out"
                    style="width: ${percent}%"
                ></div>
            </div>
            
            <div class="text-xs text-gray-400">
                ${Math.round(percent)}% complete
            </div>
            
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
        const duration = (endTime - startTime) / (1000 * 60 * 60);

        return `
    <div class="space-y-6">
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

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
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

        ${bookingType === 'regular' ? `
        <div class="bg-gray-800 p-4 rounded-lg">
            <h4 class="text-lg font-semibold mb-4 text-yellow-400">Pilot Information</h4>
            ${students.length > 0 ? `
            <div class="overflow-x-auto pb-4">
                <div class="flex space-x-4 min-w-max">
                    ${students.map((person) => {

            let badgeText = 'Student Pilot';
            let badgeColor = 'bg-blue-600';

            switch (person.type) {
                case 'instructor':
                    badgeText = 'Instructor Pilot';
                    badgeColor = 'bg-purple-600';
                    break;
                case 'regular_pilot':
                    badgeText = 'Regular Pilot';
                    badgeColor = 'bg-green-600';
                    break;
                case 'maintenance_technician':
                    badgeText = 'Maintenance Tech';
                    badgeColor = 'bg-orange-600';
                    break;
                default:

                    if (person.license_number?.includes('CFI')) {
                        badgeText = 'Instructor Pilot';
                        badgeColor = 'bg-purple-600';
                    }
                    break;
            }

            return `
                <div class="bg-gray-700 p-4 rounded-lg min-w-[280px] flex-shrink-0 shadow-lg">
                    <div class="flex justify-between items-center mb-3">
                        <span class="font-medium text-white">${person.name || (person.first_name + ' ' + person.last_name)}</span>
                        <span class="px-2 py-1 rounded text-xs ${badgeColor}">
                            ${badgeText}
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

        ${bookingType === 'instruction' ? `
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
                                <span class="font-medium text-white">${person.name || (person.first_name + ' ' + person.last_name)}</span>
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

        ${bookingData.description ? `
        <div class="bg-gray-800 p-4 rounded-lg">
            <h4 class="text-lg font-semibold mb-3 text-gray-300">Description</h4>
            <p class="text-gray-400 bg-gray-700 p-3 rounded">${bookingData.description}</p>
        </div>
        ` : ''}

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

    handleEdit() {
        if (!this.currentBooking) return;


        const bookingToRestore = this.currentBooking;

        this.hide();

        const editModal = new EditBookingModal({
            booking: bookingToRestore,
            planes: this.planes,
            students: this.students,
            instructors: this.instructors,
            onClose: () => {

                this.show(bookingToRestore);
            }
        });

        editModal.render();
    }

    handleCancel() {
        if (!this.currentBooking) return;


        const bookingToRestore = this.currentBooking;


        this.hide();

        const cancelModal = new BookingCancelModal({
            booking: bookingToRestore,
            onConfirm: () => {

                console.log('Booking cancelled via Details Modal');
            },
            onCancel: () => {

                this.show(bookingToRestore);
            }
        });

        cancelModal.render();
    }

}