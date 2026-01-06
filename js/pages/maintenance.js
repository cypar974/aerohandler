// ./js/pages/maintenance.js
import { supabase } from "../supabase.js";
import { showToast } from "../components/showToast.js";
import { loadMaintenanceDetailsPage } from "./MaintenanceDetails.js";

// --- STATE MANAGEMENT ---
let maintenanceRecords = [];
let planes = [];
let technicians = [];
let activeModal = null;
let currentFilter = 'active';
let sortState = { column: 'created_at', direction: 'desc' };

// --- CLEANUP MANAGEMENT ---
let cleanupFunctions = [];

export async function loadMaintenancePage() {
    console.log('Loading maintenance page...');


    cleanupMaintenancePage();


    document.getElementById("main-content").innerHTML = `
        <div class="flex flex-col h-full text-white relative">
            <div class="flex justify-between items-center mb-6">
                <h1 class="text-2xl font-bold text-white">Maintenance Tracker</h1>
            </div>
            <div class="flex-1 flex items-center justify-center">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        </div>
    `;


    try {
        await fetchData();
        renderMainLayout();
    } catch (error) {
        console.error("Maintenance Load Error:", error);
        renderErrorScreen(error.message);
    }
}

// --- DATA LAYER ---
async function fetchData() {

    const [planesRes, maintRes, techsRes] = await Promise.all([
        supabase.schema('api').rpc('get_planes'),
        supabase.schema('api').rpc('get_maintenance_records'),
        supabase.schema('api').rpc('get_users_by_role', { user_role: 'maintenance_technician' })
    ]);

    if (planesRes.error) throw new Error("Failed to load Fleet: " + planesRes.error.message);
    if (maintRes.error) throw new Error("Failed to load Maintenance Records: " + maintRes.error.message);


    planes = planesRes.data || [];
    maintenanceRecords = maintRes.data || [];
    technicians = techsRes.data || [];
}

// --- RENDERING ---

function renderErrorScreen(errorMessage) {
    const content = document.getElementById("main-content");
    content.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full text-white space-y-4">
            <div class="bg-red-900/50 p-6 rounded-lg border border-red-700 max-w-lg text-center">
                <svg class="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                <h2 class="text-xl font-bold mb-2">Unable to Load Maintenance Data</h2>
                <p class="text-gray-300 mb-6">${errorMessage}</p>
                <button id="retry-btn" class="px-6 py-2 bg-red-600 hover:bg-red-500 rounded-lg transition-colors font-medium">
                    Try Again
                </button>
            </div>
        </div>
    `;

    const retryBtn = document.getElementById("retry-btn");
    retryBtn.addEventListener("click", loadMaintenancePage);
    cleanupFunctions.push(() => retryBtn.removeEventListener("click", loadMaintenancePage));
}

function renderMainLayout() {

    const activeIssues = maintenanceRecords.filter(r => r.status !== 'Completed' && r.status !== 'Cancelled').length;
    const groundedPlanes = planes.filter(p => p.status === 'maintenance' || p.status === 'out_of_service').length;
    const pendingInspections = maintenanceRecords.filter(r => r.status === 'Pending').length;

    const content = document.getElementById("main-content");
    content.innerHTML = `
        <div class="flex flex-col h-full text-white relative animate-fade-in">
            <div class="flex justify-between items-center mb-6">
                <div>
                    <h1 class="text-2xl font-bold text-white">Maintenance Tracker</h1>
                    <p class="text-gray-400 text-sm">Manage fleet health, inspections, and repairs.</p>
                </div>
                <button id="new-ticket-btn" class="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-500 transition-colors duration-200 font-medium flex items-center space-x-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                    </svg>
                    <span>New Ticket</span>
                </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div class="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-md">
                    <div class="text-gray-400 text-sm font-medium uppercase">Active Issues</div>
                    <div class="text-3xl font-bold text-yellow-500 mt-1">${activeIssues}</div>
                </div>
                <div class="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-md">
                    <div class="text-gray-400 text-sm font-medium uppercase">Grounded Fleet</div>
                    <div class="text-3xl font-bold text-red-500 mt-1">${groundedPlanes} <span class="text-lg text-gray-500 font-normal">/ ${planes.length}</span></div>
                </div>
                <div class="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-md">
                    <div class="text-gray-400 text-sm font-medium uppercase">Pending Inspections</div>
                    <div class="text-3xl font-bold text-blue-400 mt-1">${pendingInspections}</div>
                </div>
            </div>

            <div class="flex border-b border-gray-700 mb-4">
                <button id="tab-active" class="px-6 py-3 font-medium text-sm transition-colors border-b-2 ${currentFilter === 'active' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-400 hover:text-gray-200'}">
                    Active & Pending
                </button>
                <button id="tab-history" class="px-6 py-3 font-medium text-sm transition-colors border-b-2 ${currentFilter === 'history' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-400 hover:text-gray-200'}">
                    History
                </button>
            </div>

            <div class="flex-1 overflow-hidden flex flex-col bg-gray-900 rounded-lg border border-gray-700 shadow-lg">
                <div class="overflow-x-auto flex-1">
                    <table class="min-w-full text-left text-sm text-gray-300">
                        <thead class="bg-gray-800 text-gray-200 uppercase font-medium sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th class="px-6 py-3 cursor-pointer hover:bg-gray-700" data-sort="created_at">Date</th>
                                <th class="px-6 py-3 cursor-pointer hover:bg-gray-700" data-sort="plane">Plane</th>
                                <th class="px-6 py-3">Issue / Description</th>
                                <th class="px-6 py-3 cursor-pointer hover:bg-gray-700" data-sort="due_hours">Due (Hrs)</th>
                                <th class="px-6 py-3 cursor-pointer hover:bg-gray-700" data-sort="status">Status</th>
                                <th class="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="maintenance-table-body" class="divide-y divide-gray-700">
                            </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    attachMainEventListeners();
    renderTableRows();
}

function renderTableRows() {
    const tbody = document.getElementById("maintenance-table-body");
    if (!tbody) return;
    tbody.innerHTML = '';


    let filtered = maintenanceRecords.filter(r => {
        const isActive = r.status === 'Pending' || r.status === 'In Progress';
        return currentFilter === 'active' ? isActive : !isActive;
    });


    filtered.sort((a, b) => {
        let valA = a[sortState.column];
        let valB = b[sortState.column];


        if (sortState.column === 'plane') {
            valA = getPlaneTail(a.plane_id);
            valB = getPlaneTail(b.plane_id);
        }

        if (valA < valB) return sortState.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortState.direction === 'asc' ? 1 : -1;
        return 0;
    });


    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-8 text-center text-gray-500 italic">
                    No ${currentFilter} maintenance records found.
                </td>
            </tr>
        `;
        return;
    }


    filtered.forEach(record => {
        const plane = planes.find(p => p.id === record.plane_id);
        const tail = plane ? plane.tail_number : 'Unknown';
        const date = new Date(record.created_at).toLocaleDateString();
        const statusColor = getStatusColor(record.status);


        let hoursDisplay = '-';
        if (record.due_hours && plane) {
            const diff = record.due_hours - plane.hours_flown;
            const isOverdue = diff < 0;
            hoursDisplay = `<span class="${isOverdue ? 'text-red-400 font-bold' : ''}">${record.due_hours.toFixed(1)} (${diff > 0 ? '+' : ''}${diff.toFixed(1)})</span>`;
        }

        const tr = document.createElement('tr');

        tr.className = "hover:bg-gray-800 transition-colors group cursor-pointer border-b border-gray-800 last:border-none";

        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-gray-400">${date}</td>
            <td class="px-6 py-4 font-bold text-white">${tail}</td>
            <td class="px-6 py-4 max-w-xs truncate text-gray-300" title="${record.notes || ''}">
                ${record.notes || '<span class="text-gray-600 italic">No notes</span>'}
            </td>
            <td class="px-6 py-4 font-mono text-xs text-gray-400">${hoursDisplay}</td>
            <td class="px-6 py-4">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColor}">
                    ${record.status}
                </span>
            </td>
            <td class="px-6 py-4 text-right">
                <button class="text-gray-500 hover:text-white mr-3 edit-btn p-1 rounded hover:bg-gray-700 transition-colors" title="Edit">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                </button>
            </td>
        `;




        tr.addEventListener('click', (e) => {

            if (e.target.closest('.edit-btn')) return;

            loadMaintenanceDetailsPage(record.id);
        });


        const editBtn = tr.querySelector('.edit-btn');
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openMaintenanceModal(record);
        });

        tbody.appendChild(tr);
    });
}

// --- EVENT HANDLING ---

function attachMainEventListeners() {
    const newBtn = document.getElementById("new-ticket-btn");
    const tabActive = document.getElementById("tab-active");
    const tabHistory = document.getElementById("tab-history");

    const handleNew = () => openMaintenanceModal();
    const handleTabActive = () => switchTab('active');
    const handleTabHistory = () => switchTab('history');

    newBtn.addEventListener("click", handleNew);
    tabActive.addEventListener("click", handleTabActive);
    tabHistory.addEventListener("click", handleTabHistory);


    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.dataset.sort;
            if (sortState.column === col) {
                sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
            } else {
                sortState.column = col;
                sortState.direction = 'asc';
            }
            renderTableRows();
        });
    });

    cleanupFunctions.push(() => {
        if (newBtn) newBtn.removeEventListener("click", handleNew);
        if (tabActive) tabActive.removeEventListener("click", handleTabActive);
        if (tabHistory) tabHistory.removeEventListener("click", handleTabHistory);
    });
}

function switchTab(tab) {
    currentFilter = tab;


    const btnActive = document.getElementById("tab-active");
    const btnHistory = document.getElementById("tab-history");

    if (tab === 'active') {
        btnActive.className = "px-6 py-3 font-medium text-sm transition-colors border-b-2 border-blue-500 text-blue-500";
        btnHistory.className = "px-6 py-3 font-medium text-sm transition-colors border-b-2 border-transparent text-gray-400 hover:text-gray-200";
    } else {
        btnActive.className = "px-6 py-3 font-medium text-sm transition-colors border-b-2 border-transparent text-gray-400 hover:text-gray-200";
        btnHistory.className = "px-6 py-3 font-medium text-sm transition-colors border-b-2 border-blue-500 text-blue-500";
    }

    renderTableRows();
}

// --- MODAL SYSTEM (Self-contained for robustness) ---

function openMaintenanceModal(record = null) {
    if (activeModal) activeModal.remove();

    const isEdit = !!record;

    const modalOverlay = document.createElement('div');
    modalOverlay.className = "fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in";


    const planeOptions = planes.map(p =>
        `<option value="${p.id}" ${record && record.plane_id === p.id ? 'selected' : ''}>${p.tail_number} (${p.status})</option>`
    ).join('');

    const statusOptions = ['Pending', 'In Progress', 'Completed', 'Cancelled'].map(s =>
        `<option value="${s}" ${record && record.status === s ? 'selected' : ''}>${s}</option>`
    ).join('');

    modalOverlay.innerHTML = `
        <div class="bg-gray-800 rounded-lg shadow-xl border border-gray-700 w-full max-w-lg overflow-hidden transform transition-all scale-100">
            <div class="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
                <h3 class="text-xl font-bold text-white">${isEdit ? 'Edit Ticket' : 'New Maintenance Ticket'}</h3>
                <button id="modal-close" class="text-gray-400 hover:text-white focus:outline-none">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            
            <form id="maint-form" class="p-6 space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-400 mb-1">Aircraft</label>
                    <select name="plane_id" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" required>
                        <option value="" disabled ${!isEdit ? 'selected' : ''}>Select Plane...</option>
                        ${planeOptions}
                    </select>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-400 mb-1">Status</label>
                    <select name="status" id="status-select" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500">
                        ${statusOptions}
                    </select>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-400 mb-1">Cost (Est.)</label>
                        <input type="number" step="0.01" name="cost" value="${record?.cost || ''}" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" placeholder="0.00">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-400 mb-1">Due Hours (Tach)</label>
                        <input type="number" step="0.1" name="due_hours" value="${record?.due_hours || ''}" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" placeholder="e.g. 1540.5">
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-400 mb-1">Description / Notes</label>
                    <textarea name="notes" rows="4" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" placeholder="Describe the issue...">${record?.notes || ''}</textarea>
                </div>

                <div class="pt-4 flex justify-end space-x-3">
                    ${isEdit ? `<button type="button" id="btn-delete" class="px-4 py-2 border border-red-600 text-red-500 rounded hover:bg-red-900/30 transition-colors">Delete</button>` : ''}
                    <button type="button" id="modal-cancel" class="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors">Cancel</button>
                    <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors flex items-center">
                        <span id="btn-spinner" class="hidden animate-spin h-4 w-4 mr-2 border-b-2 border-white rounded-full"></span>
                        Save
                    </button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modalOverlay);
    activeModal = modalOverlay;


    const close = () => {

        if (modalOverlay.isConnected) {
            document.body.removeChild(modalOverlay);
        }

        if (activeModal === modalOverlay) {
            activeModal = null;
        }
    };

    const form = modalOverlay.querySelector('#maint-form');
    const closeBtn = modalOverlay.querySelector('#modal-close');
    const cancelBtn = modalOverlay.querySelector('#modal-cancel');
    const deleteBtn = modalOverlay.querySelector('#btn-delete');

    closeBtn.onclick = close;
    cancelBtn.onclick = close;

    if (deleteBtn) {
        deleteBtn.onclick = async () => {
            if (confirm("Are you sure you want to delete this record?")) {
                await deleteRecord(record.id);


            }
        };
    }

    form.onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        const payload = {
            plane_id: data.plane_id,
            status: data.status,
            notes: data.notes,
            cost: data.cost ? parseFloat(data.cost) : 0,
            due_hours: data.due_hours ? parseFloat(data.due_hours) : null
        };

        const btnSpinner = modalOverlay.querySelector('#btn-spinner');
        btnSpinner.classList.remove('hidden');

        try {
            if (isEdit) {
                const { error } = await supabase.schema('api').rpc('update_maintenance_record', {
                    maint_uuid: record.id,
                    payload: payload
                });
                if (error) throw error;
                showToast("Maintenance updated", "success");
            } else {
                const { error } = await supabase.schema('api').rpc('insert_maintenance_record', {
                    payload: payload
                });
                if (error) throw error;
                showToast("Ticket created", "success");
            }




            await loadMaintenancePage();

        } catch (err) {
            console.error(err);
            showToast(err.message, "error");

            if (activeModal) btnSpinner.classList.add('hidden');
        }
    };
}

// --- HELPER FUNCTIONS ---

async function deleteRecord(id) {
    try {

        const { error } = await supabase.schema('api').rpc('delete_maintenance_record', {
            maint_uuid: id
        });

        if (error) throw error;
        showToast("Record deleted", "success");
        await loadMaintenancePage();
    } catch (error) {
        showToast("Delete failed: " + error.message, "error");
    }
}

function getPlaneTail(planeId) {
    const p = planes.find(x => x.id === planeId);
    return p ? p.tail_number : 'Unknown';
}

function getStatusColor(status) {
    switch (status) {
        case 'Pending': return 'bg-yellow-900 text-yellow-200 border-yellow-700';
        case 'In Progress': return 'bg-blue-900 text-blue-200 border-blue-700';
        case 'Completed': return 'bg-green-900 text-green-200 border-green-700';
        case 'Cancelled': return 'bg-gray-700 text-gray-400 border-gray-600';
        default: return 'bg-gray-800 text-gray-300';
    }
}

export function cleanupMaintenancePage() {

    cleanupFunctions.forEach(fn => fn());
    cleanupFunctions = [];


    if (activeModal) {
        activeModal.remove();
        activeModal = null;
    }



    const content = document.getElementById("main-content");
    if (content) content.innerHTML = "";
}
