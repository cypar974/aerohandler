import { supabase } from "../supabase.js";
import { showToast } from "../components/showToast.js";
import { setupPersonAutocomplete } from "../components/autocomplete.js";

export class SettleDebtModal {
    constructor() {
        this.modal = null;
        this.selectedTransactions = new Set();
        this.currentPersonId = null;
        this.peopleData = [];
    }

    async init() {
        // 1. Fetch people for the search dropdown
        const { data, error } = await supabase.schema('api').rpc('get_members');
        if (!error) {
            this.peopleData = (data || []).map(p => ({
                ...p,
                name: `${p.first_name} ${p.last_name}`,
                full_name: `${p.first_name} ${p.last_name}`
            }));
        }
        this.render();
        this.attachEvents();
    }

    render() {
        const existing = document.getElementById("settle-debt-modal");
        if (existing) existing.remove();
        this.modal = document.createElement('div');
        this.modal.id = "settle-debt-modal";
        this.modal.className = "hidden fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm";

        this.modal.innerHTML = `
            <div class="bg-gray-900 rounded-2xl w-full max-w-4xl shadow-2xl border border-gray-700 flex flex-col max-h-[90vh]">
                <div class="flex items-center justify-between p-6 border-b border-gray-700">
                    <div class="flex items-center space-x-3">
                        <div class="p-2 bg-green-600 rounded-lg">
                            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
                            </svg>
                        </div>
                        <div>
                            <h2 class="text-xl font-bold text-white">Settle Member Account</h2>
                            <p class="text-sm text-gray-400">Reconcile payments against specific flights</p>
                        </div>
                    </div>
                    <button id="close-settle-modal" class="text-gray-400 hover:text-white transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div class="p-6 flex-1 overflow-y-auto space-y-6">
                    <div class="bg-gray-800 p-4 rounded-xl border border-gray-700">
                        <label class="block text-sm font-medium text-gray-400 mb-2">Select Member</label>
                        <div class="relative">
                            <input type="text" id="settle-person-search" class="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:outline-none" placeholder="Search by name...">
                            <input type="hidden" id="settle-person-id">
                        </div>
                    </div>

                    <div id="settle-transactions-container" class="hidden">
                        <h3 class="text-lg font-semibold text-white mb-3">Pending Debts</h3>
                        <div class="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                            <table class="w-full text-left border-collapse">
                                <thead class="bg-gray-750 text-gray-400 text-sm uppercase">
                                    <tr>
                                        <th class="p-4 border-b border-gray-700 w-12">
                                            <input type="checkbox" id="select-all-debts" class="rounded bg-gray-600 border-gray-500 text-green-500 focus:ring-green-500">
                                        </th>
                                        <th class="p-4 border-b border-gray-700">Date</th>
                                        <th class="p-4 border-b border-gray-700">Description</th>
                                        <th class="p-4 border-b border-gray-700 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody id="settle-transactions-list" class="text-gray-300 text-sm divide-y divide-gray-700">
                                    </tbody>
                            </table>
                            <div id="no-debts-msg" class="hidden p-8 text-center text-gray-500">
                                No pending transactions found for this user.
                            </div>
                        </div>
                    </div>
                </div>

                <div class="p-6 border-t border-gray-700 bg-gray-800/50">
                    <div class="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div class="flex items-center space-x-4 w-full md:w-auto">
                            <div class="text-right">
                                <div class="text-sm text-gray-400">Total Selected</div>
                                <div class="text-2xl font-bold text-green-400" id="settle-total-display">€0.00</div>
                            </div>
                        </div>

                        <div class="flex items-center space-x-3 w-full md:w-auto">
                            <select id="settle-method" class="p-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white">
                                <option value="transfer">Bank Transfer</option>
                                <option value="card">Credit Card</option>
                                <option value="cash">Cash</option>
                                <option value="check">Check</option>
                            </select>
                            <input type="text" id="settle-reference" placeholder="Ref (e.g. Transfer Jan 5)" class="p-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white w-full md:w-48">
                            
                            <button id="btn-submit-settlement" disabled class="px-6 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all shadow-lg shadow-green-900/20">
                                Pay Selected
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);
    }

    attachEvents() {
        // Close Modal
        this.modal.querySelector('#close-settle-modal').onclick = () => this.hide();
        this.modal.onclick = (e) => { if (e.target === this.modal) this.hide(); };

        // Autocomplete
        setupPersonAutocomplete({
            inputId: 'settle-person-search',
            hiddenId: 'settle-person-id',
            peopleData: this.peopleData,
            onSelect: (person) => this.loadUserTransactions(person.id)
        });

        // Select All
        document.getElementById('select-all-debts').onchange = (e) => {
            const checkboxes = document.querySelectorAll('.txn-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = e.target.checked;
                this.toggleTransaction(cb.value, cb.dataset.amount, e.target.checked);
            });
            this.updateTotal();
        };

        // Submit
        document.getElementById('btn-submit-settlement').onclick = () => this.submitPayment();
    }

    async loadUserTransactions(personId) {
        this.currentPersonId = personId;
        this.selectedTransactions.clear();
        this.updateTotal();

        const container = document.getElementById('settle-transactions-container');
        const list = document.getElementById('settle-transactions-list');
        const noMsg = document.getElementById('no-debts-msg');

        container.classList.remove('hidden');
        list.innerHTML = '<tr><td colspan="4" class="p-4 text-center">Loading...</td></tr>';

        // CALL API
        const { data, error } = await supabase.schema('api').rpc('get_transactions_by_person', { person_uuid: personId });

        if (error) {
            showToast(error.message, 'error');
            return;
        }

        // Filter only pending receivables (Money user owes us)
        const pendingDebts = (data || []).filter(t => t.status === 'pending' && t.transaction_direction === 'receivable');

        list.innerHTML = '';
        if (pendingDebts.length === 0) {
            noMsg.classList.remove('hidden');
        } else {
            noMsg.classList.add('hidden');
            pendingDebts.forEach(txn => {
                const row = document.createElement('tr');
                row.className = "hover:bg-gray-800 transition-colors";
                row.innerHTML = `
                    <td class="p-4 border-b border-gray-800">
                        <input type="checkbox" class="txn-checkbox rounded bg-gray-700 border-gray-600 text-green-500 focus:ring-green-500 w-5 h-5 cursor-pointer" 
                            value="${txn.id}" data-amount="${txn.amount}">
                    </td>
                    <td class="p-4 border-b border-gray-800 text-gray-300">
                        ${new Date(txn.due_date).toLocaleDateString()}
                    </td>
                    <td class="p-4 border-b border-gray-800 text-white font-medium">
                        ${txn.description}
                    </td>
                    <td class="p-4 border-b border-gray-800 text-right font-mono text-green-400">
                        €${parseFloat(txn.amount).toFixed(2)}
                    </td>
                `;

                // Row click toggles checkbox
                row.onclick = (e) => {
                    if (e.target.type !== 'checkbox') {
                        const cb = row.querySelector('.txn-checkbox');
                        cb.checked = !cb.checked;
                        this.toggleTransaction(txn.id, txn.amount, cb.checked);
                        this.updateTotal();
                    }
                };

                // Checkbox click
                row.querySelector('.txn-checkbox').onclick = (e) => {
                    e.stopPropagation(); // Prevent double trigger
                    this.toggleTransaction(txn.id, txn.amount, e.target.checked);
                    this.updateTotal();
                };

                list.appendChild(row);
            });
        }
    }

    toggleTransaction(id, amount, isSelected) {
        if (isSelected) {
            this.selectedTransactions.add({ id, amount: parseFloat(amount) });
        } else {
            // Remove by ID
            for (const item of this.selectedTransactions) {
                if (item.id === id) this.selectedTransactions.delete(item);
            }
        }
    }

    updateTotal() {
        // START REPLACEMENT
        let totalCents = 0;
        this.selectedTransactions.forEach(t => {
            // Multiply by 100 and round to handle loose floats, calculate in integer
            totalCents += Math.round(t.amount * 100);
        });
        const total = totalCents / 100;
        // END REPLACEMENT

        document.getElementById('settle-total-display').textContent = `€${total.toFixed(2)}`;
        document.getElementById('btn-submit-settlement').disabled = total === 0;
    }

    async submitPayment() {
        const btn = document.getElementById('btn-submit-settlement');
        const ref = document.getElementById('settle-reference').value;
        const method = document.getElementById('settle-method').value;

        if (!ref) {
            showToast("Please enter a payment reference (e.g. Bank Transfer ID)", "warning");
            document.getElementById('settle-reference').focus();
            return;
        }

        const transactionIds = Array.from(this.selectedTransactions).map(t => t.id);

        try {
            btn.innerHTML = "Processing...";
            btn.disabled = true;

            const { data, error } = await supabase.schema('api').rpc('settle_transactions', {
                transaction_ids: transactionIds,
                payment_method: method,
                payment_reference: ref
            });

            if (error) throw error;

            showToast(data.message, 'success');
            this.hide();
            // Optional: trigger a refresh event on the main page if needed
            if (this.onSuccessCallback) this.onSuccessCallback();

        } catch (err) {
            console.error(err);
            showToast(err.message, 'error');
            btn.innerHTML = "Pay Selected";
            btn.disabled = false;
        }
    }

    async show(onSuccess, preSelectedPersonId = null) {
        this.onSuccessCallback = onSuccess;
        this.modal.classList.remove('hidden');

        // Wait logic: If peopleData is empty, wait a moment (or re-fetch)
        if (this.peopleData.length === 0) {
            // Simple retry logic or re-await the fetch
            const { data } = await supabase.schema('api').rpc('get_members');
            this.peopleData = (data || []).map(p => ({
                ...p,
                name: `${p.first_name} ${p.last_name}`,
                full_name: `${p.first_name} ${p.last_name}`
            }));
        }

        if (preSelectedPersonId) {
            // Now we are sure peopleData is loaded
            const person = this.peopleData.find(p => p.id === preSelectedPersonId);

            if (person) {
                const nameInput = document.getElementById('settle-person-search');
                const idInput = document.getElementById('settle-person-id');

                if (nameInput && idInput) {
                    nameInput.value = person.name;
                    idInput.value = person.id;
                    this.loadUserTransactions(person.id);
                }
            }
        }
    }

    hide() {
        this.modal.classList.add('hidden');
        // Reset form
        document.getElementById('settle-person-search').value = '';
        document.getElementById('settle-transactions-container').classList.add('hidden');
        this.selectedTransactions.clear();
        this.updateTotal();
    }
}