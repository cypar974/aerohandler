import { supabase } from "../supabase.js";
import { showToast } from "../components/showToast.js";

export class TransactionDetailsModal {
    constructor() {
        this.modal = null;
        this.currentTransaction = null;
        this.paymentType = null;
    }

    show(transactionData) {
        this.currentTransaction = transactionData;

        if (!this.modal) {
            this.createModal();
        }


        this.showLoadingState();
        this.modal.classList.remove('hidden');


        requestAnimationFrame(() => {
            if (this.modal && this.modal.parentNode) {
                const modalContent = this.modal.querySelector('.bg-gray-900');
                if (modalContent) {
                    modalContent.classList.remove("scale-95", "opacity-0");
                    modalContent.classList.add("scale-100", "opacity-100");
                }


                this.populateData(transactionData);
            }
        });
    }

    hide() {
        if (this.modal) {

            const modalContent = this.modal.querySelector('.bg-gray-900');
            if (modalContent) {
                modalContent.classList.remove("scale-100", "opacity-100");
                modalContent.classList.add("scale-95", "opacity-0");
            }


            setTimeout(() => {
                this.modal.classList.add('hidden');
            }, 300);
        }
    }

    createModal() {
        this.modal = document.createElement('div');
        this.modal.id = 'transaction-details-modal';
        this.modal.className = 'hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm';
        this.modal.innerHTML = `
        <div class="bg-gray-900 p-6 rounded-xl w-full max-w-2xl shadow-lg max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-95 opacity-0 custom-scrollbar">
            <div class="flex justify-between items-center mb-6">
                <div class="flex items-center space-x-3">
                    <h2 class="text-2xl font-bold">Transaction Details</h2>
                    <div id="modal-loading-indicator" class="hidden flex items-center space-x-2">
                        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                        <span class="text-sm text-gray-400">Loading...</span>
                    </div>
                </div>
                <button id="close-transaction-modal" class="text-gray-400 hover:text-white text-2xl transition-colors">
                    &times;
                </button>
            </div>

            <div id="transaction-details-content">
                </div>

            <div class="flex justify-end space-x-2 mt-6 pt-4 border-t border-gray-700">
                <button id="close-transaction-details" class="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors">
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
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('close-transaction-modal').addEventListener('click', () => {
            this.hide();
        });

        document.getElementById('close-transaction-details').addEventListener('click', () => {
            this.hide();
        });


        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hide();
            }
        });


        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });
    }
    generatePaymentHTML(paymentData, relatedDetails) {

        const canEdit = true;
        const canMarkPaid = true;


        const isReceivable = this.paymentType === 'receivable';
        const amountClass = isReceivable ? 'text-green-400' : 'text-red-400';
        const statusColor = getStatusColor(paymentData.status);

        return `
        <div class="space-y-6">
            <div class="bg-gray-800 p-4 rounded-lg">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="text-lg font-semibold">${paymentData.description || 'No Description'}</h3>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Direction:</span>
                            <span class="capitalize">${this.paymentType}</span>
                        </div>
                        <p class="text-gray-400 text-sm">Due: ${new Date(paymentData.due_date).toLocaleDateString()}</p>
                    </div>
                    <div class="text-right">
                        <div class="text-2xl font-bold ${amountClass}">
                            $${parseFloat(paymentData.amount).toFixed(2)}
                        </div>
                        <span class="px-2 py-1 rounded text-xs ${statusColor}">
                            ${paymentData.status}
                        </span>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-gray-800 p-4 rounded-lg">
                    <h4 class="font-semibold mb-3 text-gray-300">Transaction Info</h4>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-400">Category:</span>
                            <span class="capitalize">${paymentData.transaction_type || 'N/A'}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Due Date:</span>
                            <span>${new Date(paymentData.due_date).toLocaleDateString()}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Created:</span>
                            <span>${new Date(paymentData.created_at).toLocaleDateString()}</span>
                        </div>
                        ${paymentData.paid_at ? `
                            <div class="flex justify-between">
                                <span class="text-gray-400">Paid At:</span>
                                <span>${new Date(paymentData.paid_at).toLocaleDateString()}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div class="bg-gray-800 p-4 rounded-lg">
                    <h4 class="font-semibold mb-3 text-gray-300">Status & Method</h4>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-400">Status:</span>
                            <span class="px-2 py-1 rounded text-xs ${statusColor}">${paymentData.status}</span>
                        </div>
                        ${paymentData.payment_method ? `
                            <div class="flex justify-between">
                                <span class="text-gray-400">Payment Method:</span>
                                <span class="capitalize">${paymentData.payment_method}</span>
                            </div>
                        ` : ''}
                        ${paymentData.reference_number ? `
                            <div class="flex justify-between">
                                <span class="text-gray-400">Reference:</span>
                                <span class="font-mono">${paymentData.reference_number}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>

            ${this.generateRelatedEntitiesHTML(relatedDetails)}

            ${relatedDetails.flightLog ? this.generateFlightInfoHTML(relatedDetails.flightLog) : ''}

            ${paymentData.notes ? `
                <div class="bg-gray-800 p-4 rounded-lg">
                    <h4 class="font-semibold mb-3 text-gray-300">Notes</h4>
                    <p class="text-gray-300">${paymentData.notes}</p>
                </div>
            ` : ''}

            ${paymentData.status === 'pending' || paymentData.status === 'overdue' ? `
                <div class="bg-gray-800 p-4 rounded-lg">
                    <h4 class="font-semibold mb-3 text-gray-300">Actions</h4>
                    <div class="flex space-x-2">
                        ${canMarkPaid ? `
                        <button class="mark-paid-action px-4 py-2 bg-green-600 rounded hover:bg-green-700 text-sm">
                            Mark as Paid
                        </button>` : ''}
                        ${canEdit ? `
                        <button class="edit-payment-action px-4 py-2 bg-yellow-600 rounded hover:bg-yellow-700 text-sm">
                            Edit Transaction
                        </button>` : ''}
                    </div>
                </div>
            ` : ''}
        </div>
    `;

        function getStatusColor(status) {

            switch (status) {
                case 'paid': return 'bg-green-600';
                case 'pending': return 'bg-yellow-600';
                case 'overdue': return 'bg-red-600';
                case 'cancelled': return 'bg-gray-600';
                default: return 'bg-gray-600';
            }
        }
    }

    async populateData(transactionData, isPayment = false) {
        try {

            this.updateLoadingProgress(0, "Starting to load transaction details...");

            const content = document.getElementById('transaction-details-content');


            const transactionId = transactionData.transaction_id || transactionData.id;

            this.updateLoadingProgress(30, "Fetching fresh transaction data...");




            const { data: fullRecord, error } = await supabase
                .schema('api')
                .rpc('get_financial_ledger')
                .eq('transaction_id', transactionId)
                .single();

            if (error) throw error;


            this.paymentType = fullRecord.transaction_direction;

            let relatedDetails = {
                person: {
                    id: fullRecord.user_auth_id,
                    full_name: fullRecord.full_name,
                    email: fullRecord.email,
                    role: fullRecord.user_role
                }
            };


            if (fullRecord.flight_log_id) {
                this.updateLoadingProgress(60, "Fetching flight log...");
                const { data: flightData } = await supabase
                    .schema('api').rpc('get_flight_log_by_id', { log_uuid: fullRecord.flight_log_id })
                    .single();

                relatedDetails.flightLog = flightData;
            }




            const displayData = fullRecord;

            this.updateLoadingProgress(100, "Finalizing display...");
            await new Promise(resolve => setTimeout(resolve, 300));


            if (content) {
                content.style.opacity = '0.7';
                content.style.transition = 'opacity 0.4s ease';

                await new Promise(resolve => setTimeout(resolve, 200));

                if (displayData.status === 'pending' || displayData.status === 'overdue') {
                    content.innerHTML = this.generatePaymentHTML(displayData, relatedDetails);
                } else {
                    content.innerHTML = this.generateTransactionHTML(displayData, relatedDetails);
                }

                await new Promise(resolve => setTimeout(resolve, 50));
                content.style.opacity = '1';
            }

            this.setupProfileLinks();
            this.hideLoadingState();

        } catch (error) {
            console.error('Error populating transaction details:', error);
            this.showErrorState('Error loading transaction details');
            showToast('Error loading transaction details', 'error');
        }
    }

    showLoadingState() {
        const content = document.getElementById('transaction-details-content');
        const headerIndicator = document.getElementById('modal-loading-indicator');


        if (!headerIndicator && this.modal) {
            const header = this.modal.querySelector('.flex.justify-between.items-center.mb-6');
            if (header) {
                const loadingIndicator = document.createElement('div');
                loadingIndicator.id = 'modal-loading-indicator';
                loadingIndicator.className = 'hidden flex items-center space-x-2 ml-4';
                loadingIndicator.innerHTML = `
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <span class="text-sm text-gray-400">Loading...</span>
            `;
                header.querySelector('div')?.appendChild(loadingIndicator);
            }
        }

        if (headerIndicator) {
            headerIndicator.classList.remove('hidden');
        }

        if (content) {
            content.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                <div class="text-lg text-gray-300">Loading transaction details...</div>
                <div class="text-sm text-gray-500 mt-2">Fetching financial data...</div>
                <div class="mt-4 w-64 bg-gray-700 rounded-full h-2">
                    <div class="bg-blue-500 h-2 rounded-full animate-pulse"></div>
                </div>
            </div>
        `;
        }
    }

    hideLoadingState() {
        const headerIndicator = document.getElementById('modal-loading-indicator');
        if (headerIndicator) {
            headerIndicator.classList.add('hidden');
        }
    }

    showErrorState(message) {
        const content = document.getElementById('transaction-details-content');
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
            if (retryBtn && this.currentTransaction) {
                retryBtn.addEventListener('click', () => {
                    this.populateData(this.currentTransaction);
                });
            }
        }
    }

    updateLoadingProgress(percent, message) {
        const content = document.getElementById('transaction-details-content');
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
                Preparing transaction details for viewing
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
        </div>
    `;
    }


    async fetchRelatedDetails(sourceTable, sourceId) {

        return {};
    }

    generateTransactionHTML(transaction, relatedDetails) {

        const isIncoming = transaction.transaction_direction === 'receivable';
        const amountClass = isIncoming ? 'text-green-400' : 'text-red-400';
        const amountSign = isIncoming ? '+' : '-';


        const dateDisplay = transaction.paid_at
            ? new Date(transaction.paid_at).toLocaleDateString()
            : new Date(transaction.created_at).toLocaleDateString();

        return `
            <div class="space-y-6">
                <div class="bg-gray-800 p-4 rounded-lg">
                    <div class="flex justify-between items-start">
                        <div>
                            <h3 class="text-lg font-semibold">${transaction.description}</h3>
                            <p class="text-gray-400">${dateDisplay}</p>
                        </div>
                        <div class="text-right">
                            <div class="text-2xl font-bold ${amountClass}">
                                ${amountSign}$${parseFloat(transaction.amount).toFixed(2)}
                            </div>
                            <span class="px-2 py-1 rounded text-xs ${isIncoming ? 'bg-green-600' : 'bg-red-600'}">
                                ${isIncoming ? 'Income' : 'Expense'}
                            </span>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-gray-800 p-4 rounded-lg">
                        <h4 class="font-semibold mb-3 text-gray-300">Transaction Information</h4>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-400">Payment Method:</span>
                                <span class="capitalize">${transaction.payment_method || 'N/A'}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-400">Reference Number:</span>
                                <span class="font-mono">${transaction.reference_number || 'N/A'}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-400">Type:</span>
                                <span class="capitalize">${transaction.transaction_type}</span>
                            </div>
                        </div>
                    </div>

                    <div class="bg-gray-800 p-4 rounded-lg">
                        <h4 class="font-semibold mb-3 text-gray-300">Additional Information</h4>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-400">Created:</span>
                                <span>${new Date(transaction.created_at).toLocaleDateString()}</span>
                            </div>
                             <div class="flex justify-between">
                                <span class="text-gray-400">Status:</span>
                                <span class="capitalize text-yellow-500">${transaction.status}</span>
                            </div>
                            ${transaction.notes ? `
                                <div>
                                    <span class="text-gray-400 block mb-1">Notes:</span>
                                    <p class="text-gray-300">${transaction.notes}</p>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>

                ${this.generateRelatedEntitiesHTML(relatedDetails)}

                ${relatedDetails.flightLog ? this.generateFlightInfoHTML(relatedDetails.flightLog) : ''}
            </div>
        `;
    }

    generateRelatedEntitiesHTML(relatedDetails) {
        if (!relatedDetails.person) return '';

        const person = relatedDetails.person;
        const role = person.role;

        return `
            <div class="bg-gray-800 p-4 rounded-lg">
                <h4 class="font-semibold mb-3 text-gray-300">Associated Person (${role || 'User'})</h4>
                <div class="flex items-center justify-between">
                    <div>
                        <div class="font-medium">${person.full_name}</div>
                        <div class="text-sm text-gray-400">${person.email || 'No email'}</div>
                    </div>
                    ${role === 'student' ? `
                    <button class="view-student-profile px-3 py-1 bg-blue-600 rounded hover:bg-blue-700 text-sm"
                            data-student-id="${person.id}">
                        View Profile
                    </button>` : ''}
                    ${role === 'instructor' ? `
                    <button class="view-instructor-profile px-3 py-1 bg-blue-600 rounded hover:bg-blue-700 text-sm"
                            data-instructor-id="${person.id}">
                        View Profile
                    </button>` : ''}
                </div>
            </div>
        `;
    }

    generateFlightInfoHTML(flightLog) {
        return `
        <div class="bg-gray-800 p-4 rounded-lg">
            <h4 class="font-semibold mb-3 text-gray-300">Flight Information</h4>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                    <div class="text-gray-400">Route</div>
                    <div class="font-medium">${flightLog.departure_icao} → ${flightLog.arrival_icao}</div>
                </div>
                <div>
                    <div class="text-gray-400">Date</div>
                    <div>${new Date(flightLog.flight_date).toLocaleDateString()}</div>
                </div>
                <div>
                    <div class="text-gray-400">Duration</div>
                    <div>${flightLog.flight_duration}h</div>
                </div>
                <div>
                    <div class="text-gray-400">Nature</div>
                    <div class="capitalize">${flightLog.nature_of_flight || 'N/A'}</div>
                </div>
            </div>
            ${flightLog.remarks ? `
                <div class="mt-3">
                    <div class="text-gray-400 text-sm">Remarks</div>
                    <div class="text-gray-300">${flightLog.remarks}</div>
                </div>
            ` : ''}
        </div>
    `;
    }

    setupProfileLinks() {

        document.querySelectorAll('.view-student-profile').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const studentId = e.target.getAttribute('data-student-id');
                this.navigateToStudentProfile(studentId);
            });
        });


        document.querySelectorAll('.view-instructor-profile').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const instructorId = e.target.getAttribute('data-instructor-id');
                this.navigateToInstructorProfile(instructorId);
            });
        });


        document.querySelectorAll('.mark-paid-action').forEach(btn => {
            btn.addEventListener('click', () => {
                this.markPaymentAsPaid();
            });
        });

        document.querySelectorAll('.edit-payment-action').forEach(btn => {
            btn.addEventListener('click', () => {
                this.editPayment();
            });
        });
    }

    markPaymentAsPaid() {
        if (this.currentTransaction && window.paymentModal) {
            this.hide();

            const id = this.currentTransaction.id || this.currentTransaction.transaction_id;

            window.paymentModal.show({
                id: id,
                type: this.paymentType,
                amount: this.currentTransaction.amount
            }, () => {

                if (window.loadFinanceData) {
                    window.loadFinanceData();
                }
            });
        }
    }

    editPayment() {

        showToast('Edit transaction functionality coming soon!', 'info');
    }

    async showForPayment(paymentData, paymentType = 'receivable') {


        this.paymentType = paymentType === 'receivable' ? 'receivable' : 'payable';

        if (!this.modal) {
            this.createModal();
        }




        this.populateData(paymentData);
        this.modal.classList.remove('hidden');
    }

    navigateToStudentProfile(studentId) {
        showToast(`Navigating to student profile: ${studentId}`, 'info');
        console.log('Navigate to student profile:', studentId);

    }

    navigateToInstructorProfile(instructorId) {
        showToast(`Navigating to instructor profile: ${instructorId}`, 'info');
        console.log('Navigate to instructor profile:', instructorId);

    }
}