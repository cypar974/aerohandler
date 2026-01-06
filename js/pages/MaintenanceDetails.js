// ./js/pages/MaintenanceDetails.js
import { supabase } from "../supabase.js";
import { loadMaintenancePage } from "./maintenance.js";
import { showToast } from "../components/showToast.js";

// Global variable to track current ticket data for the modal
let currentTicketData = null;

export async function loadMaintenanceDetailsPage(maintenanceId) {
    const content = document.getElementById("main-content");


    content.innerHTML = `
        <div class="flex flex-col h-full text-white">
            <div class="mb-6">
                <button id="back-btn" class="text-gray-400 hover:text-white flex items-center transition-colors">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                    Back to Maintenance
                </button>
            </div>
            <div class="flex-1 flex items-center justify-center">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        </div>
    `;


    document.getElementById("back-btn").addEventListener("click", () => {
        loadMaintenancePage();
    });

    try {

        const { data: ticket, error: ticketError } = await supabase.schema('api')
            .rpc('get_maintenance_by_id', { maintenance_uuid: maintenanceId })
            .single();

        if (ticketError) throw ticketError;


        currentTicketData = ticket;


        const [planeRes, authorName, technicianName] = await Promise.all([
            supabase.schema('api').rpc('get_plane_by_id', { plane_uuid: ticket.plane_id }).single(),
            resolvePersonName(ticket.created_by),
            resolvePersonName(ticket.completed_by)
        ]);

        const plane = planeRes.data;


        renderDetails(ticket, plane, authorName, technicianName);

    } catch (error) {
        console.error("Details Load Error:", error);
        showToast("Error loading details: " + error.message, "error");
    }
}

// --- HELPER: Resolve UUID to Name ---
async function resolvePersonName(userId) {
    if (!userId) return "System / Unknown";

    const { data: userData } = await supabase.schema('api')
        .rpc('get_user_by_id', { user_uuid: userId })
        .single();

    if (!userData || !userData.person_id) return "Unknown User";


    const { data: members, error } = await supabase.schema('api').rpc('get_members');


    const personData = members ? members.find(p => p.id === userData.person_id) : null;

    if (personData) {
        return `${personData.first_name} ${personData.last_name} (${formatRole(personData.type)})`;
    }
    return "Unknown Person";
}

function formatRole(role) {
    if (!role) return '';
    return role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function renderDetails(ticket, plane, authorName, technicianName) {
    const content = document.getElementById("main-content");

    const statusColor = getStatusColor(ticket.status);
    const dateCreated = new Date(ticket.created_at).toLocaleString();
    const dateUpdated = new Date(ticket.updated_at).toLocaleString();
    const cost = ticket.cost ? `$${parseFloat(ticket.cost).toFixed(2)}` : 'TBD';
    const hoursDue = ticket.due_hours ? ticket.due_hours.toFixed(1) : 'N/A';

    let hoursDiffDisplay = '';
    if (ticket.due_hours && plane) {
        const diff = ticket.due_hours - plane.hours_flown;
        const color = diff < 0 ? 'text-red-400' : 'text-gray-400';
        hoursDiffDisplay = `<span class="${color} text-sm">(${diff > 0 ? '+' : ''}${diff.toFixed(1)} remaining)</span>`;
    }

    content.innerHTML = `
        <div class="flex flex-col h-full text-white animate-fade-in pb-10">
            <div class="mb-6 flex justify-between items-start">
                <div>
                    <button id="back-btn-final" class="mb-2 text-gray-400 hover:text-white flex items-center transition-colors text-sm font-medium">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                        Back to Maintenance
                    </button>
                    <h1 class="text-3xl font-bold flex items-center gap-4">
                        Maintenance Ticket
                        <span class="px-3 py-1 rounded-full text-base font-medium border ${statusColor}">
                            ${ticket.status}
                        </span>
                    </h1>
                    <p class="text-gray-500 text-sm mt-1">ID: ${ticket.id}</p>
                </div>
                
                <div class="flex gap-2">
                    <button id="edit-ticket-btn" class="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg transition-colors font-medium flex items-center shadow-lg">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        Edit Ticket
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div class="lg:col-span-2 space-y-6">
                    <div class="bg-gray-800 rounded-lg p-6 border border-gray-700 shadow-lg">
                        <h2 class="text-xl font-semibold mb-4 text-blue-400 flex items-center">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                            Issue Description
                        </h2>
                        <div class="bg-gray-900/50 rounded p-4 text-gray-200 leading-relaxed whitespace-pre-wrap min-h-[150px]">
                            ${ticket.notes || "No description provided."}
                        </div>
                    </div>

                    <div class="bg-gray-800 rounded-lg p-6 border border-gray-700 shadow-lg">
                        <h2 class="text-xl font-semibold mb-4 text-gray-300">History</h2>
                        <div class="space-y-4 border-l-2 border-gray-700 ml-2 pl-4">
                            <div class="relative">
                                <div class="absolute -left-[21px] top-1 w-3 h-3 bg-blue-500 rounded-full"></div>
                                <p class="text-sm text-gray-400">${dateCreated}</p>
                                <p class="font-medium text-white">Ticket Created</p>
                                <p class="text-sm text-gray-500">Reported by: <span class="text-gray-300">${authorName}</span></p>
                            </div>
                            
                            <div class="relative">
                                <div class="absolute -left-[21px] top-1 w-3 h-3 bg-gray-600 rounded-full"></div>
                                <p class="text-sm text-gray-400">${dateUpdated}</p>
                                <p class="font-medium text-white">Last Updated</p>
                            </div>

                            ${ticket.completed_at ? `
                            <div class="relative">
                                <div class="absolute -left-[21px] top-1 w-3 h-3 bg-green-500 rounded-full"></div>
                                <p class="text-sm text-gray-400">${new Date(ticket.completed_at).toLocaleString()}</p>
                                <p class="font-medium text-white">Work Completed</p>
                                <p class="text-sm text-gray-500">Technician: <span class="text-gray-300">${technicianName || 'Unknown'}</span></p>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <div class="space-y-6">
                    <div class="bg-gray-800 rounded-lg p-6 border border-gray-700 shadow-lg relative overflow-hidden group">
                        <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <svg class="w-24 h-24 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path></svg>
                        </div>
                        <h2 class="text-sm uppercase tracking-wider text-gray-400 font-semibold mb-2">Aircraft</h2>
                        <div class="text-4xl font-bold text-white mb-1">${plane ? plane.tail_number : 'Unknown'}</div>
                        <div class="text-gray-400 mb-4 text-sm">${plane ? 'Model ID: ' + plane.model_id : 'Model Unknown'}</div>
                        
                        <div class="grid grid-cols-2 gap-4 border-t border-gray-700 pt-4">
                            <div>
                                <div class="text-xs text-gray-500 uppercase">Current Tach</div>
                                <div class="text-lg font-mono text-white">${plane ? plane.hours_flown.toFixed(1) : '0.0'}</div>
                            </div>
                            <div>
                                <div class="text-xs text-gray-500 uppercase">Status</div>
                                <div class="text-lg text-white capitalize">${plane ? plane.status.replace('_', ' ') : 'Unknown'}</div>
                            </div>
                        </div>
                    </div>

                    <div class="bg-gray-800 rounded-lg p-6 border border-gray-700 shadow-lg">
                        <h2 class="text-sm uppercase tracking-wider text-gray-400 font-semibold mb-4">Maintenance Data</h2>
                        
                        <div class="space-y-4">
                            <div class="flex justify-between items-center border-b border-gray-700 pb-2">
                                <span class="text-gray-400">Due at (Tach)</span>
                                <div class="text-right">
                                    <div class="text-white font-mono">${hoursDue}</div>
                                    ${hoursDiffDisplay}
                                </div>
                            </div>

                            <div class="flex justify-between items-center border-b border-gray-700 pb-2">
                                <span class="text-gray-400">Est. Cost</span>
                                <span class="text-white font-medium">${cost}</span>
                            </div>

                            <div class="flex justify-between items-center">
                                <span class="text-gray-400">Technician</span>
                                <span class="text-white text-right text-sm max-w-[150px] truncate">${technicianName || 'Unassigned'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div id="modal-container"></div>
        </div>
    `;

    document.getElementById("back-btn-final").addEventListener("click", () => loadMaintenancePage());


    document.getElementById("edit-ticket-btn").addEventListener("click", () => {
        openEditModal(ticket);
    });
}

function getStatusColor(status) {
    switch (status) {
        case 'Pending': return 'bg-yellow-900/50 text-yellow-200 border-yellow-700';
        case 'In Progress': return 'bg-blue-900/50 text-blue-200 border-blue-700';
        case 'Completed': return 'bg-green-900/50 text-green-200 border-green-700';
        case 'Cancelled': return 'bg-gray-700/50 text-gray-400 border-gray-600';
        default: return 'bg-gray-800 text-gray-300';
    }
}

// ==========================================
// EDIT MODAL LOGIC
// ==========================================

function openEditModal(ticket) {
    const modalContainer = document.getElementById("modal-container");


    const statusOptions = ['Pending', 'In Progress', 'Completed', 'Cancelled'];

    modalContainer.innerHTML = `
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
            <div class="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl w-full max-w-lg mx-4 overflow-hidden transform transition-all scale-100">
                <div class="px-6 py-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
                    <h3 class="text-lg font-bold text-white">Edit Ticket</h3>
                    <button id="close-modal-btn" class="text-gray-400 hover:text-white transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div class="p-6">
                    <form id="edit-ticket-form" class="space-y-4">
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-400 mb-1">Status</label>
                            <select id="edit-status" class="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none">
                                ${statusOptions.map(opt => `
                                    <option value="${opt}" ${ticket.status === opt ? 'selected' : ''}>${opt}</option>
                                `).join('')}
                            </select>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-400 mb-1">Due Hours (Tach)</label>
                            <input type="number" step="0.1" id="edit-due-hours" value="${ticket.due_hours || ''}" class="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none">
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-400 mb-1">Cost ($)</label>
                            <input type="number" step="0.01" id="edit-cost" value="${ticket.cost || ''}" class="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none">
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-400 mb-1">Notes / Description</label>
                            <textarea id="edit-notes" rows="4" class="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none">${ticket.notes || ''}</textarea>
                        </div>

                        <div class="pt-4 flex justify-end gap-3">
                            <button type="button" id="cancel-edit-btn" class="px-4 py-2 text-gray-300 hover:text-white transition-colors">Cancel</button>
                            <button type="submit" class="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-all shadow-lg shadow-blue-900/20">
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;


    document.getElementById("close-modal-btn").onclick = closeEditModal;
    document.getElementById("cancel-edit-btn").onclick = closeEditModal;
    document.getElementById("edit-ticket-form").onsubmit = (e) => handleEditSubmit(e, ticket.id);
}

function closeEditModal() {
    const container = document.getElementById("modal-container");
    container.innerHTML = "";
}

async function handleEditSubmit(e, ticketId) {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerText;
    submitBtn.disabled = true;
    submitBtn.innerText = "Saving...";

    const payload = {


        plane_id: currentTicketData.plane_id,
        status: document.getElementById("edit-status").value,
        due_hours: document.getElementById("edit-due-hours").value || null,
        cost: document.getElementById("edit-cost").value || null,
        notes: document.getElementById("edit-notes").value
    };

    try {
        const { error } = await supabase.schema('api')
            .rpc('update_maintenance_record', {
                maint_uuid: ticketId,
                payload: payload
            });

        if (error) throw error;

        showToast("Ticket updated successfully", "success");
        closeEditModal();


        loadMaintenanceDetailsPage(ticketId);

    } catch (err) {
        console.error("Update failed:", err);
        showToast("Failed to update ticket: " + err.message, "error");
        submitBtn.disabled = false;
        submitBtn.innerText = originalText;
    }
}