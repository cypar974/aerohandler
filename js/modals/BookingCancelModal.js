// ./js/modals/BookingCancelModal.js
import { showToast } from "../components/showToast.js";

export class BookingCancelModal {
    constructor(options = {}) {
        this.booking = options.booking || null;
        this.onConfirm = options.onConfirm || null;
        this.onCancel = options.onCancel || null;

        this.modal = null;
        this.isLoading = false;
    }

    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        this.modal.innerHTML = `
            <div class="bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
                <div class="p-6">
                    <!-- Header -->
                    <div class="flex items-center mb-4">
                        <div class="flex-shrink-0 bg-red-100 rounded-full p-2 mr-3">
                            <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                            </svg>
                        </div>
                        <h3 class="text-lg font-semibold text-white">Cancel Booking</h3>
                    </div>

                    <!-- Content -->
                    <div class="mb-6">
                        <p class="text-gray-300 mb-2">Are you sure you want to cancel this booking?</p>
                        
                        ${this.booking ? `
                            <div class="bg-gray-700 rounded-lg p-3 mt-3">
                                <div class="text-sm text-gray-300">
                                    <div class="flex justify-between mb-1">
                                        <span class="text-gray-400">Date:</span>
                                        <span class="font-medium">${this.formatDate(this.booking.start_time)}</span>
                                    </div>
                                    <div class="flex justify-between mb-1">
                                        <span class="text-gray-400">Time:</span>
                                        <span class="font-medium">${this.formatTime(this.booking.start_time)} - ${this.formatTime(this.booking.end_time)}</span>
                                    </div>
                                    ${this.getBookingDetails()}
                                </div>
                            </div>
                        ` : ''}
                        
                        <p class="text-red-400 text-sm mt-3 font-medium">This action cannot be undone.</p>
                    </div>

                    <!-- Actions -->
                    <div class="flex justify-end space-x-3">
                        <button type="button" 
                                class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors duration-200 font-medium cancel-btn"
                                ${this.isLoading ? 'disabled' : ''}>
                            Keep Booking
                        </button>
                        <button type="button" 
                                class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors duration-200 font-medium confirm-btn flex items-center space-x-2"
                                ${this.isLoading ? 'disabled' : ''}>
                            ${this.isLoading ? `
                                <svg class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Cancelling...</span>
                            ` : `
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                </svg>
                                <span>Cancel Booking</span>
                            `}
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);
        this.setupEventListeners();
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    formatTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    getBookingDetails() {
        if (!this.booking) return '';

        let details = '';

        // Show pilot name if available
        if (this.booking.pilot_name) {
            details += `
                <div class="flex justify-between mb-1">
                    <span class="text-gray-400">Pilot:</span>
                    <span class="font-medium">${this.booking.pilot_name}</span>
                </div>
            `;
        }

        // Show instructor name if available
        if (this.booking.instructor_name && this.booking.instructor_name !== '-') {
            details += `
                <div class="flex justify-between mb-1">
                    <span class="text-gray-400">Instructor:</span>
                    <span class="font-medium">${this.booking.instructor_name}</span>
                </div>
            `;
        }

        // Show plane if available
        if (this.booking.plane_tail) {
            details += `
                <div class="flex justify-between mb-1">
                    <span class="text-gray-400">Plane:</span>
                    <span class="font-medium">${this.booking.plane_tail}</span>
                </div>
            `;
        }

        return details;
    }

    setupEventListeners() {
        // Confirm button
        const confirmBtn = this.modal.querySelector('.confirm-btn');
        confirmBtn.addEventListener('click', () => this.handleConfirm());

        // Cancel button
        const cancelBtn = this.modal.querySelector('.cancel-btn');
        cancelBtn.addEventListener('click', () => this.handleCancel());

        // Click outside to close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal && !this.isLoading) {
                this.handleCancel();
            }
        });

        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal && this.modal.parentNode && !this.isLoading) {
                this.handleCancel();
            }
        });
    }

    async handleConfirm() {
        if (this.isLoading) return;

        this.isLoading = true;
        this.updateButtonStates();

        try {
            if (this.onConfirm) {
                await this.onConfirm(this.booking);
            }
            this.close();
        } catch (error) {
            console.error('Error cancelling booking:', error);
            showToast('Error cancelling booking: ' + error.message, 'error');
            this.isLoading = false;
            this.updateButtonStates();
        }
    }

    handleCancel() {
        if (this.isLoading) return;

        if (this.onCancel) {
            this.onCancel();
        }
        this.close();
    }

    updateButtonStates() {
        const confirmBtn = this.modal.querySelector('.confirm-btn');
        const cancelBtn = this.modal.querySelector('.cancel-btn');

        if (this.isLoading) {
            confirmBtn.disabled = true;
            cancelBtn.disabled = true;
            confirmBtn.innerHTML = `
                <svg class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Cancelling...</span>
            `;
        } else {
            confirmBtn.disabled = false;
            cancelBtn.disabled = false;
            confirmBtn.innerHTML = `
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
                <span>Cancel Booking</span>
            `;
        }
    }

    render() {
        this.createModal();
    }

    close() {
        this.destroy();
    }

    destroy() {
        // Remove event listeners
        document.removeEventListener('keydown', this.handleCancel);

        // Remove modal from DOM
        if (this.modal && this.modal.parentNode) {
            this.modal.parentNode.removeChild(this.modal);
            this.modal = null;
        }
    }
}