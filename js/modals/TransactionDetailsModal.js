// ./modals/TransactionDetailsModal.js
import { supabase } from "../supabase.js";
import { showToast } from "../components/showToast.js";

export class TransactionDetailsModal {
    constructor() {
        this.modal = null;
        this.currentTransaction = null;
    }

    show(transactionData) {
        this.currentTransaction = transactionData;

        if (!this.modal) {
            this.createModal();
        }

        // Show loading state immediately when modal opens
        this.showLoadingState();
        this.modal.classList.remove('hidden');

        // Trigger animation after DOM update
        requestAnimationFrame(() => {
            if (this.modal && this.modal.parentNode) {
                const modalContent = this.modal.querySelector('.bg-gray-900');
                if (modalContent) {
                    modalContent.classList.remove("scale-95", "opacity-0");
                    modalContent.classList.add("scale-100", "opacity-100");
                }

                // Now populate the data after the modal is visible
                this.populateData(transactionData);
            }
        });
    }

    hide() {
        if (this.modal) {
            // Animate out
            const modalContent = this.modal.querySelector('.bg-gray-900');
            if (modalContent) {
                modalContent.classList.remove("scale-100", "opacity-100");
                modalContent.classList.add("scale-95", "opacity-0");
            }

            // Remove from DOM after animation
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
                <!-- Content will be populated dynamically -->
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

        // check for escape key press to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hide();
            }
        });

        // Close modal when clicking outside
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });
    }

    generatePaymentHTML(paymentData, relatedDetails) {
        const isReceivable = this.paymentType === 'receivable';
        const amountClass = isReceivable ? 'text-green-400' : 'text-red-400';
        const statusColor = getStatusColor(paymentData.status);

        return /*html*/ `
        <div class="space-y-6">
            <!-- Header Section -->
            <div class="bg-gray-800 p-4 rounded-lg">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="text-lg font-semibold">${paymentData.description}</h3>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Type:</span>
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

            <!-- Payment Details -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-gray-800 p-4 rounded-lg">
                    <h4 class="font-semibold mb-3 text-gray-300">Payment Information</h4>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-400">Type:</span>
                            <span class="capitalize">${this.paymentType}</span>
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

            <!-- Related Entities Section -->
            ${this.generateRelatedEntitiesHTML(relatedDetails)}

            <!-- Flight Information -->
            ${relatedDetails.flightLog ? this.generateFlightInfoHTML(relatedDetails.flightLog) : ''}

            ${paymentData.notes ? `
                <div class="bg-gray-800 p-4 rounded-lg">
                    <h4 class="font-semibold mb-3 text-gray-300">Notes</h4>
                    <p class="text-gray-300">${paymentData.notes}</p>
                </div>
            ` : ''}

            <!-- Action Buttons for Pending Payments -->
            ${paymentData.status === 'pending' ? /*html*/ `
                <div class="bg-gray-800 p-4 rounded-lg">
                    <h4 class="font-semibold mb-3 text-gray-300">Actions</h4>
                    <div class="flex space-x-2">
                        <button class="mark-paid-action px-4 py-2 bg-green-600 rounded hover:bg-green-700 text-sm">
                            Mark as Paid
                        </button>
                        <button class="edit-payment-action px-4 py-2 bg-yellow-600 rounded hover:bg-yellow-700 text-sm">
                            Edit Payment
                        </button>
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
            // Show initial loading state
            this.updateLoadingProgress(0, "Starting to load transaction details...");

            const content = document.getElementById('transaction-details-content');

            let relatedDetails = {};
            if (transactionData.source_table && transactionData.source_id) {
                // Update progress
                this.updateLoadingProgress(30, "Fetching related details...");

                relatedDetails = await this.fetchRelatedDetails(
                    transactionData.source_table,
                    transactionData.source_id
                );

                this.updateLoadingProgress(70, "Processing transaction data...");
            }

            // Simulate progress for better UX
            await new Promise(resolve => setTimeout(resolve, 500));
            this.updateLoadingProgress(100, "Finalizing display...");
            await new Promise(resolve => setTimeout(resolve, 300));

            // Smooth transition to content
            if (content) {
                content.style.opacity = '0.7';
                content.style.transition = 'opacity 0.4s ease';

                await new Promise(resolve => setTimeout(resolve, 200));

                // If it's a payment without transaction, show payment-specific info
                if (isPayment) {
                    content.innerHTML = this.generatePaymentHTML(transactionData, relatedDetails);
                } else {
                    content.innerHTML = this.generateTransactionHTML(transactionData, relatedDetails);
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

        // Create loading indicator in header if it doesn't exist
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
                <div class="text-sm text-gray-500 mt-2">Fetching payment information, related entities, and flight data</div>
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

            // Add retry functionality
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
                Preparing transaction details for viewing
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
                <div class="animate-pulse">💰 Gathering payment information</div>
                <div class="mt-1 animate-pulse" style="animation-delay: 0.2s">👤 Loading related entities</div>
                <div class="mt-1 animate-pulse" style="animation-delay: 0.4s">✈️ Fetching flight data</div>
            </div>
        </div>
    `;
    }

    getProgressMessage(step) {
        const messages = {
            1: "Loading transaction information...",
            2: "Fetching related entities...",
            3: "Loading flight details...",
            4: "Finalizing payment data..."
        };
        return messages[step] || "Loading transaction details...";
    }

    async fetchRelatedDetails(sourceTable, sourceId) {
        try {
            this.updateLoadingProgress(40, "Loading source data...");

            const { data, error } = await supabase
                .from(sourceTable)
                .select('*')
                .eq('id', sourceId)
                .single();

            if (error) throw error;

            let details = { sourceData: data };

            this.updateLoadingProgress(60, "Fetching student/instructor details...");

            // Fetch student/instructor details if applicable
            if (sourceTable === 'payments_receivable' && data.person_id) {
                const { data: studentData } = await supabase
                    .from('students')
                    .select('*')
                    .eq('id', data.person_id)
                    .single();
                details.student = studentData;
            }

            if (sourceTable === 'payments_payable' && data.payee_type === 'instructor' && data.payee_id) {
                const { data: instructorData } = await supabase
                    .from('instructors')
                    .select('*')
                    .eq('id', data.payee_id)
                    .single();
                details.instructor = instructorData;
            }

            this.updateLoadingProgress(80, "Loading flight log details...");

            // Fetch flight log details if available
            if (data.flight_log_id) {
                const { data: flightLogData } = await supabase
                    .from('flight_logs')
                    .select('*')
                    .eq('id', data.flight_log_id)
                    .single();
                details.flightLog = flightLogData;
            }

            return details;
        } catch (error) {
            console.error('Error fetching related details:', error);
            return {};
        }
    }

    generateTransactionHTML(transaction, relatedDetails) {
        const isIncoming = transaction.transaction_type === 'incoming';
        const amountClass = isIncoming ? 'text-green-400' : 'text-red-400';
        const amountSign = isIncoming ? '+' : '-';

        return `
            <div class="space-y-6">
                <!-- Header Section -->
                <div class="bg-gray-800 p-4 rounded-lg">
                    <div class="flex justify-between items-start">
                        <div>
                            <h3 class="text-lg font-semibold">${transaction.description}</h3>
                            <p class="text-gray-400">${new Date(transaction.payment_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })}</p>
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

                <!-- Transaction Details -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-gray-800 p-4 rounded-lg">
                        <h4 class="font-semibold mb-3 text-gray-300">Transaction Information</h4>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-400">Payment Method:</span>
                                <span class="capitalize">${transaction.payment_method}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-400">Reference Number:</span>
                                <span class="font-mono">${transaction.reference_number || 'N/A'}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-400">Source:</span>
                                <span class="capitalize">${transaction.source_table?.replace('payments_', '') || 'Manual Entry'}</span>
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
                            ${transaction.notes ? `
                                <div>
                                    <span class="text-gray-400 block mb-1">Notes:</span>
                                    <p class="text-gray-300">${transaction.notes}</p>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <!-- Related Entities Section -->
                ${this.generateRelatedEntitiesHTML(relatedDetails)}

                <!-- Flight Information -->
                ${relatedDetails.flightLog ? this.generateFlightInfoHTML(relatedDetails.flightLog) : ''}

                <!-- Source Payment Details -->
                ${relatedDetails.sourceData ? this.generateSourcePaymentHTML(relatedDetails.sourceData, transaction.source_table) : ''}
            </div>
        `;
    }

    generateRelatedEntitiesHTML(relatedDetails) {
        let entitiesHTML = '';

        if (relatedDetails.student) {
            entitiesHTML += `
                <div class="bg-gray-800 p-4 rounded-lg">
                    <h4 class="font-semibold mb-3 text-gray-300">Student Information</h4>
                    <div class="flex items-center justify-between">
                        <div>
                            <div class="font-medium">${relatedDetails.student.first_name} ${relatedDetails.student.last_name}</div>
                            <div class="text-sm text-gray-400">${relatedDetails.student.email}</div>
                            <div class="text-sm text-gray-400">Student #: ${relatedDetails.student.student_number || 'N/A'}</div>
                        </div>
                        <button class="view-student-profile px-3 py-1 bg-blue-600 rounded hover:bg-blue-700 text-sm"
                                data-student-id="${relatedDetails.student.id}">
                            View Profile
                        </button>
                    </div>
                </div>
            `;
        }

        if (relatedDetails.instructor) {
            entitiesHTML += `
                <div class="bg-gray-800 p-4 rounded-lg">
                    <h4 class="font-semibold mb-3 text-gray-300">Instructor Information</h4>
                    <div class="flex items-center justify-between">
                        <div>
                            <div class="font-medium">${relatedDetails.instructor.first_name} ${relatedDetails.instructor.last_name}</div>
                            <div class="text-sm text-gray-400">${relatedDetails.instructor.email}</div>
                            <div class="text-sm text-gray-400">Ratings: ${relatedDetails.instructor.ratings || 'N/A'}</div>
                        </div>
                        <button class="view-instructor-profile px-3 py-1 bg-blue-600 rounded hover:bg-blue-700 text-sm"
                                data-instructor-id="${relatedDetails.instructor.id}">
                            View Profile
                        </button>
                    </div>
                </div>
        `;
        }

        return entitiesHTML;
    }

    generateFlightInfoHTML(flightLog) {
        return `
        <div class="bg-gray-800 p-4 rounded-lg">
            <h4 class="font-semibold mb-3 text-gray-300">Flight Information</h4>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                    <div class="text-gray-400">Route</div>
                    <div class="font-medium">${flightLog.departure_iata} → ${flightLog.arrival_iata}</div>
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
                    <div class="text-gray-400">Type</div>
                    <div class="capitalize">${flightLog.type_of_flight}</div>
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


    generateSourcePaymentHTML(sourceData, sourceTable) {
        const isReceivable = sourceTable === 'payments_receivable';

        return `
            <div class="bg-gray-800 p-4 rounded-lg">
                <h4 class="font-semibold mb-3 text-gray-300">Original ${isReceivable ? 'Invoice' : 'Payment Request'}</h4>
                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <div class="text-gray-400">Due Date</div>
                        <div>${new Date(sourceData.due_date).toLocaleDateString()}</div>
                    </div>
                    <div>
                        <div class="text-gray-400">Status</div>
                        <span class="px-2 py-1 rounded text-xs ${getStatusColor(sourceData.status)}">
                            ${sourceData.status}
                        </span>
                    </div>
                    <div class="col-span-2">
                        <div class="text-gray-400">Description</div>
                        <div>${sourceData.description}</div>
                    </div>
                    ${sourceData.notes ? `
                        <div class="col-span-2">
                            <div class="text-gray-400">Original Notes</div>
                            <div class="text-gray-300">${sourceData.notes}</div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        function getStatusColor(status) {
            switch (status) {
                case 'paid': return 'bg-green-600';
                case 'pending': return 'bg-yellow-600';
                case 'overdue': return 'bg-red-600';
                default: return 'bg-gray-600';
            }
        }
    }

    setupProfileLinks() {
        // Student profile links
        document.querySelectorAll('.view-student-profile').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const studentId = e.target.getAttribute('data-student-id');
                this.navigateToStudentProfile(studentId);
            });
        });

        // Instructor profile links
        document.querySelectorAll('.view-instructor-profile').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const instructorId = e.target.getAttribute('data-instructor-id');
                this.navigateToInstructorProfile(instructorId);
            });
        });

        // Action buttons for payments
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
        if (this.currentPayment && window.paymentModal) {
            this.hide();
            window.paymentModal.show({
                id: this.currentPayment.id,
                type: this.paymentType,
                amount: this.currentPayment.amount
            }, () => {
                // Refresh data after payment
                if (window.loadFinanceData) {
                    window.loadFinanceData();
                }
            });
        }
    }

    editPayment() {
        // You can implement edit payment functionality here
        showToast('Edit payment functionality coming soon!', 'info');
    }

    async showForPayment(paymentData, paymentType = 'receivable') {
        this.currentPayment = paymentData;
        this.paymentType = paymentType;

        if (!this.modal) {
            this.createModal();
        }

        // Convert payment data to transaction-like format for display
        const transactionData = await this.convertPaymentToTransaction(paymentData, paymentType);
        this.populateData(transactionData);
        this.modal.classList.remove('hidden');
    }

    async convertPaymentToTransaction(paymentData, paymentType) {
        // Check if this payment already has a transaction
        const { data: existingTransaction } = await supabase
            .from('transaction_history')
            .select('*')
            .eq('source_table', paymentType === 'receivable' ? 'payments_receivable' : 'payments_payable')
            .eq('source_id', paymentData.id)
            .single();

        if (existingTransaction) {
            return existingTransaction;
        }

        // Create a mock transaction for display
        return {
            id: paymentData.id,
            transaction_type: paymentType === 'receivable' ? 'incoming' : 'outgoing',
            source_table: paymentType === 'receivable' ? 'payments_receivable' : 'payments_payable',
            source_id: paymentData.id,
            amount: paymentData.amount,
            payment_date: paymentData.paid_at || new Date().toISOString(),
            payment_method: paymentData.payment_method || 'pending',
            reference_number: paymentData.reference_number,
            description: paymentData.description,
            notes: paymentData.notes,
            created_at: paymentData.created_at
        };
    }

    navigateToStudentProfile(studentId) {
        // You can implement navigation to student profile page
        // For now, we'll show a toast and log the action
        showToast(`Navigating to student profile: ${studentId}`, 'info');
        console.log('Navigate to student profile:', studentId);

        // Example implementation:
        // window.location.href = `/students.html?id=${studentId}`;
        // or dispatch a custom event if using SPA architecture
    }

    navigateToInstructorProfile(instructorId) {
        // You can implement navigation to instructor profile page
        showToast(`Navigating to instructor profile: ${instructorId}`, 'info');
        console.log('Navigate to instructor profile:', instructorId);

        // Example implementation:
        // window.location.href = `/instructors.html?id=${instructorId}`;
    }
}