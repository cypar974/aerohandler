import { supabase } from "../supabase.js";
import { showToast } from "../components/showToast.js";
import { CustomDatePicker } from "../components/customDatePicker.js";

export class AddMemberModal {
    constructor() {
        this.modal = null;
        this.isOpen = false;
        this.currentRole = 'student';
        this.onSuccessCallback = null;
        this.onCloseCallback = null;
        this.dobPickerInstance = null;

        this.handleBackdropClick = this.handleBackdropClick.bind(this);
        this.handleEscKey = this.handleEscKey.bind(this);
    }

    async init() {
        this.render();
        this.attachEvents();
    }

    render() {
        const existing = document.getElementById("add-member-modal");
        if (existing) existing.remove();

        this.modal = document.createElement('div');
        this.modal.id = "add-member-modal";
        this.modal.className = "hidden fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm transition-opacity duration-300";
        this.modal.innerHTML = this.getModalHTML();

        document.body.appendChild(this.modal);


        this.renderDynamicFields('student');
    }

    getModalHTML() {
        return `
            <div class="bg-gray-900 text-white rounded-xl shadow-2xl w-full max-w-2xl border border-gray-700 transform transition-all duration-300 scale-95 opacity-0 flex flex-col max-h-[90vh]">
                
                <div class="flex justify-between items-center p-6 border-b border-gray-700">
                    <h2 class="text-xl font-bold flex items-center gap-2">
                        <span class="bg-blue-600 p-2 rounded-lg">
                            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
                        </span>
                        Add New Member
                    </h2>
                    <button id="amm-close-btn" class="text-gray-400 hover:text-white transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div class="p-6 overflow-y-auto custom-scrollbar flex-1">
                    <form id="amm-form" class="space-y-6">
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-400 mb-1">Member Role</label>
                            <select id="amm-role" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all">
                                <option value="student">Student</option>
                                <option value="instructor">Instructor</option>
                                <option value="regular_pilot">Regular Pilot</option>
                                <option value="maintenance_technician">Maintenance Technician</option>
                                <option value="other_person">Other Person</option>
                            </select>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-400 mb-1">First Name *</label>
                                <input type="text" name="first_name" required class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-400 mb-1">Last Name *</label>
                                <input type="text" name="last_name" required class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none">
                            </div>
                        </div>

                        <div>
                            <label id="amm-email-label" class="block text-sm font-medium text-gray-400 mb-1">Email *</label>
                            <input type="email" name="email" required class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none">
                            <p class="text-xs text-gray-500 mt-1">This will be used for login and notifications.</p>
                        </div>

                        <div id="amm-dynamic-fields" class="space-y-4 pt-4 border-t border-gray-700">
                        </div>

                    </form>
                </div>

                <div class="p-6 border-t border-gray-700 flex justify-end gap-3 bg-gray-850 rounded-b-xl">
                    <button type="button" id="amm-cancel-btn" class="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors font-medium">Cancel</button>
                    <button type="submit" form="amm-form" class="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-500 hover:to-blue-600 shadow-lg shadow-blue-500/20 transition-all font-medium flex items-center gap-2">
                        <span>Create Member</span>
                        <svg id="amm-spinner" class="w-4 h-4 animate-spin hidden" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    </button>
                </div>
            </div>
        `;
    }

    attachEvents() {
        const closeBtn = this.modal.querySelector('#amm-close-btn');
        const cancelBtn = this.modal.querySelector('#amm-cancel-btn');
        const roleSelect = this.modal.querySelector('#amm-role');
        const form = this.modal.querySelector('#amm-form');

        closeBtn.addEventListener('click', () => this.hide());
        cancelBtn.addEventListener('click', () => this.hide());

        let mouseDownTarget = null;
        this.modal.addEventListener('mousedown', (e) => {
            mouseDownTarget = e.target;
        });

        this.modal.addEventListener('mouseup', (e) => {
            if (e.target === this.modal && mouseDownTarget === this.modal) {
                this.hide();
            }
            mouseDownTarget = null;
        });


        roleSelect.addEventListener('change', (e) => {
            this.currentRole = e.target.value;
            this.renderDynamicFields(this.currentRole);


            const emailInput = this.modal.querySelector('input[name="email"]');
            const emailLabel = this.modal.querySelector('#amm-email-label');

            if (this.currentRole === 'other_person') {
                emailInput.removeAttribute('required');
                emailLabel.textContent = "Email (Not Required)";
            } else {
                emailInput.setAttribute('required', '');
                emailLabel.textContent = "Email *";
            }
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleSubmit();
        });
    }

    handleBackdropClick(e) { }

    handleEscKey(e) {
        if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) {
            this.hide();
        }
    }

    renderDynamicFields(role) {
        this.cleanupCustomPickers();

        const container = this.modal.querySelector('#amm-dynamic-fields');
        let html = '';

        if (role === 'student') {
            html = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-400 mb-1">Date of Birth</label>
                        <input type="date" id="amm-dob" name="date_of_birth" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-400 mb-1">Phone</label>
                        <input type="text" name="phone" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none">
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-400 mb-1">Address</label>
                    <input type="text" name="address" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none">
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-400 mb-1">Student Number</label>
                        <input type="text" name="student_number" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-400 mb-1">License Type</label>
                        <select name="license_type" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none">
                            <option value="">Select...</option>
                            <option value="PPL">PPL</option>
                            <option value="LAPL">LAPL</option>
                            <option value="None">None</option>
                        </select>
                    </div>
                </div>
            `;
        } else if (role === 'instructor') {
            html = `
                <div>
                    <label class="block text-sm font-medium text-gray-400 mb-1">Ratings</label>
                    <input type="text" name="ratings" placeholder="e.g. FI, IRI, CRI" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none">
                </div>
            `;
        } else if (role === 'other_person') {
            html = `
                <div>
                    <label class="block text-sm font-medium text-gray-400 mb-1">Role Description *</label>
                    <input type="text" name="person_role" required placeholder="e.g. Admin, Staff, Guest" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none">
                </div>
            `;
        } else {
            html = `<p class="text-sm text-gray-500 italic">Basic profile will be created. Additional details can be edited later.</p>`;
        }

        container.innerHTML = html;

        if (role === 'student' && this.modal) {
            this.initializeCustomPickers();
        }
    }

    initializeCustomPickers() {
        setTimeout(() => {
            const dobInput = this.modal.querySelector("#amm-dob");
            if (dobInput && !this.dobPickerInstance) {
                this.dobPickerInstance = new CustomDatePicker(dobInput);
            }
        }, 50);
    }

    cleanupCustomPickers() {
        if (this.dobPickerInstance) {
            const dobInput = this.modal ? this.modal.querySelector("#amm-dob") : null;
            if (dobInput) {
                dobInput.style.opacity = '';
                dobInput.style.pointerEvents = '';
            }
            if (typeof this.dobPickerInstance.destroy === 'function') {
                this.dobPickerInstance.destroy();
            }
            this.dobPickerInstance = null;
        }
    }

    async handleSubmit() {
        const form = this.modal.querySelector('#amm-form');
        const spinner = this.modal.querySelector('#amm-spinner');
        const submitBtn = this.modal.querySelector('button[type="submit"]');

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            spinner.classList.remove('hidden');
            submitBtn.disabled = true;

            let error = null;
            let response = null;
            let payload = {};


            if (this.currentRole === 'student') {
                payload = {
                    first_name: data.first_name,
                    last_name: data.last_name,
                    email: data.email,
                    date_of_birth: data.date_of_birth || null,
                    phone: data.phone,
                    address: data.address,
                    student_number: data.student_number,
                    license_type: data.license_type
                };
                response = await supabase.schema('api').rpc('insert_student', { payload });
            }
            else if (this.currentRole === 'instructor') {
                payload = {
                    first_name: data.first_name,
                    last_name: data.last_name,
                    email: data.email,
                    ratings: data.ratings,
                    total_hours: data.total_hours || 0
                };
                response = await supabase.schema('api').rpc('insert_instructor', { payload });
            }
            else if (this.currentRole === 'regular_pilot') {
                payload = {
                    first_name: data.first_name,
                    last_name: data.last_name,
                    email: data.email,
                    ratings: data.ratings || null,
                    total_hours: data.total_hours || 0
                };
                response = await supabase.schema('api').rpc('insert_regular_pilot', { payload });
            }
            else if (this.currentRole === 'maintenance_technician') {
                payload = {
                    first_name: data.first_name,
                    last_name: data.last_name,
                    email: data.email,
                    total_hours: data.total_hours || 0
                };
                response = await supabase.schema('api').rpc('insert_maintenance_technician', { payload });
            }
            else if (this.currentRole === 'other_person') {
                const emailToSend = (data.email && data.email.trim() !== '') ? data.email : null;
                payload = {
                    first_name: data.first_name,
                    last_name: data.last_name,
                    email: emailToSend,
                    person_role: data.person_role
                };
                response = await supabase.schema('api').rpc('insert_other_person', { payload });
            }

            if (response && response.error) {
                throw response.error;
            }




            if (payload.email) {
                try {
                    const { error: resetError } = await supabase.auth.resetPasswordForEmail(payload.email, {

                        redirectTo: window.location.origin + '/update-password.html'
                    });

                    if (resetError) {
                        console.error("Member created, but invite failed:", resetError);
                        showToast("Member created, but invite email failed: " + resetError.message, "warning");
                    } else {
                        showToast("Member created & Invite Email sent!", "success");
                    }
                } catch (emailErr) {
                    console.error("Unexpected email error:", emailErr);

                    showToast("Member created, but invite email system failed.", "warning");
                }
            } else {

                showToast('Member created successfully!', 'success');
            }

            if (this.onSuccessCallback) this.onSuccessCallback();
            this.hide();

        } catch (err) {
            console.error('Error creating member:', err);
            let msg = err.message || 'Failed to create member';
            if (msg.includes('students_student_number_key')) msg = 'Student number already exists.';
            if (msg.includes('EMAIL_ALREADY_EXISTS')) msg = 'This email is already registered.';

            showToast(msg, 'error');
        } finally {
            spinner.classList.add('hidden');
            submitBtn.disabled = false;
        }
    }

    show() {
        if (!this.modal) return;

        this.modal.classList.remove('hidden');
        this.isOpen = true;

        const modalContent = this.modal.querySelector('.bg-gray-900');
        setTimeout(() => {
            if (modalContent) {
                modalContent.classList.remove("scale-95", "opacity-0");
                modalContent.classList.add("scale-100", "opacity-100");
            }
        }, 10);

        document.addEventListener('keydown', this.handleEscKey);

        if (this.currentRole === 'student') {
            this.initializeCustomPickers();
        }
    }

    hide() {
        if (!this.modal) return;

        const modalContent = this.modal.querySelector('.bg-gray-900');
        if (modalContent) {
            modalContent.classList.remove("scale-100", "opacity-100");
            modalContent.classList.add("scale-95", "opacity-0");
        }

        setTimeout(() => {
            this.modal.classList.add('hidden');
            this.isOpen = false;

            this.cleanupCustomPickers();


            this.modal.querySelector('#amm-form').reset();
            const roleSelect = this.modal.querySelector('#amm-role');
            roleSelect.value = 'student';
            this.currentRole = 'student';
            this.renderDynamicFields('student');


            const emailInput = this.modal.querySelector('input[name="email"]');
            const emailLabel = this.modal.querySelector('#amm-email-label');
            emailInput.setAttribute('required', '');
            emailLabel.textContent = "Email *";

            document.removeEventListener('keydown', this.handleEscKey);

            if (this.onCloseCallback) this.onCloseCallback();
        }, 200);
    }

    destroy() {
        this.cleanupCustomPickers();
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
        }
        document.removeEventListener('keydown', this.handleEscKey);
    }

    onSuccess(callback) {
        this.onSuccessCallback = callback;
    }

    onClose(callback) {
        this.onCloseCallback = callback;
    }
}