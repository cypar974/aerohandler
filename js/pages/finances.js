// ./js/pages/finance.js
import { supabase } from "../supabase.js";
import { PaymentModal } from "../modals/PaymentModal.js";
import { TransactionDetailsModal } from "../modals/TransactionDetailsModal.js";
import { CreateInvoiceModal } from "../modals/CreateInvoiceModal.js";
import { showToast } from "../components/showToast.js";
import { setupPersonAutocomplete } from "../components/autocomplete.js";
import { CreatePayableModal } from "../modals/CreatePayableModal.js";
import { AddRateModal } from "../modals/AddRateModal.js";
import { SettleDebtModal } from "../modals/SettleDebtModal.js";

let currentView = 'overview'; // overview, receivable, payable, transactions, rates
let planesData = [];
let planeModelsData = []; // New: needed for mapping model names
let billingRates = [];
let membersData = []; // New: needed for autocomplete

// Combined ledger data (source of truth for receivable/payable/transactions)
let fullLedgerData = [];

// Payment data for each view (Derived from fullLedgerData)
let receivableData = [];
let payableData = [];
let transactionsData = [];

// Modal instances
let activeModal = null;
let modalCleanupTimeout = null;
let transactionModal = null;
let createInvoiceModal = null;
let createPayableModal = null;

let addRateModal = null;
let settleDebtModal = null;

// Track active status filters for the views so autocomplete knows what context to filter within
let activeReceivableFilter = 'all';
let activePayableFilter = 'all';

// --- DEMO MODE: PERMISSIONS FLAG ---
const canManageFinance = true;
// -----------------------------------

export async function loadFinancePage() {
    console.log('Loading finance page...');

    await cleanupFinancePage();

    document.getElementById("main-content").innerHTML = `
        <div class="p-6 bg-gray-900 text-white min-h-full">
            <div class="flex justify-between items-center mb-6">
                <h1 class="text-3xl font-bold">Finance Management</h1>
                <div class="flex space-x-4">
                    <button id="refresh-finance" class="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700">
                        Refresh Data
                    </button>
                </div>
            </div>

            <div class="flex border-b border-gray-700 mb-6">
                <div class="flex">
                    <button class="tab-button px-4 py-2 ${currentView === 'overview' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-400'}" data-view="overview">
                        Overview
                    </button>
                    <button class="tab-button px-4 py-2 ${currentView === 'receivable' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-400'}" data-view="receivable">
                        Payments Receivable
                    </button>
                    <button class="tab-button px-4 py-2 ${currentView === 'payable' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-400'}" data-view="payable">
                        Payments Payable
                    </button>
                    <button class="tab-button px-4 py-2 ${currentView === 'transactions' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-400'}" data-view="transactions">
                        Transaction History
                    </button>
                </div>
                <div class="ml-auto">
                    <button class="tab-button px-4 py-2 ${currentView === 'rates' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-400'}" data-view="rates">
                        Billing Rates
                    </button>
                </div>
            </div>

            <div id="finance-content">
                </div>
        </div>
    `;

    await loadFinanceData();
    setupEventListeners();
    renderCurrentView();

    window.addEventListener('beforeunload', cleanupFinancePage);
}

async function loadFinanceData() {
    try {
        // 1. Fetch Core Data using RPCs and Views
        const [
            ledgerResponse,
            ratesResponse,
            planesResponse,
            modelsResponse,
            membersResponse
        ] = await Promise.all([
            // Use the Smart View for the ledger (joins users, flights, transactions)
            supabase.schema('api').rpc('get_financial_ledger'),
            // Use API getter for rates
            supabase.schema('api').rpc('get_billing_rates'),
            // Use API getter for planes
            supabase.schema('api').rpc('get_planes'),
            // Get models to map ID to Name
            supabase.schema('api').rpc('get_plane_models'),
            // Get members for autocomplete
            supabase.schema('api').rpc('get_members')
        ]);

        if (ledgerResponse.error) throw ledgerResponse.error;
        if (ratesResponse.error) throw ratesResponse.error;
        if (membersResponse.error) throw membersResponse.error;

        // 2. Process Data
        fullLedgerData = (ledgerResponse.data || []).sort((a, b) =>
            new Date(b.created_at) - new Date(a.created_at)
        );
        billingRates = ratesResponse.data || [];
        membersData = membersResponse.data || [];

        // 3. Process Planes & Models (Mapping model_id to model_name for UI compatibility)
        const rawPlanes = planesResponse.data || [];
        planeModelsData = modelsResponse.data || [];

        planesData = rawPlanes.map(plane => {
            const modelObj = planeModelsData.find(m => m.id === plane.model_id);
            return {
                ...plane,
                model: modelObj ? modelObj.model_name : 'Unknown Model'
            };
        });

        // 4. Derive View-Specific Arrays
        receivableData = fullLedgerData.filter(t => t.transaction_direction === 'receivable');
        payableData = fullLedgerData.filter(t => t.transaction_direction === 'payable');
        transactionsData = fullLedgerData;

        console.log('Loaded finance data:', {
            receivable: receivableData.length,
            payable: payableData.length,
            transactions: transactionsData.length,
            rates: billingRates.length,
            members: membersData.length
        });

    } catch (error) {
        console.error('Error loading finance data:', error);
        showToast('Error loading financial data', 'error');
    }
}

function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', (e) => {
            currentView = e.target.getAttribute('data-view');
            renderCurrentView();
        });
    });

    // Refresh button
    document.getElementById('refresh-finance').addEventListener('click', async () => {
        await loadFinanceData();
        renderCurrentView();
    });
}

function showAddRateModal(preSelectedAircraftId = null, preSelectedType = null, rateToEdit = null) {
    if (!addRateModal) {
        addRateModal = new AddRateModal();
    }

    // Pass the rateToEdit to the modal
    addRateModal.show(async () => {
        await loadFinanceData();
        renderCurrentView();
    }, preSelectedAircraftId, preSelectedType, rateToEdit);

    activeModal = addRateModal;
}

function renderCurrentView() {
    const content = document.getElementById('finance-content');

    // Update tab highlighting
    document.querySelectorAll('.tab-button').forEach(button => {
        const view = button.getAttribute('data-view');
        if (view === currentView) {
            button.classList.add('border-b-2', 'border-blue-500', 'text-blue-400');
            button.classList.remove('text-gray-400');
        } else {
            button.classList.remove('border-b-2', 'border-blue-500', 'text-blue-400');
            button.classList.add('text-gray-400');
        }
    });

    switch (currentView) {
        case 'overview':
            renderOverview(content);
            break;
        case 'receivable':
            renderReceivableView(content);
            break;
        case 'payable':
            renderPayableView(content);
            break;
        case 'transactions':
            renderTransactionsView(content);
            break;
        case 'rates':
            renderRatesView(content);
            break;
    }
}

function renderOverview(container) {
    const totalReceivable = receivableData
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + parseFloat(p.amount), 0);

    const totalPayable = payableData
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + parseFloat(p.amount), 0);

    // Loose month calculation based on created_at
    const monthlyRevenue = transactionsData
        .filter(t => t.transaction_direction === 'receivable' && t.status === 'paid' && isThisMonth(new Date(t.created_at)))
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const monthlyExpenses = transactionsData
        .filter(t => t.transaction_direction === 'payable' && t.status === 'paid' && isThisMonth(new Date(t.created_at)))
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div class="bg-gray-800 p-6 rounded-xl">
                <h3 class="text-lg font-semibold text-gray-400">Pending Receivable</h3>
                <p class="text-3xl font-bold text-yellow-400">$${totalReceivable.toFixed(2)}</p>
                <p class="text-sm text-gray-400 mt-2">${receivableData.filter(p => p.status === 'pending').length} pending payments</p>
            </div>
            <div class="bg-gray-800 p-6 rounded-xl">
                <h3 class="text-lg font-semibold text-gray-400">Pending Payable</h3>
                <p class="text-3xl font-bold text-orange-400">$${totalPayable.toFixed(2)}</p>
                <p class="text-sm text-gray-400 mt-2">${payableData.filter(p => p.status === 'pending').length} pending payments</p>
            </div>
            <div class="bg-gray-800 p-6 rounded-xl">
                <h3 class="text-lg font-semibold text-gray-400">Monthly Revenue</h3>
                <p class="text-3xl font-bold text-green-400">$${monthlyRevenue.toFixed(2)}</p>
                <p class="text-sm text-gray-400 mt-2">This month's income</p>
            </div>
            <div class="bg-gray-800 p-6 rounded-xl">
                <h3 class="text-lg font-semibold text-gray-400">Monthly Expenses</h3>
                <p class="text-3xl font-bold text-red-400">$${monthlyExpenses.toFixed(2)}</p>
                <p class="text-sm text-gray-400 mt-2">This month's costs</p>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-gray-800 p-6 rounded-xl">
                <h3 class="text-xl font-semibold mb-4">Recent Transactions</h3>
                <div class="space-y-2">
                    ${transactionsData.slice(0, 5).map(transaction => `
                        <div class="flex justify-between items-center p-3 bg-gray-700 rounded">
                            <div>
                                <div class="font-medium ${transaction.transaction_direction === 'receivable' ? 'text-green-400' : 'text-red-400'}">
                                    ${transaction.description}
                                </div>
                                <div class="text-sm text-gray-400">
                                    ${new Date(transaction.created_at).toLocaleDateString()}
                                </div>
                            </div>
                            <div class="font-bold ${transaction.transaction_direction === 'receivable' ? 'text-green-400' : 'text-red-400'}">
                                ${transaction.transaction_direction === 'receivable' ? '+' : '-'}$${parseFloat(transaction.amount).toFixed(2)}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="bg-gray-800 p-6 rounded-xl">
                <h3 class="text-xl font-semibold mb-4">Overdue Payments</h3>
                <div class="space-y-2">
                    ${[...receivableData, ...payableData]
            .filter(p => (p.status === 'pending' || p.status === 'overdue') && new Date(p.due_date) < new Date())
            .slice(0, 5)
            .map(payment => `
                        <div class="flex justify-between items-center p-3 bg-red-900 rounded">
                            <div>
                                <div class="font-medium">
                                    ${payment.full_name || 'Unknown'} 
                                </div>
                                <div class="text-sm text-gray-400">
                                    Due: ${new Date(payment.due_date).toLocaleDateString()}
                                </div>
                            </div>
                            <div class="text-red-400 font-bold">
                                $${parseFloat(payment.amount).toFixed(2)}
                            </div>
                        </div>
                    `).join('')}
                    ${[...receivableData, ...payableData].filter(p => (p.status === 'pending' || p.status === 'overdue') && new Date(p.due_date) < new Date()).length === 0 ?
            '<p class="text-gray-400 text-center">No overdue payments</p>' : ''}
                </div>
            </div>
        </div>
    `;
}

function renderReceivableView(container) {
    const pendingReceivable = receivableData.filter(p => p.status === 'pending' || p.status === 'overdue');
    const paidReceivable = receivableData.filter(p => p.status === 'paid');

    container.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-bold">Payments Receivable</h2>
            <div class="flex space-x-2">
                <button id="settle-account-btn" class="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Settle Account
                </button>

                <button id="create-invoice-btn" class="bg-green-600 px-4 py-2 rounded hover:bg-green-700">
                    + Create Invoice
                </button>
            </div>
        </div>

        <div class="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 mb-4 justify-between items-start md:items-center">
            <div class="flex space-x-4">
                <button class="tab-receivable px-4 py-2 ${activeReceivableFilter === 'all' ? 'bg-blue-600' : 'bg-gray-700'} rounded" data-filter="all">All (${receivableData.length})</button>
                <button class="tab-receivable px-4 py-2 ${activeReceivableFilter === 'pending' ? 'bg-blue-600' : 'bg-gray-700'} rounded" data-filter="pending">Pending (${pendingReceivable.length})</button>
                <button class="tab-receivable px-4 py-2 ${activeReceivableFilter === 'paid' ? 'bg-blue-600' : 'bg-gray-700'} rounded" data-filter="paid">Paid (${paidReceivable.length})</button>
            </div>
            
            <div class="w-full md:w-64 relative z-20">
                <input type="text" id="receivable-search" class="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-blue-500" placeholder="Filter by member...">
                <input type="hidden" id="receivable-search-id">
            </div>
        </div>

        <div class="overflow-x-auto">
            <table class="min-w-full bg-gray-800 rounded-lg overflow-hidden">
                <thead class="bg-gray-700">
                    <tr>
                        <th class="p-3 text-left">Member</th>
                        <th class="p-3 text-left">Description</th>
                        <th class="p-3 text-right">Amount</th>
                        <th class="p-3 text-left">Due Date</th>
                        <th class="p-3 text-center">Status</th>
                        <th class="p-3 text-center">Actions</th>
                    </tr>
                </thead>
                <tbody id="receivable-table-body">
                    ${receivableData.map(payment => `
                        <tr class="border-b border-gray-700 hover:bg-gray-750" data-user-id="${payment.user_id}">
                            <td class="p-3">
                                <div class="font-medium">${payment.full_name || 'N/A'}</div>
                                <div class="text-sm text-gray-400">${payment.email || ''}</div>
                                <div class="text-xs text-blue-400">${payment.user_role || ''}</div>
                            </td>
                            <td class="p-3">
                                <div class="text-sm">${payment.description}</div>
                                ${payment.related_plane ? `
                                    <div class="text-xs text-gray-400">
                                        Plane: ${payment.related_plane}
                                    </div>
                                ` : ''}
                            </td>
                            <td class="p-3 text-right font-bold text-green-400">
                                $${parseFloat(payment.amount).toFixed(2)}
                            </td>
                            <td class="p-3">
                                ${new Date(payment.due_date).toLocaleDateString()}
                                ${(new Date(payment.due_date) < new Date() && payment.status !== 'paid') ?
            '<span class="text-red-400 text-sm ml-2">(Overdue)</span>' : ''}
                            </td>
                            <td class="p-3 text-center">
                                <span class="px-2 py-1 rounded text-xs ${getStatusColor(payment.status)}">
                                    ${payment.status}
                                </span>
                            </td>
                            <td class="p-3 text-center">
                                ${payment.status === 'pending' || payment.status === 'overdue' ? `
                                    <button class="mark-paid-btn px-3 py-1 bg-green-600 rounded hover:bg-green-700 text-sm" 
                                            data-id="${payment.transaction_id}" data-type="receivable" data-amount="${payment.amount}">
                                        Mark Paid
                                    </button>
                                ` : `
                                    <span class="text-gray-400 text-sm">Paid</span>
                                `}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    // Initialize Autocomplete for Filtering
    setupPersonAutocomplete({
        inputId: 'receivable-search',
        hiddenId: 'receivable-search-id',
        peopleData: membersData,
        roleFilter: 'all',
        onSelect: () => filterReceivableTable(activeReceivableFilter)
    });

    // Handle clearing the search input (onInput empty checks)
    document.getElementById('receivable-search').addEventListener('input', (e) => {
        if (!e.target.value.trim()) {
            document.getElementById('receivable-search-id').value = '';
            filterReceivableTable(activeReceivableFilter);
        }
    });

    // Add event listeners for receivable tabs
    document.querySelectorAll('.tab-receivable').forEach(btn => {
        btn.addEventListener('click', (e) => {
            activeReceivableFilter = e.target.getAttribute('data-filter');

            // Update active tab styling
            document.querySelectorAll('.tab-receivable').forEach(b => {
                b.classList.remove('bg-blue-600');
                b.classList.add('bg-gray-700');
            });
            e.target.classList.remove('bg-gray-700');
            e.target.classList.add('bg-blue-600');

            filterReceivableTable(activeReceivableFilter);
        });
    });

    document.getElementById('create-invoice-btn').addEventListener('click', showCreateInvoiceModal);
    document.getElementById('settle-account-btn').addEventListener('click', showSettleDebtModal);

    setupPaymentButtons();
    // Apply initial filter state (e.g. if returning from another tab)
    filterReceivableTable(activeReceivableFilter);
}

function renderPayableView(container) {
    const pendingPayable = payableData.filter(p => p.status === 'pending' || p.status === 'overdue');
    const paidPayable = payableData.filter(p => p.status === 'paid');

    container.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-bold">Payments Payable</h2>
            <div class="flex space-x-2">
                <button id="create-payable-btn" class="bg-red-600 px-4 py-2 rounded hover:bg-red-700">
                    + Create Payable
                </button>
            </div>
        </div>

        <div class="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 mb-4 justify-between items-start md:items-center">
            <div class="flex space-x-4">
                <button class="tab-payable px-4 py-2 ${activePayableFilter === 'all' ? 'bg-blue-600' : 'bg-gray-700'} rounded" data-filter="all">All (${payableData.length})</button>
                <button class="tab-payable px-4 py-2 ${activePayableFilter === 'pending' ? 'bg-blue-600' : 'bg-gray-700'} rounded" data-filter="pending">Pending (${pendingPayable.length})</button>
                <button class="tab-payable px-4 py-2 ${activePayableFilter === 'paid' ? 'bg-blue-600' : 'bg-gray-700'} rounded" data-filter="paid">Paid (${paidPayable.length})</button>
            </div>
             <div class="w-full md:w-64 relative z-20">
                <input type="text" id="payable-search" class="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-blue-500" placeholder="Filter by member...">
                <input type="hidden" id="payable-search-id">
            </div>
        </div>

        <div class="overflow-x-auto">
            <table class="min-w-full bg-gray-800 rounded-lg overflow-hidden">
                <thead class="bg-gray-700">
                    <tr>
                        <th class="p-3 text-left">Payee</th>
                        <th class="p-3 text-left">Type</th>
                        <th class="p-3 text-left">Description</th>
                        <th class="p-3 text-right">Amount</th>
                        <th class="p-3 text-left">Due Date</th>
                        <th class="p-3 text-center">Status</th>
                        <th class="p-3 text-center">Actions</th>
                    </tr>
                </thead>
                <tbody id="payable-table-body">
                    ${payableData.map(payment => `
                        <tr class="border-b border-gray-700 hover:bg-gray-750" data-user-id="${payment.user_id}">
                            <td class="p-3">
                                <div class="font-medium">${payment.full_name || 'Unknown Payee'}</div>
                                <div class="text-sm text-gray-400">${payment.email || ''}</div>
                            </td>
                            <td class="p-3">
                                <span class="px-2 py-1 bg-gray-700 rounded text-xs">${payment.transaction_type}</span>
                            </td>
                            <td class="p-3">
                                <div class="text-sm">${payment.description}</div>
                            </td>
                            <td class="p-3 text-right font-bold text-red-400">
                                $${parseFloat(payment.amount).toFixed(2)}
                            </td>
                            <td class="p-3">
                                ${new Date(payment.due_date).toLocaleDateString()}
                                ${(new Date(payment.due_date) < new Date() && payment.status !== 'paid') ?
            '<span class="text-red-400 text-sm ml-2">(Overdue)</span>' : ''}
                            </td>
                            <td class="p-3 text-center">
                                <span class="px-2 py-1 rounded text-xs ${getStatusColor(payment.status)}">
                                    ${payment.status}
                                </span>
                            </td>
                            <td class="p-3 text-center">
                                ${payment.status === 'pending' || payment.status === 'overdue' ? `
                                    <button class="mark-paid-btn px-3 py-1 bg-green-600 rounded hover:bg-green-700 text-sm" 
                                            data-id="${payment.transaction_id}" data-type="payable" data-amount="${payment.amount}">
                                        Mark Paid
                                    </button>
                                ` : `
                                    <span class="text-gray-400 text-sm">Paid</span>
                                `}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    // Initialize Autocomplete
    setupPersonAutocomplete({
        inputId: 'payable-search',
        hiddenId: 'payable-search-id',
        peopleData: membersData,
        roleFilter: 'all',
        onSelect: () => filterPayableTable(activePayableFilter)
    });

    document.getElementById('payable-search').addEventListener('input', (e) => {
        if (!e.target.value.trim()) {
            document.getElementById('payable-search-id').value = '';
            filterPayableTable(activePayableFilter);
        }
    });

    // Add event listeners for payable tabs
    document.querySelectorAll('.tab-payable').forEach(btn => {
        btn.addEventListener('click', (e) => {
            activePayableFilter = e.target.getAttribute('data-filter');

            // Update active tab styling
            document.querySelectorAll('.tab-payable').forEach(b => {
                b.classList.remove('bg-blue-600');
                b.classList.add('bg-gray-700');
            });
            e.target.classList.remove('bg-gray-700');
            e.target.classList.add('bg-blue-600');

            filterPayableTable(activePayableFilter);
        });
    });

    document.getElementById('create-payable-btn').addEventListener('click', showCreatePayableModal);

    setupPaymentButtons();
    filterPayableTable(activePayableFilter);
}

function showSettleDebtModal() {
    if (!settleDebtModal) {
        settleDebtModal = new SettleDebtModal();
        settleDebtModal.init(); // Important: call init() to fetch the member list
    }

    // Show the modal and pass a callback to refresh data when done
    settleDebtModal.show(async () => {
        await loadFinanceData();
        renderCurrentView();
    });

    activeModal = settleDebtModal;
}

function showCreatePayableModal() {
    if (!createPayableModal) {
        createPayableModal = new CreatePayableModal();
    }

    createPayableModal.show();
    activeModal = createPayableModal;

    // Listen for the custom event dispatched by the modal on success
    const handlePayableCreated = () => {
        loadFinanceData().then(() => {
            renderCurrentView();
        });
        document.removeEventListener('payableCreated', handlePayableCreated);
    };

    document.addEventListener('payableCreated', handlePayableCreated);
}

function renderTransactionsView(container) {
    container.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-center mb-4">
            <h2 class="text-2xl font-bold">Transaction History</h2>
            <div class="flex items-center space-x-4 mt-2 md:mt-0">
                <div class="text-gray-400 text-sm">
                    Total: <span id="transaction-count">${transactionsData.length}</span> transactions
                </div>
                <div class="w-64 relative z-20">
                    <input type="text" id="transaction-search" class="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-blue-500" placeholder="Filter by member...">
                    <input type="hidden" id="transaction-search-id">
                </div>
            </div>
        </div>

        <div class="overflow-x-auto">
            <table class="min-w-full bg-gray-800 rounded-lg overflow-hidden">
                <thead class="bg-gray-700">
                    <tr>
                        <th class="p-3 text-left">Date</th>
                        <th class="p-3 text-left">Member</th>
                        <th class="p-3 text-left">Type</th>
                        <th class="p-3 text-left">Description</th>
                        <th class="p-3 text-right">Amount</th>
                    </tr>
                </thead>
                <tbody id="transactions-table-body">
                    ${transactionsData.map(transaction => `
                        <tr class="transaction-row border-b border-gray-700 hover:bg-gray-750 cursor-pointer" 
                            data-transaction-id="${transaction.transaction_id}" data-user-id="${transaction.user_id}">
                            <td class="p-3">
                                ${new Date(transaction.created_at).toLocaleDateString()}
                            </td>
                            <td class="p-3">
                                <div class="font-medium text-sm">${transaction.full_name || 'N/A'}</div>
                            </td>
                            <td class="p-3">
                                <span class="px-2 py-1 rounded text-xs ${transaction.transaction_direction === 'receivable' ? 'bg-green-600' : 'bg-red-600'}">
                                    ${transaction.transaction_direction === 'receivable' ? 'Income' : 'Expense'}
                                </span>
                            </td>
                            <td class="p-3">
                                <div class="text-sm">${transaction.description}</div>
                                <div class="text-xs text-gray-400">${transaction.status}</div>
                            </td>
                            <td class="p-3 text-right font-bold ${transaction.transaction_direction === 'receivable' ? 'text-green-400' : 'text-red-400'}">
                                ${transaction.transaction_direction === 'receivable' ? '+' : '-'}$${parseFloat(transaction.amount).toFixed(2)}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    // Initialize Autocomplete
    setupPersonAutocomplete({
        inputId: 'transaction-search',
        hiddenId: 'transaction-search-id',
        peopleData: membersData,
        roleFilter: 'all',
        onSelect: () => filterTransactionTable()
    });

    document.getElementById('transaction-search').addEventListener('input', (e) => {
        if (!e.target.value.trim()) {
            document.getElementById('transaction-search-id').value = '';
            filterTransactionTable();
        }
    });

    // Add click listeners to transaction rows
    setupTransactionClickListeners();
}

function filterTransactionTable() {
    const selectedUserId = document.getElementById('transaction-search-id').value;
    const rows = document.querySelectorAll('#transactions-table-body tr');
    let visibleCount = 0;

    rows.forEach(row => {
        const rowUserId = row.getAttribute('data-user-id');
        const matchesUser = !selectedUserId || rowUserId === selectedUserId;

        if (matchesUser) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });

    document.getElementById('transaction-count').textContent = visibleCount;
}

function setupTransactionClickListeners() {
    document.querySelectorAll('.transaction-row').forEach(row => {
        row.addEventListener('click', (e) => {
            const transactionId = row.getAttribute('data-transaction-id');
            const transaction = transactionsData.find(t => t.transaction_id === transactionId);

            if (transaction) {
                showTransactionDetailsModal(transaction);
            }
        });
    });
}

function showTransactionDetailsModal(transactionData) {
    closeActiveModal(); // Close any other modals first

    if (!transactionModal) {
        transactionModal = new TransactionDetailsModal();
    }

    transactionModal.show(transactionData);
}

function closeTransactionModal() {
    if (transactionModal) {
        transactionModal.hide();
    }
}

// Payment Modal Integration
function setupPaymentButtons() {
    document.querySelectorAll('.mark-paid-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const paymentId = e.target.getAttribute('data-id');
            const paymentType = e.target.getAttribute('data-type');
            const amount = e.target.getAttribute('data-amount');
            showRecordPaymentModal(paymentId, paymentType, amount);
        });
    });
}

function showRecordPaymentModal(paymentId, paymentType, amount) {
    closeActiveModal();

    const modal = new PaymentModal();

    const paymentData = {
        id: paymentId,
        type: paymentType, // 'receivable' or 'payable'
        amount: amount,
        date: new Date().toISOString().split('T')[0]
    };

    modal.show(paymentData, async () => {
        // Callback when payment is recorded successfully
        // The modal logic handles the DB update, but it might be using old code.
        // If PaymentModal is external, we assume it triggers the callback after attempt.
        // We will force a refresh here.
        await loadFinanceData();
        renderCurrentView();
    });

    activeModal = modal;
}

function showCreateInvoiceModal() {
    console.log('📝 [DEBUG] showCreateInvoiceModal called');

    if (!createInvoiceModal) {
        createInvoiceModal = new CreateInvoiceModal();
    }

    createInvoiceModal.show();
    activeModal = createInvoiceModal;

    const handleInvoiceCreated = () => {
        console.log('🔄 [DEBUG] Invoice created event received');
        loadFinanceData().then(() => {
            renderCurrentView();
        });
        document.removeEventListener('invoiceCreated', handleInvoiceCreated);
    };

    document.addEventListener('invoiceCreated', handleInvoiceCreated);
}

// Rates view
function renderRatesView(container) {
    const uniqueModels = [...new Set(planesData.map(plane => plane.model))];

    const aircraftRates = {};
    uniqueModels.forEach(model => {
        aircraftRates[model] = {
            student_hourly: null,
            instructor_hourly: null,
            standard_hourly: null,
            rates: []
        };
    });

    billingRates.forEach(rate => {
        const modelObj = planeModelsData.find(m => m.id === rate.model_id);
        const modelName = modelObj ? modelObj.model_name : 'Unknown';

        if (aircraftRates[modelName]) {
            aircraftRates[modelName].rates.push(rate);
            if (rate.rate_type === 'student_hourly') {
                aircraftRates[modelName].student_hourly = rate;
            } else if (rate.rate_type === 'standard_hourly') {
                aircraftRates[modelName].standard_hourly = rate;
            } else if (rate.rate_type === 'instructor_hourly') {
                aircraftRates[modelName].instructor_hourly = rate;
            }
        }
    });

    container.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold">Billing Rates</h2>
            <button id="add-rate-btn" class="bg-green-600 px-4 py-2 rounded hover:bg-green-700">
                + Add Rate
            </button>
        </div>

        ${uniqueModels.length === 0 ? `
            <div class="bg-gray-800 p-8 rounded-xl text-center">
                <p class="text-gray-400 text-lg mb-4">No aircraft found in the system</p>
                <p class="text-gray-500">Add aircraft to the system first to set up billing rates.</p>
            </div>
        ` : `
            <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                ${uniqueModels.map(model => `
                    <div class="bg-gray-800 p-6 rounded-xl border border-gray-700">
                        <div class="flex justify-between items-start mb-4">
                            <h3 class="font-bold text-xl text-white">${model}</h3>
                            <span class="bg-blue-600 text-xs px-2 py-1 rounded">Aircraft</span>
                        </div>
                        
                        <div class="mb-4 p-3 bg-gray-750 rounded">
                            <div class="text-sm text-gray-400">
                                <div class="flex justify-between">
                                    <span>Fleet Count:</span>
                                    <span class="text-white">${planesData.filter(p => p.model === model).length} aircraft</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="space-y-4">
                            ${/* STUDENT RATE CARD */ ''}
                            <div class="bg-gray-750 p-4 rounded-lg">
                                <div class="flex justify-between items-center mb-2">
                                    <span class="font-semibold text-gray-300">Student Rate</span>
                                    <span class="text-sm text-gray-400">per hour</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-2xl font-bold text-green-400">
                                        $${aircraftRates[model].student_hourly ? aircraftRates[model].student_hourly.amount.toFixed(2) : '0.00'}
                                    </span>
                                    ${aircraftRates[model].student_hourly ? `
                                        <button class="edit-rate-btn px-3 py-1 bg-yellow-600 rounded hover:bg-yellow-700 text-sm" 
                                                data-rate-id="${aircraftRates[model].student_hourly.id}">
                                            Edit
                                        </button>
                                    ` : `
                                        <button class="add-student-rate px-3 py-1 bg-red-600 rounded hover:bg-red-700 text-sm" 
                                                data-aircraft-model="${model}" data-rate-type="student_hourly">
                                            Add Rate
                                        </button>
                                    `}
                                </div>
                            </div>

                            ${/* INSTRUCTOR RATE CARD */ ''}
                            <div class="bg-gray-750 p-4 rounded-lg">
                                <div class="flex justify-between items-center mb-2">
                                    <span class="font-semibold text-gray-300">Instructor Rate</span>
                                    <span class="text-sm text-gray-400">per hour</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-2xl font-bold text-blue-400">
                                        $${aircraftRates[model].instructor_hourly ? aircraftRates[model].instructor_hourly.amount.toFixed(2) : '0.00'}
                                    </span>
                                    ${aircraftRates[model].instructor_hourly ? `
                                        <button class="edit-rate-btn px-3 py-1 bg-yellow-600 rounded hover:bg-yellow-700 text-sm" 
                                                data-rate-id="${aircraftRates[model].instructor_hourly.id}">
                                            Edit
                                        </button>
                                    ` : `
                                        <button class="add-instructor-rate px-3 py-1 bg-red-600 rounded hover:bg-red-700 text-sm" 
                                                data-aircraft-model="${model}" data-rate-type="instructor_hourly">
                                            Add Rate
                                        </button>
                                    `}
                                </div>
                            </div>

                            ${/* STANDARD RATE CARD */ ''}
                            <div class="bg-gray-750 p-4 rounded-lg">
                                <div class="flex justify-between items-center mb-2">
                                    <span class="font-semibold text-gray-300">Standard Rate</span>
                                    <span class="text-sm text-gray-400">per hour</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-2xl font-bold text-blue-300">
                                        $${aircraftRates[model].standard_hourly ? aircraftRates[model].standard_hourly.amount.toFixed(2) : '0.00'}
                                    </span>
                                    ${aircraftRates[model].standard_hourly ? `
                                        <button class="edit-rate-btn px-3 py-1 bg-yellow-600 rounded hover:bg-yellow-700 text-sm" 
                                                data-rate-id="${aircraftRates[model].standard_hourly.id}">
                                            Edit
                                        </button>
                                    ` : `
                                        <button class="add-standard-rate px-3 py-1 bg-red-600 rounded hover:bg-red-700 text-sm" 
                                                data-aircraft-model="${model}" data-rate-type="standard_hourly">
                                            Add Rate
                                        </button>
                                    `}
                                </div>
                            </div>

                        </div> 

                        ${/* OTHER RATES LIST */ ''}
                        ${aircraftRates[model].rates.filter(rate => !['student_hourly', 'instructor_hourly', 'standard_hourly'].includes(rate.rate_type)).length > 0 ? `
                            <div class="mt-4 pt-4 border-t border-gray-700">
                                <h4 class="font-semibold text-gray-400 mb-2">Additional Rates</h4>
                                <div class="space-y-2">
                                    ${aircraftRates[model].rates.filter(rate => !['student_hourly', 'instructor_hourly', 'standard_hourly'].includes(rate.rate_type)).map(rate => `
                                        <div class="flex justify-between items-center p-2 bg-gray-750 rounded">
                                            <div>
                                                <span class="font-medium">${rate.rate_name}</span>
                                                <span class="text-sm text-gray-400 ml-2">(${rate.rate_type})</span>
                                            </div>
                                            <div class="flex items-center space-x-2">
                                                <span class="text-green-400 font-bold">$${parseFloat(rate.amount).toFixed(2)}</span>
                                                <button class="edit-rate-btn px-2 py-1 bg-yellow-600 rounded hover:bg-yellow-700 text-xs" 
                                                        data-rate-id="${rate.id}">
                                                    Edit
                                                </button>
                                                <button class="delete-rate-btn px-2 py-1 bg-red-600 rounded hover:bg-red-700 text-xs" 
                                                        data-rate-id="${rate.id}">
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `}
        `;

    // 1. "Add Rate" (Global button)
    document.getElementById('add-rate-btn')?.addEventListener('click', () => {
        showAddRateModal();
    });

    // 2. "Add Rate" (Specific Cards)
    document.querySelectorAll('.add-student-rate, .add-standard-rate, .add-instructor-rate').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modelName = e.target.getAttribute('data-aircraft-model');
            const rateType = e.target.getAttribute('data-rate-type');

            // Resolve Model Name to ID for the modal
            const modelObj = planeModelsData.find(m => m.model_name === modelName);
            const modelId = modelObj ? modelObj.id : null;

            showAddRateModal(modelId, rateType);
        });
    });

    // 3. "Edit Rate" buttons (Updated to use new modal)
    document.querySelectorAll('.edit-rate-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const rateId = e.target.getAttribute('data-rate-id');
            const rate = billingRates.find(r => r.id === rateId);

            if (rate) {
                // Pass null for preselections, but pass the rate object as the 4th argument
                showAddRateModal(null, null, rate);
            }
        });
    });

    // 4. "Delete Rate" buttons (Keep existing logic)
    document.querySelectorAll('.delete-rate-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const rateId = e.target.getAttribute('data-rate-id');
            deleteRate(rateId);
        });
    });
}

function closeActiveModal() {
    console.log('❌ closeActiveModal called, activeModal:', activeModal);

    // Prevent multiple calls
    if (window.isClosingModal) return;
    window.isClosingModal = true;

    // Close the active modal instance
    if (activeModal) {
        // Store reference and clear immediately to prevent recursion
        const modalToClose = activeModal;
        activeModal = null;

        if (typeof modalToClose.hide === 'function') {
            modalToClose.hide();
        } else if (typeof modalToClose.close === 'function') {
            modalToClose.close();
        } else if (typeof modalToClose.destroy === 'function') {
            modalToClose.destroy();
        }
    }

    // Clear any pending timeouts
    if (modalCleanupTimeout) {
        clearTimeout(modalCleanupTimeout);
        modalCleanupTimeout = null;
    }

    // Reset the flag after a short delay
    setTimeout(() => {
        window.isClosingModal = false;
    }, 100);
}

export async function cleanupFinancePage() {
    console.log('Cleaning up finance page...');

    // Clean up active modal if exists
    if (activeModal) {
        closeActiveModal();
    }

    // Clean up transaction modal
    if (transactionModal) {
        transactionModal.hide();
        transactionModal = null;
    }

    if (settleDebtModal) {
        // Remove from DOM if needed or just hide
        if (typeof settleDebtModal.hide === 'function') settleDebtModal.hide();
        settleDebtModal = null;
    }

    // Clean up create invoice modal
    if (createInvoiceModal) {
        createInvoiceModal.destroy(); // Assuming destroy method exists
        createInvoiceModal = null;
    }

    if (createPayableModal) {
        createPayableModal.destroy();
        createPayableModal = null;
    }

    if (addRateModal) {
        addRateModal.hide(); // Or destroy if method exists
        addRateModal = null;
    }

    // Clean up any remaining modal timeouts
    if (modalCleanupTimeout) {
        clearTimeout(modalCleanupTimeout);
        modalCleanupTimeout = null;
    }

    // Remove event listeners from main content
    const mainContent = document.getElementById("main-content");
    if (mainContent) {
        mainContent.innerHTML = "";
    }

    // Remove global event listeners
    window.removeEventListener('beforeunload', cleanupFinancePage);
}

// Helper functions
function getStatusColor(status) {
    switch (status) {
        case 'paid': return 'bg-green-600';
        case 'pending': return 'bg-yellow-600';
        case 'overdue': return 'bg-red-600';
        case 'cancelled': return 'bg-gray-600';
        default: return 'bg-gray-600';
    }
}

function isThisMonth(date) {
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

/**
 * Enhanced Filter for Receivable Table
 * Filters by both Status Button and Selected Autocomplete User
 */
function filterReceivableTable(statusFilter) {
    const selectedUserId = document.getElementById('receivable-search-id') ? document.getElementById('receivable-search-id').value : '';
    const rows = document.querySelectorAll('#receivable-table-body tr');

    rows.forEach(row => {
        // 1. Check Status
        const statusCell = row.querySelector('td:nth-child(5) span');
        let statusMatch = true;
        if (statusCell) {
            const status = statusCell.textContent.toLowerCase().trim();
            if (statusFilter === 'pending') {
                statusMatch = (status === 'pending' || status === 'overdue');
            } else if (statusFilter === 'paid') {
                statusMatch = (status === 'paid');
            }
        }

        // 2. Check User ID
        const rowUserId = row.getAttribute('data-user-id');
        const userMatch = !selectedUserId || rowUserId === selectedUserId;

        // Apply
        if (statusMatch && userMatch) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

/**
 * Enhanced Filter for Payable Table
 */
function filterPayableTable(statusFilter) {
    const selectedUserId = document.getElementById('payable-search-id') ? document.getElementById('payable-search-id').value : '';
    const rows = document.querySelectorAll('#payable-table-body tr');

    rows.forEach(row => {
        // 1. Check Status
        const statusCell = row.querySelector('td:nth-child(6) span');
        let statusMatch = true;
        if (statusCell) {
            const status = statusCell.textContent.toLowerCase().trim();
            if (statusFilter === 'pending') {
                statusMatch = (status === 'pending' || status === 'overdue');
            } else if (statusFilter === 'paid') {
                statusMatch = (status === 'paid');
            }
        }

        // 2. Check User ID
        const rowUserId = row.getAttribute('data-user-id');
        const userMatch = !selectedUserId || rowUserId === selectedUserId;

        // Apply
        if (statusMatch && userMatch) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

async function deleteRate(rateId) {
    if (!confirm('Are you sure you want to delete this rate?')) return;

    try {
        const { error } = await supabase.schema('api').rpc('delete_billing_rate', {
            rate_uuid: rateId
        });

        if (error) throw error;

        showToast('Rate deleted successfully', 'success');
        await loadFinanceData();
        renderCurrentView();

    } catch (error) {
        console.error('Error deleting rate:', error);
        showToast('Error deleting rate', 'error');
    }
}