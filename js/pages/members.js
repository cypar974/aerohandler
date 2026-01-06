// ./js/pages/members.js
import { supabase } from "../supabase.js";
import { showToast } from "../components/showToast.js";
import { Autocomplete } from "../components/autocomplete.js";
import { AddMemberModal } from "../modals/AddMemberModal.js";
import { getMembers } from "../utils/memberData.js";
import { SettleDebtModal } from "../modals/SettleDebtModal.js";


let membersData = [];
let sortState = { column: "last_name", direction: "asc" };
let searchState = { column: "last_name", query: "" };
let filterRole = "all";
let currentPage = 1;
const rowsPerPage = 10;
let searchAutocomplete = null;
let addMemberModal = null;
let settleDebtModal = null;
let currentGenericMemberId = null;

export async function loadMembersPage() {

    const canManageMembers = true;


    document.getElementById("main-content").innerHTML = `
        <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
            <div>
                <h1 class="text-3xl font-bold text-white mb-2">Member Directory</h1>
                <p class="text-gray-400">View and manage all club members, pilots, and staff</p>
            </div>
            <div class="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <div class="flex gap-2">
                    <select id="role-filter" class="p-2 border border-gray-600 rounded-lg bg-gray-800 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="all">All Roles</option>
                        <option value="student">Students</option>
                        <option value="instructor">Instructors</option>
                        <option value="regular_pilot">Regular Pilots</option>
                        <option value="maintenance_technician">Technicians</option>
                        <option value="other_person">Others</option>
                    </select>
                    <div class="relative w-full lg:w-64">
                        <input type="text" id="search-box" placeholder="Search members..." class="pl-10 pr-4 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white placeholder-gray-400 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full">
                        <div class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                        </div>
                    </div>
                </div>
                ${canManageMembers ? `
                <button id="add-member-btn" class="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-500 hover:to-blue-600 transition-all duration-200 font-medium flex items-center gap-2 justify-center">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                    Add Member
                </button>
                ` : ''}
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div class="bg-gradient-to-br from-gray-700 to-gray-800 p-4 rounded-xl shadow-lg border border-gray-600">
                <div class="text-gray-300 text-sm font-medium">Total Members</div>
                <div class="text-2xl font-bold text-white mt-1" id="stat-total">-</div>
            </div>
            <div class="bg-gradient-to-br from-blue-600 to-blue-700 p-4 rounded-xl shadow-lg">
                <div class="text-blue-200 text-sm font-medium">Students</div>
                <div class="text-2xl font-bold text-white mt-1" id="stat-students">-</div>
            </div>
            <div class="bg-gradient-to-br from-purple-600 to-purple-700 p-4 rounded-xl shadow-lg">
                <div class="text-purple-200 text-sm font-medium">Instructors</div>
                <div class="text-2xl font-bold text-white mt-1" id="stat-instructors">-</div>
            </div>
            <div class="bg-gradient-to-br from-green-600 to-green-700 p-4 rounded-xl shadow-lg">
                <div class="text-green-200 text-sm font-medium">Regular Pilots</div>
                <div class="text-2xl font-bold text-white mt-1" id="stat-pilots">-</div>
            </div>
        </div>

        <div class="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-white">
                    <thead class="bg-gray-700 text-gray-200">
                        <tr>
                            <th class="p-4 cursor-pointer hover:bg-gray-600 transition-colors group" data-column="last_name">
                                <div class="flex items-center">
                                    <span>Name</span>
                                    <span class="sort-arrow text-gray-400 group-hover:text-white ml-2"></span>
                                </div>
                            </th>
                            <th class="p-4 cursor-pointer hover:bg-gray-600 transition-colors group" data-column="type">
                                <div class="flex items-center">
                                    <span>Role</span>
                                    <span class="sort-arrow text-gray-400 group-hover:text-white ml-2"></span>
                                </div>
                            </th>
                            <th class="p-4 cursor-pointer hover:bg-gray-600 transition-colors group" data-column="email">
                                <div class="flex items-center">
                                    <span>Email</span>
                                    <span class="sort-arrow text-gray-400 group-hover:text-white ml-2"></span>
                                </div>
                            </th>
                            <th class="p-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody id="members-table" class="divide-y divide-gray-700"></tbody>
                </table>
            </div>
            
            <div id="loading-state" class="hidden p-8 text-center">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <p class="text-gray-400 mt-4">Loading members...</p>
            </div>

            <div id="empty-state" class="hidden p-8 text-center">
                <svg class="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
                </svg>
                <h3 class="text-lg font-medium text-gray-300 mb-2">No members found</h3>
                <p class="text-gray-500">Try adjusting your search or filters</p>
            </div>
        </div>

        <div id="pagination" class="flex justify-center items-center mt-6 space-x-2"></div>
    `;

    await fetchMembers();
    setupEventListeners();
}

function setupEventListeners() {
    const searchBox = document.getElementById("search-box");


    addMemberModal = new AddMemberModal();
    addMemberModal.init();


    addMemberModal.onSuccess(async () => {
        await fetchMembers();
    });

    if (searchBox) {
        searchAutocomplete = new Autocomplete({
            inputElement: searchBox,
            dataSource: [],
            allowedTypes: ['student', 'instructor', 'regular_pilot', 'maintenance_technician', 'other_person'],
            displayField: 'name',
            valueField: 'id',
            additionalFields: ['email', 'type'],
            placeholder: 'Search members...',
            onInput: (query) => {
                searchState.query = query.toLowerCase();
                currentPage = 1;
                renderTable();
            },
            onSelect: (item) => {
                if (item && item.rawItem) {
                    routeToMember(item.rawItem);
                }
            }
        });
    }

    document.getElementById("role-filter").addEventListener("change", (e) => {
        filterRole = e.target.value;
        currentPage = 1;
        renderTable();
    });

    document.querySelectorAll("th[data-column]").forEach(th => {
        th.addEventListener("click", () => {
            const column = th.getAttribute("data-column");
            toggleSort(column);
        });
    });

    document.getElementById("add-member-btn")?.addEventListener("click", () => {
        if (addMemberModal) addMemberModal.show();
    });
}

async function fetchMembers() {
    showLoading(true);
    try {


        const { data, error } = await getMembers();

        if (error) throw error;

        membersData = data.map(m => ({
            ...m,
            name: `${m.first_name} ${m.last_name}`
        }));

        if (searchAutocomplete) {
            searchAutocomplete.updateData(membersData);
        }

        updateStats(membersData);
        renderTable();
    } catch (error) {
        console.error('Error fetching members:', error);
        showToast('Error loading members: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

function updateStats(data) {
    document.getElementById("stat-total").textContent = data.length;
    document.getElementById("stat-students").textContent = data.filter(m => m.type === 'student').length;
    document.getElementById("stat-instructors").textContent = data.filter(m => m.type === 'instructor').length;
    document.getElementById("stat-pilots").textContent = data.filter(m => m.type === 'regular_pilot').length;
}

function showLoading(show) {
    const loading = document.getElementById("loading-state");
    const table = document.getElementById("members-table");
    const empty = document.getElementById("empty-state");

    if (show) {
        loading?.classList.remove("hidden");
        if (table) table.innerHTML = "";
        empty?.classList.add("hidden");
    } else {
        loading?.classList.add("hidden");
    }
}

function renderTable() {
    let filtered = membersData.filter(m => {

        const searchStr = searchState.query;
        const matchesSearch = !searchStr ||
            m.name.toLowerCase().includes(searchStr) ||
            (m.email && m.email.toLowerCase().includes(searchStr));


        const matchesRole = filterRole === 'all' || m.type === filterRole;

        return matchesSearch && matchesRole;
    });

    const emptyState = document.getElementById("empty-state");
    const tableBody = document.getElementById("members-table");

    if (filtered.length === 0) {
        emptyState.classList.remove("hidden");
        tableBody.innerHTML = "";
        renderPagination(0);
        return;
    } else {
        emptyState.classList.add("hidden");
    }


    filtered.sort((a, b) => {
        let valA = a[sortState.column] || "";
        let valB = b[sortState.column] || "";


        if (sortState.column === 'last_name') {
            valA = a.last_name + a.first_name;
            valB = b.last_name + b.first_name;
        }

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return sortState.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortState.direction === "asc" ? 1 : -1;
        return 0;
    });


    const totalPages = Math.ceil(filtered.length / rowsPerPage);
    const start = (currentPage - 1) * rowsPerPage;
    const pageData = filtered.slice(start, start + rowsPerPage);


    tableBody.innerHTML = pageData.map(member => `
        <tr class="hover:bg-gray-750 transition-colors cursor-pointer group" data-id="${member.id}" data-type="${member.type}">
            <td class="p-4 border-b border-gray-700">
                <div class="flex items-center">
                    <div class="w-10 h-10 ${getAvatarColor(member.type)} rounded-full flex items-center justify-center text-white font-bold mr-3 shadow-md">
                        ${member.first_name?.[0]?.toUpperCase() || '?'}${member.last_name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                        <div class="font-medium text-white">${member.first_name} ${member.last_name}</div>
                        <div class="text-xs text-gray-500 lg:hidden">${formatRole(member.type)}</div>
                    </div>
                </div>
            </td>
            <td class="p-4 border-b border-gray-700">
                ${getRoleBadge(member.type)}
            </td>
            <td class="p-4 border-b border-gray-700 text-gray-300">
                <div class="flex items-center gap-2">
                    ${member.email ? `
                        <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                        </svg>
                        ${member.email}
                    ` : '<span class="text-gray-600 italic">No email</span>'}
                </div>
            </td>
            <td class="p-4 border-b border-gray-700 text-right">
                <button class="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors group-hover:bg-gray-700">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                </button>
            </td>
        </tr>
    `).join('');


    tableBody.querySelectorAll('tr').forEach(row => {
        row.addEventListener('click', () => {
            const id = row.getAttribute('data-id');
            const type = row.getAttribute('data-type');
            const member = membersData.find(m => m.id === id);
            if (member) routeToMember(member);
        });
    });

    renderPagination(totalPages);
    updateSortArrows();
}

/**
 * Main Routing Logic
 */
async function routeToMember(member) {
    if (member.type === 'student') {
        window.dispatchEvent(new CustomEvent('navigate', {
            detail: {
                page: 'studentdetails',
                studentId: member.id,
                backPage: 'members'
            }
        }));
    } else if (member.type === 'instructor') {
        window.dispatchEvent(new CustomEvent('navigate', {
            detail: {
                page: 'instructordetails',
                instructorId: member.id,
                backPage: 'members'
            }
        }));
    } else {

        window.dispatchEvent(new CustomEvent('navigate', {
            detail: {
                page: 'memberdetails',
                memberId: member.id,
                type: member.type,
                backPage: 'members'
            }
        }));
    }
}

// --- Helper Functions ---

function toggleSort(column) {
    if (sortState.column !== column) {
        sortState = { column, direction: "asc" };
    } else {
        if (sortState.direction === "asc") sortState.direction = "desc";
        else if (sortState.direction === "desc") sortState.direction = "asc";
    }
    renderTable();
}

function updateSortArrows() {
    document.querySelectorAll("th[data-column]").forEach(th => {
        const column = th.getAttribute("data-column");
        const arrowSpan = th.querySelector(".sort-arrow");

        if (sortState.column === column) {
            arrowSpan.textContent = sortState.direction === "asc" ? "↑" : "↓";
        } else {
            arrowSpan.textContent = "";
        }
    });
}

function renderPagination(totalPages) {
    const pagination = document.getElementById("pagination");
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let buttons = '';


    buttons += `<button class="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50" ${currentPage === 1 ? 'disabled' : ''} onclick="document.dispatchEvent(new CustomEvent('page-change', {detail: ${currentPage - 1}}))">Prev</button>`;


    buttons += `<span class="px-4 py-1 text-gray-400 text-sm">Page ${currentPage} of ${totalPages}</span>`;


    buttons += `<button class="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50" ${currentPage === totalPages ? 'disabled' : ''} onclick="document.dispatchEvent(new CustomEvent('page-change', {detail: ${currentPage + 1}}))">Next</button>`;

    pagination.innerHTML = buttons;



    pagination.querySelectorAll('button').forEach(btn => {
        btn.onclick = (e) => {
            const txt = e.target.textContent;
            if (txt === 'Prev' && currentPage > 1) currentPage--;
            if (txt === 'Next' && currentPage < totalPages) currentPage++;
            renderTable();
        };
    });
}

function getRoleBadge(type) {
    const map = {
        'student': { label: 'Student', class: 'bg-blue-500/20 text-blue-400' },
        'instructor': { label: 'Instructor', class: 'bg-purple-500/20 text-purple-400' },
        'regular_pilot': { label: 'Regular Pilot', class: 'bg-green-500/20 text-green-400' },
        'maintenance_technician': { label: 'Technician', class: 'bg-orange-500/20 text-orange-400' },
        'other_person': { label: 'Other', class: 'bg-gray-500/20 text-gray-400' },
    };
    const config = map[type] || map['other_person'];
    return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.class}">${config.label}</span>`;
}

function formatRole(type) {
    if (!type) return '';
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function getAvatarColor(type) {
    switch (type) {
        case 'student': return 'bg-gradient-to-br from-blue-500 to-blue-600';
        case 'instructor': return 'bg-gradient-to-br from-purple-500 to-purple-600';
        case 'regular_pilot': return 'bg-gradient-to-br from-green-500 to-green-600';
        case 'maintenance_technician': return 'bg-gradient-to-br from-orange-500 to-orange-600';
        default: return 'bg-gradient-to-br from-gray-500 to-gray-600';
    }
}

export default {
    loadMembersPage
};