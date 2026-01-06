// ./js/pages/staff.js
import { supabase } from "../supabase.js";
import { showToast } from "../components/showToast.js";
import { setupPersonAutocomplete } from "../components/autocomplete.js";
import { getMembers } from "../utils/memberData.js";

// --- STATE MANAGEMENT ---
let staffList = [];       // Active admins (fe
let availableRoles = [];  // Admin roles (fetched from admin_roles)
let allMembers = [];      // Source for Autocomplete (fetch
let activeModal = null;
let currentFilter = 'all';
let sortState = { column: 'admin_role_level', direction: 'desc' };

// --- CLEANUP ---
let cleanupFunctions = [];

export async function loadStaffPage() {
    cleanupStaffPage();

    const content = document.getElementById("main-content");
    content.innerHTML = `
        <div class="flex flex-col h-full text-white relative">
            <div class="flex justify-between items-center mb-6">
                <div>
                    <h1 class="text-2xl font-bold text-white flex items-center">
                        <svg class="w-8 h-8 mr-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                        Admin & Staff Management
                    </h1>
                    <p class="text-gray-400 text-sm mt-1 ml-11">Grant system privileges to existing Instructors, Pilots, or Staff.</p>
                </div>
                <button id="promote-staff-btn" class="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-500 transition-colors font-medium flex items-center shadow-lg shadow-blue-900/20">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                    Grant Admin Access
                </button>
            </div>

            <div class="flex flex-col space-y-4 mb-6">
                <div id="stats-container" class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="animate-pulse h-20 bg-gray-800 rounded"></div>
                    <div class="animate-pulse h-20 bg-gray-800 rounded"></div>
                </div>
                
                <div id="role-filters" class="flex border-b border-gray-700 overflow-x-auto min-h-[48px]">
                    </div>
            </div>

            <div class="flex-1 overflow-hidden flex flex-col bg-gray-900 rounded-lg border border-gray-700 shadow-lg">
                <div class="overflow-x-auto flex-1">
                    <table class="min-w-full text-left text-sm text-gray-300">
                        <thead class="bg-gray-800 text-gray-200 uppercase font-medium sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th class="px-6 py-3 cursor-pointer hover:bg-gray-700" data-sort="full_name">Member Name</th>
                                <th class="px-6 py-3 cursor-pointer hover:bg-gray-700" data-sort="system_role">Primary Identity</th>
                                <th class="px-6 py-3 cursor-pointer hover:bg-gray-700" data-sort="admin_role_level">Admin Role</th>
                                <th class="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="staff-table-body" class="divide-y divide-gray-700">
                            </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    try {
        await fetchData();
        renderInterface();
    } catch (error) {
        console.error("Staff Page Error:", error);
        showToast("Error loading staff data: " + error.message, "error");
        document.getElementById('staff-table-body').innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-red-400">Error loading data.</td></tr>`;
    }
}

// --- DATA LAYER ---
async function fetchData() {
    // 1. Fetch data in parallel
    const [rolesRes, staffRes, membersRes] = await Promise.all([
        supabase.schema('api').rpc('get_assignable_roles'),
        supabase.schema('api').rpc('get_admin_staff'),
        getMembers()
    ]);

    if (rolesRes.error) throw new Error("Failed to load roles: " + rolesRes.error.message);
    if (staffRes.error) throw new Error("Failed to load staff list: " + staffRes.error.message);
    if (membersRes.error) throw new Error("Failed to load members: " + membersRes.error.message);

    availableRoles = rolesRes.data || [];
    staffList = staffRes.data || [];
    allMembers = membersRes.data || [];
}

// --- RENDERING ---
function renderInterface() {
    renderStats();
    renderFilters();
    renderTable();
    attachEventListeners();
}

function renderStats() {
    // Filter counts based on specific Role Names defined in the database
    const superAdminCount = staffList.filter(s => s.admin_role_name === 'Super Admin').length;
    const opsManagerCount = staffList.filter(s => s.admin_role_name === 'Operations Manager').length;
    const staffCount = staffList.filter(s => s.admin_role_name === 'Staff').length;

    document.getElementById("stats-container").innerHTML = `
        <div class="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-md border-l-4 border-l-red-600">
            <div class="text-gray-400 text-xs font-bold uppercase tracking-wider">Super Admins</div>
            <div class="text-2xl font-bold text-red-400 mt-1">${superAdminCount}</div>
        </div>
        <div class="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-md border-l-4 border-l-purple-600">
            <div class="text-gray-400 text-xs font-bold uppercase tracking-wider">Operations Managers</div>
            <div class="text-2xl font-bold text-purple-400 mt-1">${opsManagerCount}</div>
        </div>
        <div class="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-md border-l-4 border-l-blue-600">
            <div class="text-gray-400 text-xs font-bold uppercase tracking-wider">General Staff</div>
            <div class="text-2xl font-bold text-blue-400 mt-1">${staffCount}</div>
        </div>
    `;
}

function renderFilters() {
    const container = document.getElementById("role-filters");
    const activeRoleNames = [...new Set(staffList.map(s => s.admin_role_name))];

    let html = `
        <button data-filter="all" class="filter-btn px-6 py-3 font-medium text-sm transition-colors border-b-2 ${currentFilter === 'all' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-400 hover:text-gray-200'}">
            All Staff
        </button>
    `;

    activeRoleNames.forEach(roleName => {
        const isActive = currentFilter === roleName;
        html += `
            <button data-filter="${roleName}" class="filter-btn px-6 py-3 font-medium text-sm transition-colors border-b-2 ${isActive ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-400 hover:text-gray-200'}">
                ${roleName}
            </button>
        `;
    });

    container.innerHTML = html;

    container.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentFilter = btn.dataset.filter;
            renderFilters();
            renderTable();
        });
    });
}

function renderTable() {
    const tbody = document.getElementById("staff-table-body");
    tbody.innerHTML = '';

    let filtered = staffList.filter(item => {
        if (currentFilter === 'all') return true;
        return item.admin_role_name === currentFilter;
    });

    // Sort
    filtered.sort((a, b) => {
        let valA = a[sortState.column];
        let valB = b[sortState.column];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        // Reverse direction logic handling
        if (valA < valB) return sortState.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortState.direction === 'asc' ? 1 : -1;
        return 0;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-gray-500">No staff found matching the criteria.</td></tr>`;
        return;
    }

    filtered.forEach(staff => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-gray-800 transition-colors border-b border-gray-800 last:border-none";

        let badgeColor = "bg-blue-900 text-blue-200 border-blue-700";
        if (staff.clearance_level >= 90) badgeColor = "bg-red-900 text-red-200 border-red-700";
        else if (staff.clearance_level >= 50) badgeColor = "bg-purple-900 text-purple-200 border-purple-700";

        tr.innerHTML = `
            <td class="px-6 py-4">
                <div class="font-bold text-white">${staff.full_name}</div>
                <div class="text-xs text-gray-500">${staff.login_email}</div>
            </td>
            <td class="px-6 py-4 text-gray-300">
                ${formatSystemRole(staff.system_role)}
            </td>
            <td class="px-6 py-4">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeColor}">
                    ${staff.admin_role_name}
                </span>
                <div class="text-[10px] text-gray-500 mt-1">Level ${staff.clearance_level}</div>
            </td>
            <td class="px-6 py-4 text-right">
                <button class="edit-btn text-gray-400 hover:text-white p-2 rounded hover:bg-gray-700 transition-colors" title="Modify Permissions">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                </button>
            </td>
        `;

        tr.querySelector('.edit-btn').addEventListener('click', () => openPromoteModal(staff));
        tbody.appendChild(tr);
    });
}

function attachEventListeners() {
    // Rebind main Promote button to handle cleanup properly
    const btn = document.getElementById("promote-staff-btn");
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', () => openPromoteModal());

    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.dataset.sort;
            if (sortState.column === col) {
                sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
            } else {
                sortState.column = col;
                sortState.direction = 'asc';
            }
            renderTable();
        });
    });
}

function formatSystemRole(role) {
    switch (role) {
        case 'instructor': return '<span class="text-purple-400">Flight Instructor</span>';
        case 'regular_pilot': return '<span class="text-blue-400">Pilot</span>';
        case 'maintenance_technician': return '<span class="text-yellow-500">Technician</span>';
        case 'student': return '<span class="text-gray-400">Student</span>';
        default: return '<span class="text-gray-500 capitalize">' + role.replace('_', ' ') + '</span>';
    }
}

// --- MODAL SYSTEM ---

/**
 * Opens modal to Promote (New) or Edit (Existing)
 * @param {Object|null} existingStaff 
 */
async function openPromoteModal(existingStaff = null) {
    if (activeModal) activeModal.remove();

    const isEdit = !!existingStaff;

    // Create Options
    const roleOptions = availableRoles.map(r =>
        `<option value="${r.id}" ${existingStaff?.admin_role_id === r.id ? 'selected' : ''}>
            ${r.name} (Level ${r.clearance_level})
        </option>`
    ).join('');

    const modalOverlay = document.createElement('div');
    modalOverlay.className = "fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 animate-fade-in";

    modalOverlay.innerHTML = `
        <div class="bg-gray-800 rounded-lg shadow-2xl border border-gray-700 w-full max-w-lg overflow-hidden transform transition-all">
            <div class="px-6 py-4 border-b border-gray-700 bg-gray-900/50 flex justify-between items-center">
                <h3 class="text-xl font-bold text-white">${isEdit ? 'Modify Permissions' : 'Grant Admin Access'}</h3>
                <button id="modal-close" class="text-gray-400 hover:text-white focus:outline-none">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            
            <form id="promote-form" class="p-6 space-y-6">
                
                <div>
                    <label class="block text-sm font-medium text-gray-400 mb-1">
                        ${isEdit ? 'Selected Member' : 'Search Member to Promote'}
                    </label>
                    
                    ${isEdit ? `
                        <div class="p-3 bg-gray-700 rounded border border-gray-600 flex justify-between items-center">
                            <div>
                                <div class="font-bold text-white">${existingStaff.full_name}</div>
                                <div class="text-xs text-gray-400">${existingStaff.login_email}</div>
                            </div>
                            <div class="text-xs uppercase tracking-wider bg-gray-800 px-2 py-1 rounded text-gray-500">
                                ${existingStaff.system_role.replace('_', ' ')}
                            </div>
                        </div>
                        <input type="hidden" name="person_id" value="${existingStaff.person_id}">
                    ` : `
                        <div class="relative">
                            <input type="text" id="member-search" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 placeholder-gray-500" placeholder="Type name..." autocomplete="off">
                            <input type="hidden" id="selected-person-id" name="person_id" required>
                            
                            <div id="helper-text" class="text-xs text-gray-500 mt-2">
                                Search for any existing Pilot, Instructor, or Staff member.
                            </div>
                        </div>
                    `}
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-400 mb-1">Assigned Role</label>
                    <select name="admin_role_id" required class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500">
                        <option value="" disabled ${!isEdit ? 'selected' : ''}>Select Admin Role...</option>
                        ${roleOptions}
                    </select>
                </div>

                <div class="pt-4 flex justify-end space-x-3 border-t border-gray-700">
                    <button type="button" id="modal-cancel" class="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors">Cancel</button>
                    ${isEdit ? `
                        <button type="button" id="btn-revoke" class="px-4 py-2 bg-red-900/50 text-red-200 border border-red-800 rounded hover:bg-red-800 transition-colors mr-auto">Revoke Access</button>
                        <button type="submit" class="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors font-medium">Update Role</button>
                    ` : `
                        <button type="submit" id="btn-submit" disabled class="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                            Promote Member
                        </button>
                    `}
                </div>
            </form>
        </div>
    `;

    // add the click outside to close
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            if (activeModal) activeModal.remove();
            activeModal = null;
        }
    });

    // add escape key to close
    const escKeyListener = (e) => {
        if (e.key === "Escape") {
            if (activeModal) activeModal.remove();
            activeModal = null;
            document.removeEventListener('keydown', escKeyListener);
        }
    };
    document.addEventListener('keydown', escKeyListener);
    cleanupFunctions.push(() => document.removeEventListener('keydown', escKeyListener));


    document.body.appendChild(modalOverlay);
    activeModal = modalOverlay;

    // --- SETUP AUTOCOMPLETE (Promote Mode Only) ---
    if (!isEdit) {
        setupPersonAutocomplete({
            inputId: 'member-search',
            hiddenId: 'selected-person-id',
            peopleData: allMembers,
            roleFilter: 'all', // Can promote anyone
            onSelect: (item) => {
                // Enable submit button when valid selection made
                const btn = document.getElementById('btn-submit');
                if (btn) btn.disabled = false;

                // Update helper text to confirm selection
                const helper = document.getElementById('helper-text');
                if (helper) helper.innerHTML = `<span class="text-green-400">✓ Selected: ${item.name} (${item.type})</span>`;
            }
        });
    }

    // --- HANDLERS ---
    const close = () => { if (activeModal) activeModal.remove(); activeModal = null; };
    modalOverlay.querySelector('#modal-close').onclick = close;
    modalOverlay.querySelector('#modal-cancel').onclick = close;

    const btnRevoke = modalOverlay.querySelector('#btn-revoke');
    if (btnRevoke) {
        btnRevoke.onclick = async () => {
            if (!confirm("Are you sure? This user will lose all admin privileges.")) return;
            try {
                const { error } = await supabase.schema('api').rpc('revoke_admin_role', {
                    target_user_id: existingStaff.auth_id,
                    target_role_id: existingStaff.admin_role_id
                });
                if (error) throw error;
                showToast("Admin access revoked", "success");
                close();
                loadStaffPage();
            } catch (e) { showToast(e.message, "error"); }
        }
    }

    const form = modalOverlay.querySelector('form');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const personId = formData.get('person_id');
        const roleId = formData.get('admin_role_id');
        const btn = form.querySelector('button[type="submit"]');

        // Basic Validation
        if (!personId) {
            showToast("Please select a member first", "warning");
            return;
        }

        // Add Loading State
        const originalText = btn.innerHTML;
        btn.innerHTML = `<span class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full inline-block mr-2"></span> Processing...`;
        btn.disabled = true;

        try {
            if (isEdit) {
                // Modify existing
                const { error } = await supabase.schema('api').rpc('modify_user_admin_role', {
                    target_user_id: existingStaff.auth_id,
                    old_role_id: existingStaff.admin_role_id,
                    new_role_id: roleId
                });
                if (error) throw error;
                showToast("Role updated successfully", "success");
            } else {
                // Promote New
                // Logic: Person ID -> Auth ID lookup -> Assign Role
                const { error } = await supabase.schema('api').rpc('promote_person_to_admin', {
                    target_person_id: personId,
                    target_role_id: roleId
                });
                if (error) throw error;
                showToast("Member successfully promoted to Staff", "success");
            }
            close();
            loadStaffPage();
        } catch (err) {
            console.error(err);
            showToast(err.message, "error");
            // Reset button on error
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    };
}

export function cleanupStaffPage() {
    if (activeModal) activeModal.remove();
    cleanupFunctions.forEach(fn => fn());
    cleanupFunctions = [];
}