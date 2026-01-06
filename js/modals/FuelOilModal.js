// ./js/modals/FuelOilModal.js
import { supabase } from "../supabase.js";
import { showToast } from "../components/showToast.js";
import { CustomDatePicker } from "../components/customDatePicker.js";
import { Autocomplete } from "../components/autocomplete.js";


export class FuelOilModal {
    constructor() {
        this.modal = null;
        this.isOpen = false;
        this.planeId = null;
        this.planeTailNumber = "";


        this.logs = [];


        this.currentView = 'list';


        this.datePickerInstance = null;


        this.handleModalClick = this.handleModalClick.bind(this);
        this.handleEscapeKey = this.handleEscapeKey.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    /**
     * Entry point to open the modal
     * @param {string} planeId - UUID of the plane
     * @param {string} tailNumber - Display name for the header
     */
    async show(planeId, tailNumber) {
        if (this.isOpen) return;

        this.planeId = planeId;
        this.planeTailNumber = tailNumber;
        this.currentView = 'list';

        this.render();
        this.isOpen = true;


        const modalContent = this.modal.querySelector('.bg-gray-900');
        setTimeout(() => {
            this.modal.classList.remove("hidden");
            requestAnimationFrame(() => {
                modalContent.classList.remove("scale-95", "opacity-0");
                modalContent.classList.add("scale-100", "opacity-100");
            });
        }, 10);

        this.attachEvents();
        await this.fetchLogs();
    }

    /**
     * Fetch records from Supabase
     */
    async fetchLogs() {
        this.setLoading(true);
        try {

            const { data, error } = await supabase
                .schema('api')
                .rpc('get_fuel_logs_by_plane', { plane_uuid: this.planeId });

            if (error) throw error;

            this.logs = data || [];
            this.renderList();
        } catch (error) {
            console.error('Error fetching fuel logs:', error);
            showToast('Failed to load logs: ' + error.message, 'error');
        } finally {
            this.setLoading(false);
        }
    }

    render() {
        if (this.modal && document.body.contains(this.modal)) {
            document.body.removeChild(this.modal);
        }

        this.modal = document.createElement('div');
        this.modal.id = "fuel-modal";
        this.modal.className = "hidden fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm";

        this.modal.innerHTML = `
            <div class="bg-gray-900 rounded-2xl w-full max-w-4xl shadow-2xl border border-gray-700 transform transition-all duration-300 scale-95 opacity-0 max-h-[90vh] flex flex-col">
                <div class="flex-shrink-0 flex items-center justify-between p-6 border-b border-gray-700">
                    <div class="flex items-center space-x-3">
                        <div class="p-2 bg-orange-600 rounded-lg">
                            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path>
                            </svg>
                        </div>
                        <div>
                            <h2 class="text-xl font-bold text-white">Fuel & Oil Logs</h2>
                            <p class="text-sm text-gray-400">Aircraft: <span class="font-mono text-orange-400">${this.planeTailNumber}</span></p>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <button id="toggle-fuel-view-btn" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors flex items-center gap-2">
                            <span id="fuel-toggle-icon">+</span>
                            <span id="fuel-toggle-text">Add Log</span>
                        </button>
                        <button id="close-fuel-modal" class="p-2 hover:bg-gray-800 rounded-lg transition-colors duration-200">
                            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                </div>

                <div class="flex-1 overflow-y-auto relative min-h-[400px]">
                    <div id="fuel-loading-overlay" class="absolute inset-0 bg-gray-900 bg-opacity-80 z-10 flex items-center justify-center hidden">
                        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
                    </div>

                    <div id="fuel-view-list" class="p-6">
                        <div class="overflow-x-auto bg-gray-800 rounded-xl border border-gray-700">
                            <table class="w-full text-left text-gray-300">
                                <thead class="bg-gray-700 text-xs uppercase text-gray-400">
                                    <tr>
                                        <th class="px-6 py-3">Date</th>
                                        <th class="px-6 py-3">Type</th>
                                        <th class="px-6 py-3">Amount</th>
                                        <th class="px-6 py-3">Cost</th>
                                        <th class="px-6 py-3">Location</th>
                                        <th class="px-6 py-3">Added By</th>
                                    </tr>
                                </thead>
                                <tbody id="fuel-table-body" class="divide-y divide-gray-700">
                                    </tbody>
                            </table>
                            <div id="empty-fuel-msg" class="hidden p-8 text-center text-gray-500">
                                No fuel or oil logs found.
                            </div>
                        </div>
                    </div>

                    <div id="fuel-view-add" class="hidden p-6">
                        <form id="add-fuel-form" class="space-y-6 max-w-2xl mx-auto">
                            <div class="bg-gray-800 p-6 rounded-xl border border-gray-700 space-y-4">
                                <h3 class="text-lg font-semibold text-white mb-4">New Fuel/Oil Entry</h3>
                                
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-400 mb-1">Date *</label>
                                        <input type="date" id="fuel-date" class="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-orange-500 outline-none" required>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-400 mb-1">Type *</label>
                                        <select id="fuel-type" class="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-orange-500 outline-none">
                                            <option value="100LL">Avgas 100LL</option>
                                            <option value="Jet-A">Jet-A</option>
                                            <option value="MoGas">MoGas</option>
                                            <option value="Oil">Oil (Quarts)</option>
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm font-medium text-gray-400 mb-1">Amount</label>
                                        <div class="relative">
                                            <input type="number" step="0.1" id="fuel-amount" placeholder="0.0" class="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-orange-500 outline-none" required>
                                            <span class="absolute right-4 top-3 text-gray-500 text-sm" id="fuel-unit-label">Gallons</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label class="block text-sm font-medium text-gray-400 mb-1">Total Cost ($)</label>
                                        <input type="number" step="0.01" id="fuel-cost" placeholder="0.00" class="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-orange-500 outline-none">
                                    </div>

                                    <div class="md:col-span-2">
                                        <label class="block text-sm font-medium text-gray-400 mb-1">Location / FBO</label>
                                        <input type="text" id="fuel-location" placeholder="e.g. KSFO, Signature Flight Support" class="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-orange-500 outline-none">
                                    </div>
                                </div>
                            </div>

                            <div class="flex justify-end gap-3 pt-4 border-t border-gray-700">
                                <button type="button" id="cancel-fuel-btn" class="px-6 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors">Cancel</button>
                                <button type="submit" class="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-500 transition-colors shadow-lg">Save Log</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);
    }

    renderList() {
        const tbody = document.getElementById('fuel-table-body');
        const emptyMsg = document.getElementById('empty-fuel-msg');

        if (!this.logs || this.logs.length === 0) {
            tbody.innerHTML = '';
            emptyMsg.classList.remove('hidden');
            return;
        }

        emptyMsg.classList.add('hidden');
        tbody.innerHTML = this.logs.map(log => `
            <tr class="hover:bg-gray-750 transition-colors">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    ${new Date(log.log_date || log.created_at).toLocaleDateString()}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                    <span class="px-2 py-1 rounded text-xs ${log.fuel_type === 'Oil' ? 'bg-gray-700 text-gray-200' : 'bg-orange-900 text-orange-200'}">
                        ${log.fuel_type}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-mono">
                    ${log.amount} ${log.fuel_type === 'Oil' ? 'qts' : 'gal'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    ${log.total_cost ? '$' + parseFloat(log.total_cost).toFixed(2) : '-'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    ${log.location || '-'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${log.added_by_name || 'Unknown'}
                </td>
            </tr>
        `).join('');
    }

    attachEvents() {
        this.modal.addEventListener('click', this.handleModalClick);
        document.addEventListener('keydown', this.handleEscapeKey);


        document.getElementById('close-fuel-modal')?.addEventListener('click', () => this.close());


        document.getElementById('toggle-fuel-view-btn')?.addEventListener('click', () => {
            this.toggleView(this.currentView === 'list' ? 'add' : 'list');
        });


        document.getElementById('add-fuel-form')?.addEventListener('submit', this.handleSubmit);
        document.getElementById('cancel-fuel-btn')?.addEventListener('click', () => this.toggleView('list'));


        const typeSelect = document.getElementById('fuel-type');
        const unitLabel = document.getElementById('fuel-unit-label');
        if (typeSelect && unitLabel) {
            typeSelect.addEventListener('change', (e) => {
                unitLabel.textContent = e.target.value === 'Oil' ? 'Quarts' : 'Gallons';
            });
        }


        const dateInput = document.getElementById('fuel-date');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
            try {
                this.datePickerInstance = new CustomDatePicker(dateInput);
            } catch (e) { console.warn("Picker fallback"); }
        }
    }

    toggleView(viewName) {
        this.currentView = viewName;
        const listView = document.getElementById('fuel-view-list');
        const addView = document.getElementById('fuel-view-add');
        const toggleBtn = document.getElementById('toggle-fuel-view-btn');
        const toggleText = document.getElementById('fuel-toggle-text');
        const toggleIcon = document.getElementById('fuel-toggle-icon');

        if (viewName === 'add') {
            listView.classList.add('hidden');
            addView.classList.remove('hidden');
            toggleText.textContent = "Back to List";
            toggleIcon.textContent = "←";
            toggleBtn.classList.replace('bg-blue-600', 'bg-gray-600');
            toggleBtn.classList.replace('hover:bg-blue-500', 'hover:bg-gray-500');
        } else {
            listView.classList.remove('hidden');
            addView.classList.add('hidden');
            toggleText.textContent = "Add Log";
            toggleIcon.textContent = "+";
            toggleBtn.classList.replace('bg-gray-600', 'bg-blue-600');
            toggleBtn.classList.replace('hover:bg-gray-500', 'hover:bg-blue-500');
            document.getElementById('add-fuel-form')?.reset();
        }
    }

    async handleSubmit(e) {
        e.preventDefault();

        const date = document.getElementById('fuel-date').value;
        const type = document.getElementById('fuel-type').value;
        const amount = document.getElementById('fuel-amount').value;
        const cost = document.getElementById('fuel-cost').value;
        const location = document.getElementById('fuel-location').value;


        if (!amount || amount <= 0) {
            showToast("Please enter a valid amount", "error");
            return;
        }

        this.setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            const payload = {
                plane_id: this.planeId,
                log_date: date,
                fuel_type: type,
                amount: parseFloat(amount),
                total_cost: cost ? parseFloat(cost) : 0,
                location: location,
                added_by: user?.id
            };


            const { error } = await supabase
                .schema('api')
                .rpc('insert_fuel_log', { payload });

            if (error) throw error;

            showToast('Log entry added successfully', 'success');
            document.getElementById('add-fuel-form').reset();
            this.toggleView('list');
            await this.fetchLogs();

        } catch (error) {
            console.error(error);
            showToast('Error saving log: ' + error.message, 'error');
        } finally {
            this.setLoading(false);
        }
    }

    setLoading(isLoading) {
        const overlay = document.getElementById('fuel-loading-overlay');
        if (overlay) {
            if (isLoading) overlay.classList.remove('hidden');
            else overlay.classList.add('hidden');
        }
    }

    handleModalClick(e) { if (e.target === this.modal) this.close(); }
    handleEscapeKey(e) { if (e.key === 'Escape' && this.isOpen) this.close(); }

    close() {
        if (!this.isOpen || !this.modal) return;
        this.isOpen = false;

        const modalContent = this.modal.querySelector('.bg-gray-900');
        modalContent.classList.remove("scale-100", "opacity-100");
        modalContent.classList.add("scale-95", "opacity-0");

        setTimeout(() => {
            if (this.modal && document.body.contains(this.modal)) {
                document.body.removeChild(this.modal);
            }
            this.cleanup();
        }, 300);
    }

    cleanup() {
        this.modal = null;
        this.planeId = null;
        this.logs = [];
        this.modal?.removeEventListener('click', this.handleModalClick);
        document.removeEventListener('keydown', this.handleEscapeKey);
        if (this.datePickerInstance?.destroy) this.datePickerInstance.destroy();
    }
}