// ./modals/CreateInvoiceModal.js
import { supabase } from "../supabase.js";
import { CustomDatePicker } from "../components/customDatePicker.js";
import { Autocomplete } from "../components/autocomplete.js";
import { DataSources } from "../components/data-sources.js";
import { showToast } from "../components/showToast.js";

export class CreateInvoiceModal {
    constructor() {
        this.modalId = 'invoice-modal';
        this.combinedData = [];
        this.onCloseCallback = null;
        this.datePicker = null;
        this.autocomplete = null;
        this.listenersSetup = false;
        this.initialized = false;
        this.initPromise = null;
    }

    async init() {
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise(async (resolve) => {
            await this.loadPeople();
            this.render();
            this.setupEventListeners();
            this.initialized = true;
            resolve();
        });

        return this.initPromise;
    }

    async loadPeople() {
        try {
            this.combinedData = await DataSources.loadCombined();
        } catch (error) {
            console.error('Error loading people:', error);
            this.combinedData = [];
        }
    }

    render() {
        if (document.getElementById(this.modalId)) return;

        const modalHTML = `
        <div id="${this.modalId}" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-gray-900 p-6 rounded-xl w-2/3 shadow-lg max-h-[90vh] overflow-y-auto">
                <h2 class="text-xl font-bold mb-4">Create Invoice</h2>
                <form id="invoice-form" class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block mb-1">Person (Student/Instructor)</label>
                            <input type="text" id="invoice-person" class="w-full px-3 py-2 rounded bg-gray-700 text-white" placeholder="Start typing name..." autocomplete="off">
                            <input type="hidden" id="invoice-person-id">
                            <input type="hidden" id="invoice-person-type">
                        </div>
                        <div>
                            <label class="block mb-1">Due Date</label>
                            <input type="date" id="invoice-due-date" class="w-full px-3 py-2 rounded bg-gray-700 text-white" required>
                        </div>
                    </div>
                    
                    <!-- Person Details Display -->
                    <div id="person-details" class="hidden border border-gray-600 rounded p-3 bg-gray-800">
                        <div class="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span class="text-gray-400">Type:</span>
                                <span id="person-type" class="ml-2 text-white"></span>
                            </div>
                            <div>
                                <span class="text-gray-400">Email:</span>
                                <span id="person-email" class="ml-2 text-white"></span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label class="block mb-1">Description</label>
                        <input type="text" id="invoice-description" class="w-full px-3 py-2 rounded bg-gray-700 text-white" placeholder="Enter invoice description" required>
                    </div>
                    
                    <!-- Simplified Amount Input -->
                    <div>
                        <label class="block mb-1">Amount ($)</label>
                        <input type="number" id="invoice-amount" class="w-full px-3 py-2 rounded bg-gray-700 text-white" placeholder="0.00" step="0.01" min="0" required>
                    </div>

                    <div class="flex justify-between items-center mt-4">
                        <div class="text-lg font-bold">
                            Total: $<span id="invoice-total">0.00</span>
                        </div>
                        <div class="flex space-x-2">
                            <button type="button" id="cancel-invoice" class="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded">Cancel</button>
                            <button type="submit" class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded">Create Invoice</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    setupEventListeners() {
        if (!this.listenersSetup) {
            document.getElementById('cancel-invoice')?.addEventListener('click', () => this.hide());
            document.getElementById('invoice-form')?.addEventListener('submit', (e) => this.handleSubmit(e));

            document.getElementById('invoice-amount')?.addEventListener('input', () => this.updateInvoiceTotal());

            // exit if press escape or click outside modal
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') this.hide();
            });

            document.getElementById(this.modalId)?.addEventListener('click', (e) => {
                if (e.target.id === this.modalId) this.hide();
            });

            this.listenersSetup = true;
        }

        this.initializeDatePicker();
        this.initializeAutocomplete();
    }

    initializeDatePicker() {
        if (!this.datePicker) {
            const dueDateInput = document.getElementById('invoice-due-date');
            if (dueDateInput) {
                this.datePicker = new CustomDatePicker(dueDateInput);
            }
        }
    }

    initializeAutocomplete() {
        if (!this.autocomplete) {
            const personInput = document.getElementById('invoice-person');
            if (personInput) {
                this.autocomplete = new Autocomplete({
                    inputElement: personInput,
                    dataSource: this.combinedData,
                    searchTypes: ['both'],
                    maxSuggestions: 10,
                    displayField: 'name',
                    valueField: 'id',
                    additionalFields: ['email'],
                    placeholder: 'Start typing student or instructor name...',
                    noResultsText: 'No matches found',
                    onSelect: (selected) => this.handlePersonSelect(selected),
                    onInput: (query) => this.handlePersonInput(query)
                });
            }
        }
    }

    handlePersonSelect(selected) {
        if (selected?.rawItem) {
            const person = selected.rawItem;
            document.getElementById('invoice-person-id').value = person.id;
            document.getElementById('invoice-person-type').value = person.type;
            this.showPersonDetails(person);
        }
    }

    handlePersonInput(query) {
        if (!query.trim()) {
            this.hidePersonDetails();
            document.getElementById('invoice-person-id').value = '';
            document.getElementById('invoice-person-type').value = '';
        }
    }

    showPersonDetails(person) {
        const detailsContainer = document.getElementById('person-details');
        const typeElement = document.getElementById('person-type');
        const emailElement = document.getElementById('person-email');

        if (detailsContainer && typeElement && emailElement) {
            typeElement.textContent = person.type === 'student' ? 'Student' : 'Instructor';
            emailElement.textContent = person.email || 'No email';
            detailsContainer.classList.remove('hidden');
        }
    }

    hidePersonDetails() {
        document.getElementById('person-details')?.classList.add('hidden');
    }

    updateInvoiceTotal() {
        const amount = parseFloat(document.getElementById('invoice-amount').value) || 0;
        document.getElementById('invoice-total').textContent = amount.toFixed(2);
    }

    async show(params = {}) {
        // Ensure the modal is fully initialized before showing
        if (!this.initialized) {
            await this.init();
        }

        const modal = document.getElementById(this.modalId);
        if (!modal) return;

        document.getElementById('invoice-form').reset();
        this.hidePersonDetails();

        if (params.personId && params.personType) {
            this.prefillPerson(params.personId, params.personType);
        } else if (params.studentId) {
            this.prefillPerson(params.studentId, 'student');
        }

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
        document.getElementById('invoice-due-date').value = dueDate.toISOString().split('T')[0];

        document.getElementById('invoice-total').textContent = '0.00';

        this.datePicker?.updateDisplay();

        modal.classList.remove('hidden');
    }

    async prefillPerson(personId, personType) {
        try {
            const person = this.combinedData.find(p => p.id === personId && p.type === personType);

            if (person) {
                document.getElementById('invoice-person').value = person.name;
                document.getElementById('invoice-person-id').value = person.id;
                document.getElementById('invoice-person-type').value = person.type;
                this.showPersonDetails(person);
            } else {
                console.warn('Person not found in preloaded data, attempting to load individually...');
                await this.loadIndividualPerson(personId, personType);
            }
        } catch (error) {
            console.error('Error pre-filling person:', error);
        }
    }

    async loadIndividualPerson(personId, personType) {
        try {
            const table = personType === 'student' ? 'students' : 'instructors';

            const { data, error } = await supabase
                .from(table)
                .select('id, first_name, last_name, email')
                .eq('id', personId)
                .single();

            if (error) throw error;

            if (data) {
                const person = {
                    id: data.id,
                    name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
                    first_name: data.first_name,
                    last_name: data.last_name,
                    email: data.email,
                    type: personType
                };

                this.combinedData.push(person);
                this.autocomplete?.updateData(this.combinedData);

                document.getElementById('invoice-person').value = person.name;
                document.getElementById('invoice-person-id').value = person.id;
                document.getElementById('invoice-person-type').value = person.type;
                this.showPersonDetails(person);
            }
        } catch (error) {
            console.error('Error loading individual person:', error);
        }
    }

    hide() {
        document.getElementById(this.modalId)?.classList.add('hidden');
        this.onCloseCallback?.();
    }

    destroy() {
        this.datePicker?.destroy();
        this.autocomplete?.destroy();

        document.getElementById(this.modalId)?.remove();

        this.combinedData = [];
        this.onCloseCallback = null;
        this.listenersSetup = false;
        this.datePicker = null;
        this.autocomplete = null;
    }

    async handleSubmit(e) {
        e.preventDefault();

        const personId = document.getElementById('invoice-person-id').value;
        const personType = document.getElementById('invoice-person-type').value;
        const dueDate = document.getElementById('invoice-due-date').value;
        const description = document.getElementById('invoice-description').value;
        const amount = parseFloat(document.getElementById('invoice-amount').value);

        if (!personId || !personType) {
            showToast('Please select a student or instructor', 'error');
            return;
        }

        if (!description.trim()) {
            showToast('Please enter an invoice description', 'error');
            return;
        }

        if (amount <= 0) {
            showToast('Please enter a valid amount greater than 0', 'error');
            return;
        }

        const invoiceNumber = 'INV-' + Date.now();

        try {
            if (personType === 'instructor') {
                await this.createInstructorInvoice(personId, invoiceNumber, dueDate, description, amount);
            } else {
                await this.createStudentInvoice(personId, invoiceNumber, dueDate, description, amount);
            }

            this.hide();

            document.dispatchEvent(new CustomEvent('invoiceCreated', {
                detail: {
                    invoice: { invoice_number: invoiceNumber, total_amount: amount },
                    personId,
                    personType
                }
            }));

            showToast('Invoice created successfully!', 'success');

        } catch (error) {
            console.error('Error creating invoice:', error);
            showToast('Error creating invoice: ' + error.message, 'error');
        }
    }

    async createStudentInvoice(studentId, invoiceNumber, dueDate, description, amount) {
        // Create payment receivable record for student
        const { data: payment, error } = await supabase
            .from('payments_receivable')
            .insert([{
                receive_type: 'other',
                person_id: studentId,
                amount: amount,
                due_date: dueDate,
                description: description || `Invoice ${invoiceNumber}`,
                status: 'pending'
            }])
            .select()
            .single();

        if (error) throw error;
        return payment;
    }

    async createInstructorInvoice(instructorId, invoiceNumber, dueDate, description, amount) {
        // Get instructor details for the payable record
        const { data: instructor, error: instructorError } = await supabase
            .from('instructors')
            .select('first_name, last_name')
            .eq('id', instructorId)
            .single();

        if (instructorError) throw instructorError;

        // Create payment payable record for instructor
        const { data: payment, error: paymentError } = await supabase
            .from('payments_payable')
            .insert([{
                payee_type: 'instructor',
                payee_id: instructorId,
                amount: amount,
                due_date: dueDate,
                description: description || `Invoice ${invoiceNumber}`,
                status: 'pending'
            }])
            .select()
            .single();

        if (paymentError) throw paymentError;
        return payment;
    }
}