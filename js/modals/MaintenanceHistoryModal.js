// ./js/modals/MaintenanceHistoryModal.js
import { supabase } from "../supabase.js";
import { showToast } from "../components/showToast.js";
import { CustomDatePicker } from "../components/customDatePicker.js";

export class MaintenanceHistoryModal {
    constructor() {
        this.modal = null;
        this.isOpen = false;
        this.planeId = null;
        this.planeTailNumber = "";


        this.records = [];


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
        await this.fetchHistory();
    }

    /**
     * Fetch records from Supabase
     */
    async fetchHistory() {
        this.setLoading(true);
        try {
            const { data, error } = await supabase
                .schema('api')
                .rpc('get_maintenance_by_plane', { plane_uuid: this.planeId });

            if (error) throw error;

            this.records = data || [];
            this.renderList();
        } catch (error) {
            console.error('Error fetching maintenance:', error);
            showToast('Failed to load records: ' + error.message, 'error');
        } finally {
            this.setLoading(false);
        }
    }

    render() {
        if (this.modal && document.body.contains(this.modal)) {
            document.body.removeChild(this.modal);
        }

        this.modal = document.createElement('div');
        this.modal.id = "maintenance-modal";
        this.modal.className = "hidden fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm";

        this.modal.innerHTML = `
            <div class="bg-gray-900 rounded-2xl w-full max-w-4xl shadow-2xl border border-gray-700 transform transition-all duration-300 scale-95 opacity-0 max-h-[90vh] flex flex-col">
                <div class="flex-shrink-0 flex items-center justify-between p-6 border-b border-gray-700">
                    <div class="flex items-center space-x-3">
                        <div class="p-2 bg-yellow-600 rounded-lg">
                            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            </svg>
                        </div>
                        <div>
                            <h2 class="text-xl font-bold text-white">Maintenance History</h2>
                            <p class="text-sm text-gray-400">Aircraft: <span class="font-mono text-blue-400">${this.planeTailNumber}</span></p>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                         <button id="toggle-view-btn" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors flex items-center gap-2">
                            <span id="toggle-icon">+</span>
                            <span id="toggle-text">Add Record</span>
                        </button>
                        <button id="close-maintenance-modal" class="p-2 hover:bg-gray-800 rounded-lg transition-colors duration-200">
                            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                </div>

                <div class="flex-1 overflow-y-auto relative min-h-[400px]">
                    <div id="loading-overlay" class="absolute inset-0 bg-gray-900 bg-opacity-80 z-10 flex items-center justify-center hidden">
                        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                    </div>

                    <div id="view-list" class="p-6">
                        <div class="overflow-x-auto bg-gray-800 rounded-xl border border-gray-700">
                            <table class="w-full text-left text-gray-300">
                                <thead class="bg-gray-700 text-xs uppercase text-gray-400">
                                    <tr>
                                        <th class="px-6 py-3">Date</th>
                                        <th class="px-6 py-3">Type</th>
                                        <th class="px-6 py-3">Details</th>
                                        <th class="px-6 py-3">Hours</th>
                                        <th class="px-6 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody id="maintenance-table-body" class="divide-y divide-gray-700">
                                    </tbody>
                            </table>
                            <div id="empty-history-msg" class="hidden p-8 text-center text-gray-500">
                                No maintenance records found.
                            </div>
                        </div>
                    </div>

                    <div id="view-add" class="hidden p-6">
                        <form id="add-maintenance-form" class="space-y-6 max-w-2xl mx-auto">
                            <div class="bg-gray-800 p-6 rounded-xl border border-gray-700 space-y-4">
                                <h3 class="text-lg font-semibold text-white mb-4">New Maintenance Entry</h3>
                                
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-400 mb-1">Date *</label>
                                        <input type="date" id="maint-date" class="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-blue-500 outline-none" required>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-400 mb-1">Type *</label>
                                        <select id="maint-type" class="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-blue-500 outline-none">
                                            <option value="Routine">Routine Service</option>
                                            <option value="Inspection">Inspection (100hr/Annual)</option>
                                            <option value="Repair">Repair / Snag</option>
                                            <option value="Oil Change">Oil Change</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm font-medium text-gray-400 mb-1">Tach/Hobbs Hours</label>
                                        <input type="number" step="0.1" id="maint-hours" placeholder="e.g. 1450.5" class="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-blue-500 outline-none">
                                    </div>

                                    <div>
                                        <label class="block text-sm font-medium text-gray-400 mb-1">Status</label>
                                        <select id="maint-status" class="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-blue-500 outline-none">
                                            <option value="Completed">Completed</option>
                                            <option value="Scheduled">Scheduled</option>
                                            <option value="In Progress">In Progress</option>
                                        </select>
                                    </div>

                                    <div class="md:col-span-2">
                                        <label class="block text-sm font-medium text-gray-400 mb-1">Description / Notes *</label>
                                        <textarea id="maint-notes" rows="3" class="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-blue-500 outline-none" required></textarea>
                                    </div>
                                </div>
                            </div>

                            <div class="flex justify-end gap-3 pt-4 border-t border-gray-700">
                                <button type="button" id="cancel-add-btn" class="px-6 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors">Cancel</button>
                                <button type="submit" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors shadow-lg">Save Record</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);
    }

    renderList() {
        const tbody = document.getElementById('maintenance-table-body');
        const emptyMsg = document.getElementById('empty-history-msg');

        if (!this.records || this.records.length === 0) {
            tbody.innerHTML = '';
            emptyMsg.classList.remove('hidden');
            return;
        }

        emptyMsg.classList.add('hidden');
        tbody.innerHTML = this.records.map(r => `
            <tr class="hover:bg-gray-750 transition-colors">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    ${new Date(r.maintenance_date || r.created_at).toLocaleDateString()}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                    ${r.maintenance_type || 'General'}
                </td>
                <td class="px-6 py-4 text-sm text-gray-400 max-w-xs truncate" title="${r.notes}">
                    ${r.notes || '-'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-mono">
                    ${r.due_hours || '-'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs rounded-full ${this.getStatusColor(r.status)}">
                        ${r.status}
                    </span>
                </td>
            </tr>
        `).join('');
    }

    getStatusColor(status) {
        switch ((status || '').toLowerCase()) {
            case 'completed': return 'bg-green-900 text-green-200 border border-green-700';
            case 'scheduled': return 'bg-blue-900 text-blue-200 border border-blue-700';
            case 'in progress': return 'bg-yellow-900 text-yellow-200 border border-yellow-700';
            default: return 'bg-gray-700 text-gray-300';
        }
    }

    attachEvents() {
        this.modal.addEventListener('click', this.handleModalClick);
        document.addEventListener('keydown', this.handleEscapeKey);


        document.getElementById('close-maintenance-modal')?.addEventListener('click', () => this.close());


        document.getElementById('toggle-view-btn')?.addEventListener('click', () => {
            this.toggleView(this.currentView === 'list' ? 'add' : 'list');
        });


        document.getElementById('add-maintenance-form')?.addEventListener('submit', this.handleSubmit);
        document.getElementById('cancel-add-btn')?.addEventListener('click', () => this.toggleView('list'));


        const dateInput = document.getElementById('maint-date');
        if (dateInput) {

            dateInput.value = new Date().toISOString().split('T')[0];
            try {
                this.datePickerInstance = new CustomDatePicker(dateInput);
            } catch (e) {
                console.warn("CustomDatePicker not available, falling back to native input");
            }
        }
    }

    toggleView(viewName) {
        this.currentView = viewName;
        const listView = document.getElementById('view-list');
        const addView = document.getElementById('view-add');
        const toggleBtn = document.getElementById('toggle-view-btn');
        const toggleText = document.getElementById('toggle-text');
        const toggleIcon = document.getElementById('toggle-icon');

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
            toggleText.textContent = "Add Record";
            toggleIcon.textContent = "+";
            toggleBtn.classList.replace('bg-gray-600', 'bg-blue-600');
            toggleBtn.classList.replace('hover:bg-gray-500', 'hover:bg-blue-500');


            document.getElementById('add-maintenance-form')?.reset();
        }
    }

    async handleSubmit(e) {
        e.preventDefault();

        const type = document.getElementById('maint-type').value;
        const notes = document.getElementById('maint-notes').value;
        const date = document.getElementById('maint-date').value;
        const status = document.getElementById('maint-status').value;
        const hours = document.getElementById('maint-hours').value;

        const payload = {
            plane_id: this.planeId,
            maintenance_type: type,
            notes: notes,
            maintenance_date: date,
            status: status,
            due_hours: hours ? parseFloat(hours) : null
        };

        this.setLoading(true);

        try {


            const { error } = await supabase
                .schema('api')
                .rpc('insert_maintenance_record', { payload });

            if (error) throw error;

            showToast('Maintenance record added', 'success');
            document.getElementById('add-maintenance-form').reset();
            this.toggleView('list');
            await this.fetchHistory();

        } catch (error) {
            console.error(error);
            showToast('Error saving record: ' + error.message, 'error');
        } finally {
            this.setLoading(false);
        }
    }

    setLoading(isLoading) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            if (isLoading) overlay.classList.remove('hidden');
            else overlay.classList.add('hidden');
        }
    }

    handleModalClick(e) {
        if (e.target === this.modal) this.close();
    }

    handleEscapeKey(e) {
        if (e.key === 'Escape' && this.isOpen) this.close();
    }

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
        this.records = [];
        this.modal?.removeEventListener('click', this.handleModalClick);
        document.removeEventListener('keydown', this.handleEscapeKey);


        if (this.datePickerInstance && typeof this.datePickerInstance.destroy === 'function') {
            this.datePickerInstance.destroy();
        }
    }
}