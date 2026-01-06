// ./modals/PaymentModal.js
import { supabase } from "../supabase.js";
import { showToast } from "../components/showToast.js";

export class PaymentModal {
    constructor() {
        this.modal = null;
        this.onPaymentRecorded = null;
    }

    show(paymentData = null, onPaymentRecorded = null) {
        this.onPaymentRecorded = onPaymentRecorded;


        if (!this.modal) {
            this.createModal();
        }


        if (paymentData) {
            this.populateData(paymentData);
        } else {
            this.resetForm();
        }

        this.modal.classList.remove('hidden');
    }

    hide() {
        if (this.modal) {
            this.modal.classList.add('hidden');
        }
    }

    createModal() {

        this.modal = document.createElement('div');
        this.modal.id = 'payment-modal';
        this.modal.className = 'hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        this.modal.innerHTML = `
        <div class="bg-gray-900 p-6 rounded-xl w-1/3 shadow-lg">
            <h2 id="payment-modal-title" class="text-xl font-bold mb-4">Record Payment</h2>
            <form id="payment-form" class="space-y-4">
                <input type="hidden" id="payment-id">
                <input type="hidden" id="payment-type">
                <div>
                    <label class="block mb-1">Amount ($)</label>
                    <input type="number" step="0.01" id="payment-amount" class="w-full px-3 py-2 rounded bg-gray-700 text-white" required>
                </div>
                <div>
                    <label class="block mb-1">Payment Date</label>
                    <input type="date" id="payment-date" class="w-full px-3 py-2 rounded bg-gray-700 text-white" required>
                </div>
                <div>
                    <label class="block mb-1">Payment Method</label>
                    <select id="payment-method" class="w-full px-3 py-2 rounded bg-gray-700 text-white" required>
                        <option value="">Select Method</option>
                        <option value="cash">Cash</option>
                        <option value="transfer">Bank Transfer</option>
                        <option value="check">Check</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div>
                    <label class="block mb-1">Reference Number</label>
                    <input type="text" id="payment-reference" class="w-full px-3 py-2 rounded bg-gray-700 text-white" placeholder="Optional">
                </div>
                <div>
                    <label class="block mb-1">Notes</label>
                    <textarea id="payment-notes" rows="2" class="w-full px-3 py-2 rounded bg-gray-700 text-white"></textarea>
                </div>
                <div class="flex justify-end space-x-2">
                    <button type="button" id="cancel-payment" class="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded">Cancel</button>
                    <button type="submit" class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded">Record Payment</button>
                </div>
            </form>
        </div>
    `;

        document.body.appendChild(this.modal);
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('cancel-payment').addEventListener('click', () => {
            this.hide();
        });

        document.getElementById('payment-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.recordPayment();
        });
    }

    populateData(paymentData) {



        const type = paymentData.transaction_direction || paymentData.type;

        document.getElementById('payment-modal-title').textContent =
            `Record ${type === 'receivable' ? 'Payment Received' : 'Payment Sent'}`;

        document.getElementById('payment-id').value = paymentData.id || '';
        document.getElementById('payment-type').value = type || '';
        document.getElementById('payment-amount').value = paymentData.amount || '';

        document.getElementById('payment-date').value = paymentData.date ? paymentData.date.split('T')[0] : new Date().toISOString().split('T')[0];
        document.getElementById('payment-method').value = paymentData.method || '';
        document.getElementById('payment-reference').value = paymentData.reference || '';
        document.getElementById('payment-notes').value = paymentData.notes || '';
    }

    resetForm() {
        document.getElementById('payment-modal-title').textContent = 'Record Payment';
        document.getElementById('payment-form').reset();
        document.getElementById('payment-date').value = new Date().toISOString().split('T')[0];
    }

    async recordPayment() {
        const paymentId = document.getElementById('payment-id').value;


        const amount = document.getElementById('payment-amount').value;
        const paymentDate = document.getElementById('payment-date').value;
        const paymentMethod = document.getElementById('payment-method').value;
        const reference = document.getElementById('payment-reference').value;
        const notes = document.getElementById('payment-notes').value;

        if (!paymentMethod) {
            showToast('Please select a payment method', 'error');
            return;
        }



        const allowedMethods = ['cash', 'transfer', 'check', 'other', 'card'];
        if (!allowedMethods.includes(paymentMethod)) {
            showToast('Invalid payment method selected', 'error');
            return;
        }





        const payload = {
            status: 'paid',
            paid_at: new Date(paymentDate).toISOString(),
            payment_method: paymentMethod,
            reference_number: reference,
            notes: notes
        };

        const { error } = await supabase.schema('api').rpc('update_financial_transaction', {
            transaction_uuid: paymentId,
            payload: payload
        });

        if (error) {
            showToast('Error recording payment: ' + error.message, 'error');
            return;
        }

        this.hide();
        document.getElementById('payment-form').reset();


        if (this.onPaymentRecorded) {
            this.onPaymentRecorded();
        }

        showToast('Payment recorded successfully!', 'success');
    }
}