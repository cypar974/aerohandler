// ./js/pages/finance.js
import { supabase } from "../supabase.js";
import { PaymentModal } from "../modals/PaymentModal.js";
import { TransactionDetailsModal } from "../modals/TransactionDetailsModal.js";
import { CreateInvoiceModal } from "../modals/CreateInvoiceModal.js";
import { showToast } from "../components/showToast.js";

let currentView = 'overview'; // overview, receivable, payable, transactions, rates
let studentsData = [];
let instructorsData = [];
let planesData = [];
let billingRates = [];

// Payment data for each view
let receivableData = [];
let payableData = [];
let transactionsData = [];

// Modal instances
let activeModal = null;
let modalCleanupTimeout = null;
let transactionModal = null;
let createInvoiceModal = null;

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

            <!-- Navigation Tabs -->
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

            <!-- Content Area -->
            <div id="finance-content">
                <!-- Content will be loaded here based on tab -->
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
        // Load all base data
        const [
            studentsResponse,
            instructorsResponse,
            planesResponse,
            ratesResponse,
            receivableResponse,
            payableResponse,
            transactionsResponse,
            flightLogsResponse
        ] = await Promise.all([
            supabase.from("students").select("*"),
            supabase.from("instructors").select("*"),
            supabase.from("planes").select("*"),
            supabase.from("billing_rates").select("*").eq('is_active', true),
            supabase.from("payments_receivable").select("*"),
            supabase.from("payments_payable").select("*"),
            supabase.from("transaction_history").select("*").order('payment_date', { ascending: false }),
            supabase.from("flight_logs").select("*")
        ]);

        // Handle errors
        if (receivableResponse.error) console.error('Receivable error:', receivableResponse.error);
        if (payableResponse.error) console.error('Payable error:', payableResponse.error);
        if (flightLogsResponse.error) console.error('Flight logs error:', flightLogsResponse.error);

        // Set base data
        studentsData = studentsResponse.data || [];
        instructorsData = instructorsResponse.data || [];
        planesData = planesResponse.data || [];
        billingRates = ratesResponse.data || [];
        transactionsData = transactionsResponse.data || [];
        const flightLogsData = flightLogsResponse.data || [];

        // Manually join receivable data
        receivableData = (receivableResponse.data || []).map(payment => {
            const student = studentsData.find(s => s.id === payment.student_id);
            const flightLog = flightLogsData.find(f => f.id === payment.flight_log_id);

            return {
                ...payment,
                students: student ? {
                    first_name: student.first_name,
                    last_name: student.last_name,
                    email: student.email
                } : null,
                flight_logs: flightLog ? {
                    flight_date: flightLog.flight_date,
                    flight_duration: flightLog.flight_duration,
                    departure_iata: flightLog.departure_iata,
                    arrival_iata: flightLog.arrival_iata,
                    type_of_flight: flightLog.type_of_flight
                } : null
            };
        });

        // Manually join payable data
        payableData = (payableResponse.data || []).map(payment => {
            let instructor = null;
            const flightLog = flightLogsData.find(f => f.id === payment.flight_log_id);

            // Only look for instructor if payee_type is 'instructor' and payee_id exists
            if (payment.payee_type === 'instructor' && payment.payee_id) {
                instructor = instructorsData.find(i => i.id === payment.payee_id);
            }

            return {
                ...payment,
                instructors: instructor ? {
                    first_name: instructor.first_name,
                    last_name: instructor.last_name,
                    email: instructor.email
                } : null,
                flight_logs: flightLog ? {
                    flight_date: flightLog.flight_date,
                    flight_duration: flightLog.flight_duration,
                    departure_iata: flightLog.departure_iata,
                    arrival_iata: flightLog.arrival_iata,
                    type_of_flight: flightLog.type_of_flight
                } : null
            };
        });

        console.log('Loaded data:', {
            students: studentsData.length,
            instructors: instructorsData.length,
            receivable: receivableData.length,
            payable: payableData.length,
            transactions: transactionsData.length
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

    const monthlyRevenue = transactionsData
        .filter(t => t.transaction_type === 'incoming' && isThisMonth(new Date(t.payment_date)))
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const monthlyExpenses = transactionsData
        .filter(t => t.transaction_type === 'outgoing' && isThisMonth(new Date(t.payment_date)))
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
                                <div class="font-medium ${transaction.transaction_type === 'incoming' ? 'text-green-400' : 'text-red-400'}">
                                    ${transaction.description}
                                </div>
                                <div class="text-sm text-gray-400">
                                    ${new Date(transaction.payment_date).toLocaleDateString()} • ${transaction.payment_method}
                                </div>
                            </div>
                            <div class="font-bold ${transaction.transaction_type === 'incoming' ? 'text-green-400' : 'text-red-400'}">
                                ${transaction.transaction_type === 'incoming' ? '+' : '-'}$${transaction.amount.toFixed(2)}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="bg-gray-800 p-6 rounded-xl">
                <h3 class="text-xl font-semibold mb-4">Overdue Payments</h3>
                <div class="space-y-2">
                    ${[...receivableData, ...payableData]
            .filter(p => p.status === 'pending' && new Date(p.due_date) < new Date())
            .slice(0, 5)
            .map(payment => `
                        <div class="flex justify-between items-center p-3 bg-red-900 rounded">
                            <div>
                                <div class="font-medium">
    ${payment.students ? `${payment.students.first_name} ${payment.students.last_name}` :
                    payment.instructors ? `${payment.instructors.first_name} ${payment.instructors.last_name}` :
                        payment.payee_name}
</div>
                                <div class="text-sm text-gray-400">
                                    Due: ${new Date(payment.due_date).toLocaleDateString()}
                                </div>
                            </div>
                            <div class="text-red-400 font-bold">
                                $${payment.amount.toFixed(2)}
                            </div>
                        </div>
                    `).join('')}
                    ${[...receivableData, ...payableData].filter(p => p.status === 'pending' && new Date(p.due_date) < new Date()).length === 0 ?
            '<p class="text-gray-400 text-center">No overdue payments</p>' : ''}
                </div>
            </div>
        </div>
    `;
}

function renderReceivableView(container) {
    const pendingReceivable = receivableData.filter(p => p.status === 'pending');
    const paidReceivable = receivableData.filter(p => p.status === 'paid');

    container.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-bold">Payments Receivable</h2>
            <div class="flex space-x-2">
                <button id="create-invoice-btn" class="bg-green-600 px-4 py-2 rounded hover:bg-green-700">
                    + Create Invoice
                </button>
            </div>
        </div>

        <div class="mb-4">
            <div class="flex space-x-4">
                <button class="tab-receivable px-4 py-2 bg-blue-600 rounded" data-filter="all">All (${receivableData.length})</button>
                <button class="tab-receivable px-4 py-2 bg-gray-700 rounded" data-filter="pending">Pending (${pendingReceivable.length})</button>
                <button class="tab-receivable px-4 py-2 bg-gray-700 rounded" data-filter="paid">Paid (${paidReceivable.length})</button>
            </div>
        </div>

        <div class="overflow-x-auto">
            <table class="min-w-full bg-gray-800 rounded-lg overflow-hidden">
                <thead class="bg-gray-700">
                    <tr>
                        <th class="p-3 text-left">Student</th>
                        <th class="p-3 text-left">Description</th>
                        <th class="p-3 text-right">Amount</th>
                        <th class="p-3 text-left">Due Date</th>
                        <th class="p-3 text-center">Status</th>
                        <th class="p-3 text-center">Actions</th>
                    </tr>
                </thead>
                <tbody id="receivable-table-body">
                    ${receivableData.map(payment => `
                        <tr class="border-b border-gray-700 hover:bg-gray-750">
                            <td class="p-3">
                                <div class="font-medium">${payment.students ? `${payment.students.first_name} ${payment.students.last_name}` : 'N/A'}</div>
                                <div class="text-sm text-gray-400">${payment.students?.email || ''}</div>
                            </td>
                            <td class="p-3">
                                <div class="text-sm">${payment.description}</div>
                                ${payment.flight_logs && payment.flight_logs.departure_iata ? `
    <div class="text-xs text-gray-400">
        ${payment.flight_logs.departure_iata}→${payment.flight_logs.arrival_iata} • ${payment.flight_logs.flight_duration}h
    </div>
` : ''}
                            </td>
                            <td class="p-3 text-right font-bold text-green-400">
                                $${payment.amount.toFixed(2)}
                            </td>
                            <td class="p-3">
                                ${new Date(payment.due_date).toLocaleDateString()}
                                ${new Date(payment.due_date) < new Date() && payment.status === 'pending' ?
            '<span class="text-red-400 text-sm ml-2">(Overdue)</span>' : ''}
                            </td>
                            <td class="p-3 text-center">
                                <span class="px-2 py-1 rounded text-xs ${getStatusColor(payment.status)}">
                                    ${payment.status}
                                </span>
                            </td>
                            <td class="p-3 text-center">
                                ${payment.status === 'pending' ? `
                                    <button class="mark-paid-btn px-3 py-1 bg-green-600 rounded hover:bg-green-700 text-sm" 
                                            data-id="${payment.id}" data-type="receivable" data-amount="${payment.amount}">
                                        Mark Paid
                                    </button>
                                ` : `
                                    <span class="text-gray-400 text-sm">Paid on ${payment.paid_at ? new Date(payment.paid_at).toLocaleDateString() : 'N/A'}</span>
                                `}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    // Add event listeners for receivable tabs
    document.querySelectorAll('.tab-receivable').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const filter = e.target.getAttribute('data-filter');

            // Update active tab styling
            document.querySelectorAll('.tab-receivable').forEach(b => {
                b.classList.remove('bg-blue-600');
                b.classList.add('bg-gray-700');
            });
            e.target.classList.remove('bg-gray-700');
            e.target.classList.add('bg-blue-600');

            filterReceivableTable(filter);
        });
    });

    document.getElementById('create-invoice-btn').addEventListener('click', showCreateInvoiceModal);
    setupPaymentButtons();
}

function renderPayableView(container) {
    const pendingPayable = payableData.filter(p => p.status === 'pending');
    const paidPayable = payableData.filter(p => p.status === 'paid');

    container.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-bold">Payments Payable</h2>
        </div>

        <div class="mb-4">
            <div class="flex space-x-4">
                <button class="tab-payable px-4 py-2 bg-blue-600 rounded" data-filter="all">All (${payableData.length})</button>
                <button class="tab-payable px-4 py-2 bg-gray-700 rounded" data-filter="pending">Pending (${pendingPayable.length})</button>
                <button class="tab-payable px-4 py-2 bg-gray-700 rounded" data-filter="paid">Paid (${paidPayable.length})</button>
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
                        <tr class="border-b border-gray-700 hover:bg-gray-750">
                            <td class="p-3">
                                <div class="font-medium">${payment.payee_name}</div>
                                <div class="text-sm text-gray-400">${payment.instructors ? `${payment.instructors.first_name} ${payment.instructors.last_name}` : payment.payee_type}</div>
                            </td>
                            <td class="p-3">
                                <span class="px-2 py-1 bg-gray-700 rounded text-xs">${payment.payee_type}</span>
                            </td>
                            <td class="p-3">
                                <div class="text-sm">${payment.description}</div>
                                ${payment.flight_logs ? `
    <div class="text-xs text-gray-400">
        ${payment.flight_logs.departure_iata}→${payment.flight_logs.arrival_iata} • ${payment.flight_logs.flight_duration}h
    </div>
` : ''}
                            </td>
                            <td class="p-3 text-right font-bold text-red-400">
                                $${payment.amount.toFixed(2)}
                            </td>
                            <td class="p-3">
                                ${new Date(payment.due_date).toLocaleDateString()}
                                ${new Date(payment.due_date) < new Date() && payment.status === 'pending' ?
            '<span class="text-red-400 text-sm ml-2">(Overdue)</span>' : ''}
                            </td>
                            <td class="p-3 text-center">
                                <span class="px-2 py-1 rounded text-xs ${getStatusColor(payment.status)}">
                                    ${payment.status}
                                </span>
                            </td>
                            <td class="p-3 text-center">
                                ${payment.status === 'pending' ? `
                                    <button class="mark-paid-btn px-3 py-1 bg-green-600 rounded hover:bg-green-700 text-sm" 
                                            data-id="${payment.id}" data-type="payable" data-amount="${payment.amount}">
                                        Mark Paid
                                    </button>
                                ` : `
                                    <span class="text-gray-400 text-sm">Paid on ${payment.paid_at ? new Date(payment.paid_at).toLocaleDateString() : 'N/A'}</span>
                                `}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    // Add event listeners for payable tabs
    document.querySelectorAll('.tab-payable').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const filter = e.target.getAttribute('data-filter');

            // Update active tab styling
            document.querySelectorAll('.tab-payable').forEach(b => {
                b.classList.remove('bg-blue-600');
                b.classList.add('bg-gray-700');
            });
            e.target.classList.remove('bg-gray-700');
            e.target.classList.add('bg-blue-600');

            filterPayableTable(filter);
        });
    });

    setupPaymentButtons();
}

function renderTransactionsView(container) {
    container.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-bold">Transaction History</h2>
            <div class="text-gray-400">
                Total: ${transactionsData.length} transactions
            </div>
        </div>

        <div class="overflow-x-auto">
            <table class="min-w-full bg-gray-800 rounded-lg overflow-hidden">
                <thead class="bg-gray-700">
                    <tr>
                        <th class="p-3 text-left">Date</th>
                        <th class="p-3 text-left">Type</th>
                        <th class="p-3 text-left">Description</th>
                        <th class="p-3 text-left">Method</th>
                        <th class="p-3 text-right">Amount</th>
                        <th class="p-3 text-left">Reference</th>
                    </tr>
                </thead>
                <tbody>
                    ${transactionsData.map(transaction => `
                        <tr class="transaction-row border-b border-gray-700 hover:bg-gray-750 cursor-pointer" 
                            data-transaction-id="${transaction.id}">
                            <td class="p-3">
                                ${new Date(transaction.payment_date).toLocaleDateString()}
                            </td>
                            <td class="p-3">
                                <span class="px-2 py-1 rounded text-xs ${transaction.transaction_type === 'incoming' ? 'bg-green-600' : 'bg-red-600'}">
                                    ${transaction.transaction_type === 'incoming' ? 'Income' : 'Expense'}
                                </span>
                            </td>
                            <td class="p-3">
                                <div class="text-sm">${transaction.description}</div>
                                <div class="text-xs text-gray-400">${transaction.notes || ''}</div>
                            </td>
                            <td class="p-3">
                                <span class="text-sm capitalize">${transaction.payment_method}</span>
                            </td>
                            <td class="p-3 text-right font-bold ${transaction.transaction_type === 'incoming' ? 'text-green-400' : 'text-red-400'}">
                                ${transaction.transaction_type === 'incoming' ? '+' : '-'}$${transaction.amount.toFixed(2)}
                            </td>
                            <td class="p-3 text-sm text-gray-400">
                                ${transaction.reference_number || 'N/A'}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    // Add click listeners to transaction rows
    setupTransactionClickListeners();
}

function setupTransactionClickListeners() {
    document.querySelectorAll('.transaction-row').forEach(row => {
        row.addEventListener('click', (e) => {
            const transactionId = row.getAttribute('data-transaction-id');
            const transaction = transactionsData.find(t => t.id === transactionId);

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
        type: paymentType,
        amount: amount,
        date: new Date().toISOString().split('T')[0]
    };

    modal.show(paymentData, async () => {
        // Callback when payment is recorded successfully
        await loadFinanceData();
        renderCurrentView();
    });

    activeModal = modal;
}

function showCreateInvoiceModal() {
    console.log('📝 [DEBUG] showCreateInvoiceModal called');
    console.log('📝 [DEBUG] createInvoiceModal:', createInvoiceModal);

    // Don't close active modal for invoice creation
    // closeActiveModal();

    // Initialize the modal if it doesn't exist
    if (!createInvoiceModal) {
        console.log('🔄 [DEBUG] Creating new CreateInvoiceModal instance');
        createInvoiceModal = new CreateInvoiceModal();
        console.log('🔄 [DEBUG] createInvoiceModal after creation:', createInvoiceModal);
    }

    // Check if modal element exists
    const modalElement = document.getElementById('invoice-modal');
    console.log('📝 [DEBUG] Modal element exists:', !!modalElement);
    if (modalElement) {
        console.log('📝 [DEBUG] Modal hidden status:', modalElement.classList.contains('hidden'));
    }

    // Show the modal
    console.log('📝 [DEBUG] Calling createInvoiceModal.show()');
    createInvoiceModal.show();
    activeModal = createInvoiceModal;

    // Verify modal is shown
    setTimeout(() => {
        const modalElementAfter = document.getElementById('invoice-modal');
        console.log('📝 [DEBUG] After show - Modal hidden status:', modalElementAfter?.classList.contains('hidden'));
    }, 100);

    // Listen for invoice creation to refresh data
    const handleInvoiceCreated = () => {
        console.log('🔄 [DEBUG] Invoice created event received');
        loadFinanceData().then(() => {
            renderCurrentView();
        });
        document.removeEventListener('invoiceCreated', handleInvoiceCreated);
    };

    document.addEventListener('invoiceCreated', handleInvoiceCreated);

    console.log('✅ [DEBUG] showCreateInvoiceModal completed');
}

// Rates view
function renderRatesView(container) {
    // Get unique aircraft models from planes table
    const uniqueModels = [...new Set(planesData.map(plane => plane.model))];

    // Group rates by aircraft model
    const aircraftRates = {};
    uniqueModels.forEach(model => {
        aircraftRates[model] = {
            student_hourly: null,
            instructor_hourly: null,
            rates: []
        };
    });

    // Populate with existing rates
    billingRates.forEach(rate => {
        const model = rate.aircraft_type;
        if (aircraftRates[model]) {
            aircraftRates[model].rates.push(rate);

            if (rate.rate_type === 'student_hourly') {
                aircraftRates[model].student_hourly = rate;
            } else if (rate.rate_type === 'instructor_hourly') {
                aircraftRates[model].instructor_hourly = rate;
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
                        
                        <!-- Aircraft Details -->
                        <div class="mb-4 p-3 bg-gray-750 rounded">
                            <div class="text-sm text-gray-400">
                                <div class="flex justify-between">
                                    <span>Fleet Count:</span>
                                    <span class="text-white">${planesData.filter(p => p.model === model).length} aircraft</span>
                                </div>
                                <div class="flex justify-between mt-1">
                                    <span>Available:</span>
                                    <span class="text-green-400">${planesData.filter(p => p.model === model && p.status === 'available').length}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="space-y-4">
                            <!-- Student Rate -->
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
                                        <button class="add-student-rate px-3 py-1 bg-blue-600 rounded hover:bg-blue-700 text-sm" 
                                                data-aircraft-model="${model}" data-rate-type="student_hourly">
                                            Add Rate
                                        </button>
                                    `}
                                </div>
                                ${aircraftRates[model].student_hourly ? `
                                    <p class="text-sm text-gray-400 mt-2">${aircraftRates[model].student_hourly.description || 'Hourly rate for students'}</p>
                                ` : ''}
                            </div>

                            <!-- Instructor Rate -->
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
                                        <button class="add-instructor-rate px-3 py-1 bg-blue-600 rounded hover:bg-blue-700 text-sm" 
                                                data-aircraft-model="${model}" data-rate-type="instructor_hourly">
                                            Add Rate
                                        </button>
                                    `}
                                </div>
                                ${aircraftRates[model].instructor_hourly ? `
                                    <p class="text-sm text-gray-400 mt-2">${aircraftRates[model].instructor_hourly.description || 'Hourly rate for instructors'}</p>
                                ` : ''}
                            </div>
                        </div>

                        <!-- Additional Rates -->
                        ${aircraftRates[model].rates.filter(rate => !['student_hourly', 'instructor_hourly'].includes(rate.rate_type)).length > 0 ? `
                            <div class="mt-4">
                                <h4 class="font-semibold text-gray-400 mb-2">Additional Rates</h4>
                                <div class="space-y-2">
                                    ${aircraftRates[model].rates.filter(rate => !['student_hourly', 'instructor_hourly'].includes(rate.rate_type)).map(rate => `
                                        <div class="flex justify-between items-center p-2 bg-gray-750 rounded">
                                            <div>
                                                <span class="font-medium">${rate.rate_name}</span>
                                                <span class="text-sm text-gray-400 ml-2">(${rate.rate_type})</span>
                                            </div>
                                            <div class="flex items-center space-x-2">
                                                <span class="text-green-400 font-bold">$${rate.amount.toFixed(2)}</span>
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

        <!-- Add/Edit Rate Modal -->
        <div id="rate-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-gray-900 p-6 rounded-xl w-1/3 shadow-lg">
                <h2 id="rate-modal-title" class="text-xl font-bold mb-4">Add Rate</h2>
                <form id="rate-form" class="space-y-4">
                    <input type="hidden" id="rate-id">
                    <div>
                        <label class="block mb-1">Aircraft Model</label>
                        <select id="rate-aircraft-model" class="w-full px-3 py-2 rounded bg-gray-700 text-white" required>
                            <option value="">Select Aircraft Model</option>
                            ${uniqueModels.map(model => `
                                <option value="${model}">${model}</option>
                            `).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block mb-1">Rate Type</label>
                        <select id="rate-type" class="w-full px-3 py-2 rounded bg-gray-700 text-white" required>
                            <option value="">Select Rate Type</option>
                            <option value="student_hourly">Student Hourly Rate</option>
                            <option value="instructor_hourly">Instructor Hourly Rate</option>
                            <option value="ground_instruction">Ground Instruction</option>
                            <option value="checkride_prep">Checkride Preparation</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div id="rate-name-container" class="hidden">
                        <label class="block mb-1">Rate Name</label>
                        <input type="text" id="rate-name" class="w-full px-3 py-2 rounded bg-gray-700 text-white" placeholder="Enter rate name">
                    </div>
                    <div>
                        <label class="block mb-1">Amount ($)</label>
                        <input type="number" step="0.01" id="rate-amount" class="w-full px-3 py-2 rounded bg-gray-700 text-white" required>
                    </div>
                    <div>
                        <label class="block mb-1">Description</label>
                        <textarea id="rate-description" rows="3" class="w-full px-3 py-2 rounded bg-gray-700 text-white" placeholder="Optional description"></textarea>
                    </div>
                    <div class="flex justify-end space-x-2">
                        <button type="button" id="cancel-rate" class="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded">Cancel</button>
                        <button type="submit" class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded">Save Rate</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Add event listeners
    document.getElementById('add-rate-btn')?.addEventListener('click', () => showRateModal());

    document.querySelectorAll('.edit-rate-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const rateId = e.target.getAttribute('data-rate-id');
            const rate = billingRates.find(r => r.id === rateId);
            if (rate) showRateModal(rate);
        });
    });

    document.querySelectorAll('.add-student-rate, .add-instructor-rate').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const aircraftModel = e.target.getAttribute('data-aircraft-model');
            const rateType = e.target.getAttribute('data-rate-type');
            showRateModal(null, aircraftModel, rateType);
        });
    });

    document.querySelectorAll('.delete-rate-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const rateId = e.target.getAttribute('data-rate-id');
            deleteRate(rateId);
        });
    });

    // Rate modal event listeners
    document.getElementById('cancel-rate')?.addEventListener('click', () => {
        document.getElementById('rate-modal').classList.add('hidden');
    });

    document.getElementById('rate-type')?.addEventListener('change', (e) => {
        const showNameField = e.target.value === 'other';
        document.getElementById('rate-name-container').classList.toggle('hidden', !showNameField);
    });

    document.getElementById('rate-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveRate();
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

    // Clean up create invoice modal - ADD THIS
    if (createInvoiceModal) {
        createInvoiceModal.destroy();
        createInvoiceModal = null;
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

function filterReceivableTable(filter) {
    const rows = document.querySelectorAll('#receivable-table-body tr');

    rows.forEach(row => {
        const statusCell = row.querySelector('td:nth-child(5) span');
        if (!statusCell) return;

        const status = statusCell.textContent.toLowerCase().trim();

        if (filter === 'all') {
            row.style.display = '';
        } else if (filter === 'pending') {
            row.style.display = status === 'pending' ? '' : 'none';
        } else if (filter === 'paid') {
            row.style.display = status === 'paid' ? '' : 'none';
        }
    });
}

function filterPayableTable(filter) {
    const rows = document.querySelectorAll('#payable-table-body tr');

    rows.forEach(row => {
        const statusCell = row.querySelector('td:nth-child(6) span');
        if (!statusCell) return;

        const status = statusCell.textContent.toLowerCase().trim();

        if (filter === 'all') {
            row.style.display = '';
        } else if (filter === 'pending') {
            row.style.display = status === 'pending' ? '' : 'none';
        } else if (filter === 'paid') {
            row.style.display = status === 'paid' ? '' : 'none';
        }
    });
}

// Rate management functions (unchanged)
function showRateModal(rate = null, aircraftModel = null, rateType = null) {
    // Implementation for rate modal...
}

async function saveRate() {
    // Implementation for saving rates...
}

async function deleteRate(rateId) {
    // Implementation for deleting rates...
}
