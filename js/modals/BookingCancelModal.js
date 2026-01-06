// ./components/modals/BookingCancelModal.js
import { showToast } from "../components/showToast.js";
import { supabase } from "../supabase.js";

export class BookingCancelModal {
    constructor(config = {}) {
        console.log('🗑️ BookingCancelModal initialized');


        this.cleanupExistingModals();


        this.booking = config.booking || null;
        this.onConfirm = config.onConfirm || null;
        this.onCancel = config.onCancel || null;


        this.modal = null;
        this.isLoading = false;
        this.boundHandleEsc = this.handleEsc.bind(this);

        this.render();
    }

    cleanupExistingModals() {
        const existing = document.querySelectorAll('#booking-cancel-modal');
        existing.forEach(el => el.remove());
    }



    createModal() {
        this.modal = document.createElement('div');
        this.modal.id = 'booking-cancel-modal';
        this.modal.className = 'fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-4 backdrop-blur-sm transition-opacity duration-300 opacity-0';


        const displayData = this.getDisplayData();

        this.modal.innerHTML = `
            <div class="bg-gray-900 rounded-xl shadow-2xl w-full max-w-md border border-gray-700 transform transition-all duration-300 scale-95 opacity-0 modal-content">
                <div class="p-6">
                    <div class="flex items-center gap-4 mb-6">
                        <div class="flex-shrink-0 bg-red-900/30 rounded-full p-3 border border-red-800">
                            <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </div>
                        <div>
                            <h3 class="text-xl font-bold text-white">Cancel Booking?</h3>
                            <p class="text-gray-400 text-sm">This action cannot be undone.</p>
                        </div>
                    </div>

                    ${this.booking ? `
                        <div class="bg-gray-800/50 rounded-lg p-4 mb-6 border border-gray-700">
                            <div class="space-y-2 text-sm">
                                <div class="flex justify-between">
                                    <span class="text-gray-400">Date</span>
                                    <span class="font-medium text-gray-200">${displayData.date}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-400">Time</span>
                                    <span class="font-medium text-gray-200">${displayData.time}</span>
                                </div>
                                ${displayData.plane ? `
                                <div class="flex justify-between">
                                    <span class="text-gray-400">Aircraft</span>
                                    <span class="font-medium text-white">${displayData.plane}</span>
                                </div>` : ''}
                                ${displayData.pilot ? `
                                <div class="flex justify-between">
                                    <span class="text-gray-400">Pilot</span>
                                    <span class="font-medium text-white">${displayData.pilot}</span>
                                </div>` : ''}
                            </div>
                        </div>
                    ` : ''}

                    <div class="flex gap-3 justify-end">
                        <button type="button" id="btn-keep-booking" class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium text-sm">
                            Keep Booking
                        </button>
                        <button type="button" id="btn-confirm-cancel" class="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors font-medium text-sm shadow-lg shadow-red-900/20 flex items-center gap-2">
                            <span>Yes, Cancel It</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);


        requestAnimationFrame(() => {
            this.modal.classList.remove('opacity-0');
            const content = this.modal.querySelector('.modal-content');
            content.classList.remove('scale-95', 'opacity-0');
            content.classList.add('scale-100', 'opacity-100');
        });

        this.setupEventListeners();
    }

    getDisplayData() {
        if (!this.booking) return { date: '-', time: '-' };

        const start = new Date(this.booking.start_time);
        const end = new Date(this.booking.end_time);





        let plane = this.booking.plane_tail_number
            || this.booking.plane?.tail_number
            || this.booking.plane_tail
            || '';


        let pilot = this.booking.pilot_name
            || this.booking.pilot?.name
            || (this.booking.pilot ? `${this.booking.pilot.first_name} ${this.booking.pilot.last_name}` : '')
            || '';

        return {
            date: start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            time: `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            plane,
            pilot
        };
    }

    setupEventListeners() {

        this.modal.querySelector('#btn-confirm-cancel').addEventListener('click', () => this.handleConfirm());
        this.modal.querySelector('#btn-keep-booking').addEventListener('click', () => this.handleClose());


        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal && !this.isLoading) this.handleClose();
        });


        document.addEventListener('keydown', this.boundHandleEsc);
    }

    handleEsc(e) {
        if (e.key === 'Escape' && !this.isLoading) this.handleClose();
    }



    async handleConfirm() {
        if (this.isLoading) return;
        this.isLoading = true;
        this.updateButtonState(true);

        try {

            const { error } = await supabase.schema('api').rpc('delete_booking', {
                booking_uuid: this.booking.id
            });

            if (error) throw error;

            showToast('Booking cancelled successfully', 'success');


            if (this.onConfirm) await this.onConfirm(this.booking);


            window.dispatchEvent(new CustomEvent('refreshBookingsTable'));
            window.dispatchEvent(new CustomEvent('bookingDeleted', { detail: { id: this.booking.id } }));

            this.destroy();

        } catch (error) {
            console.error('Error cancelling booking:', error);
            showToast(error.message || 'Failed to cancel booking', 'error');
            this.isLoading = false;
            this.updateButtonState(false);
        }
    }

    handleClose() {
        if (this.isLoading) return;
        if (this.onCancel) this.onCancel();
        this.destroy();
    }

    updateButtonState(loading) {
        const btn = this.modal.querySelector('#btn-confirm-cancel');
        const keepBtn = this.modal.querySelector('#btn-keep-booking');

        if (loading) {
            keepBtn.disabled = true;
            keepBtn.classList.add('opacity-50', 'cursor-not-allowed');

            btn.disabled = true;
            btn.classList.add('cursor-not-allowed');
            btn.innerHTML = `
                <svg class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Cancelling...</span>
            `;
        } else {
            keepBtn.disabled = false;
            keepBtn.classList.remove('opacity-50', 'cursor-not-allowed');

            btn.disabled = false;
            btn.classList.remove('cursor-not-allowed');
            btn.innerHTML = `<span>Yes, Cancel It</span>`;
        }
    }

    render() {
        this.createModal();
    }

    destroy() {
        document.removeEventListener('keydown', this.boundHandleEsc);

        if (this.modal) {


            this.modal.style.pointerEvents = 'none';


            this.modal.classList.add('opacity-0');
            const content = this.modal.querySelector('.modal-content');
            if (content) content.classList.add('scale-95', 'opacity-0');

            setTimeout(() => {
                if (this.modal && this.modal.parentNode) {
                    this.modal.parentNode.removeChild(this.modal);
                }
                this.modal = null;
            }, 300);
        }
    }
}