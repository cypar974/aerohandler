// ./js/pages/instructors.js
import { supabase } from "../supabase.js";
import { showToast } from "../components/showToast.js";
import { setupPersonAutocomplete } from "../components/autocomplete.js";
import { InstructorModal } from "../modals/InstructorModal.js";
// --- DEMO MODE: PERMISSIONS FLAG ---
const canEdit = true;
// -----------------------------------

let instructorsData = [];
let sortState = { column: null, direction: "none" };
let searchState = { column: "first_name", query: "" };
let searchAutocomplete = null;
let tableStateBackup = {
    instructorsData: [],
    currentPage: 1,
    sortState: { column: null, direction: "none" },
    searchState: { column: "first_name", query: "" }
};

let instructorModal = null;

let currentPage = 1;
const rowsPerPage = 10;

export async function loadInstructorsPage() {
    instructorModal = new InstructorModal();
    document.getElementById("main-content").innerHTML = `
        <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
            <div>
                <h1 class="text-2xl font-bold text-white mb-2">Flight Instructors</h1>
                <p class="text-gray-400">Manage instructor profiles, ratings, and flight hours</p>
            </div>
            <div class="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <div class="flex gap-2">
                    <select id="search-column" class="px-3 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="first_name">Name</option>
                        <option value="email">Email</option>
                        <option value="ratings">Ratings</option>
                        <option value="total_hours">Hours</option>
                    </select>
                    <div class="relative w-full lg:w-64">
                        <input type="text" id="search-box" placeholder="Search instructors..." class="pl-10 pr-4 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white placeholder-gray-400 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full">
                        <input type="hidden" id="search-instructor-id">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>
                </div>
                ${canEdit ? `
                <button id="add-instructor-btn" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 transition-colors duration-200 flex items-center justify-center gap-2 font-medium text-sm">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Instructor
                </button>
                ` : ''}
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div class="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-400 text-sm font-medium">Total Instructors</p>
                        <p class="text-2xl font-bold text-white mt-1" id="total-instructors">0</p>
                    </div>
                    <div class="p-2 bg-blue-500/20 rounded-lg">
                        <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </div>
                </div>
            </div>
            <div class="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-400 text-sm font-medium">Active Today</p>
                        <p class="text-2xl font-bold text-white mt-1" id="active-today">0</p>
                    </div>
                    <div class="p-2 bg-green-500/20 rounded-lg">
                        <svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                </div>
            </div>
            <div class="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-400 text-sm font-medium">Total Hours</p>
                        <p class="text-2xl font-bold text-white mt-1" id="total-hours">0</p>
                    </div>
                    <div class="p-2 bg-purple-500/20 rounded-lg">
                        <svg class="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                </div>
            </div>
            <div class="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-400 text-sm font-medium">Pending Payments</p>
                        <p class="text-2xl font-bold text-white mt-1" id="pending-payments">$0</p>
                    </div>
                    <div class="p-2 bg-yellow-500/20 rounded-lg">
                        <svg class="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>

        <div class="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full text-white">
                    <thead class="bg-gray-750 text-gray-200">
                        <tr>
                            <th class="p-4 cursor-pointer hover:bg-gray-700 transition-colors duration-150 text-left" data-column="first_name">
                                <div class="flex items-center gap-2">
                                    <span>Instructor</span>
                                    <span class="sort-arrow text-xs"></span>
                                </div>
                            </th>
                            <th class="p-4 cursor-pointer hover:bg-gray-700 transition-colors duration-150 text-left" data-column="email">
                                <div class="flex items-center gap-2">
                                    <span>Contact</span>
                                    <span class="sort-arrow text-xs"></span>
                                </div>
                            </th>
                            <th class="p-4 cursor-pointer hover:bg-gray-700 transition-colors duration-150 text-left" data-column="ratings">
                                <div class="flex items-center gap-2">
                                    <span>Ratings</span>
                                    <span class="sort-arrow text-xs"></span>
                                </div>
                            </th>
                            <th class="p-4 cursor-pointer hover:bg-gray-700 transition-colors duration-150 text-left" data-column="total_hours">
                                <div class="flex items-center gap-2">
                                    <span>Flight Hours</span>
                                    <span class="sort-arrow text-xs"></span>
                                </div>
                            </th>
                            <th class="p-4 cursor-pointer hover:bg-gray-700 transition-colors duration-150 text-left" data-column="created_at">
                                <div class="flex items-center gap-2">
                                    <span>Join Date</span>
                                    <span class="sort-arrow text-xs"></span>
                                </div>
                            </th>
                            <th class="p-4 text-left">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="instructors-table" class="divide-y divide-gray-700"></tbody>
                </table>
            </div>
            
            <div id="loading-state" class="hidden p-8 text-center">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p class="text-gray-400 mt-2">Loading instructors...</p>
            </div>

            <div id="empty-state" class="hidden p-8 text-center">
                <svg class="w-12 h-12 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 class="text-lg font-medium text-white mb-2">No instructors found</h3>
                <p class="text-gray-400 mb-4">Get started by adding your first flight instructor.</p>
                <button id="empty-state-add-btn" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 transition-colors duration-200">
                    Add Instructor
                </button>
            </div>

            <div id="pagination" class="flex justify-between items-center p-4 border-t border-gray-700"></div>
        </div>
    `;

    await fetchInstructors();
    setupEventListeners();
}

function setupEventListeners() {
    if (document.getElementById("add-instructor-btn")) {
        document.getElementById("add-instructor-btn").addEventListener("click", () => {
            instructorModal.show(null, fetchInstructors);
        });
    }
    if (document.getElementById("empty-state-add-btn")) {
        document.getElementById("empty-state-add-btn").addEventListener("click", () => {
            instructorModal.show(null, fetchInstructors);
        });
    }

    document.querySelectorAll("th[data-column]").forEach(th => {
        th.addEventListener("click", () => {
            const column = th.getAttribute("data-column");
            toggleSort(column);
        });
    });





    document.getElementById("search-box").addEventListener("input", e => {
        searchState.query = e.target.value.toLowerCase();
        currentPage = 1;
        renderTable();
    });

    document.getElementById("search-column").addEventListener("change", e => {
        searchState.column = e.target.value;
        currentPage = 1;
        renderTable();
    });

    document.addEventListener('instructorSaved', () => {
        fetchInstructors();
    });

}

function initSearchAutocomplete() {

    if (searchAutocomplete) {
        searchAutocomplete.destroy();
    }




    const autocompleteData = instructorsData.map(i => ({
        ...i,
        type: 'instructor'
    }));

    searchAutocomplete = setupPersonAutocomplete({
        inputId: 'search-box',
        hiddenId: 'search-instructor-id',
        peopleData: autocompleteData,
        roleFilter: 'instructors',
        onSelect: (selected) => {


            document.getElementById("search-column").value = "first_name";
            searchState.column = "first_name";


            searchState.query = selected.value.toLowerCase();
            currentPage = 1;
            renderTable();
        }
    });
}

async function fetchInstructors() {
    showLoadingState(true);


    const { data, error } = await supabase.schema('api').rpc('get_instructors');

    if (!error) {

        instructorsData = data.sort((a, b) =>
            new Date(b.created_at) - new Date(a.created_at)
        );


        initSearchAutocomplete();

        updateStatsOverview();
        renderTable();
    } else {
        console.error('Error fetching instructors:', error);
        showToast('Error loading instructors: ' + error.message, 'error');
    }

    showLoadingState(false);
}

function updateStatsOverview() {
    document.getElementById("total-instructors").textContent = instructorsData.length;

    const today = new Date().toISOString().split('T')[0];
    const activeToday = instructorsData.filter(instructor =>
        instructor.created_at && instructor.created_at.startsWith(today)
    ).length;
    document.getElementById("active-today").textContent = activeToday;

    const totalHours = instructorsData.reduce((sum, instructor) =>
        sum + (parseFloat(instructor.total_hours) || 0), 0
    );
    document.getElementById("total-hours").textContent = totalHours.toFixed(1);


    updatePendingPaymentsStats();
}

async function updatePendingPaymentsStats() {
    try {

        const { data, error } = await supabase.schema('api').rpc('get_pending_transactions');

        if (error) throw error;

        if (data) {


            const totalPending = data
                .filter(t => t.transaction_direction === 'payable' && t.transaction_type === 'instructor')
                .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);

            document.getElementById("pending-payments").textContent = `$${totalPending.toFixed(2)}`;
        }
    } catch (error) {
        console.error('Error fetching pending payments:', error);

        document.getElementById("pending-payments").textContent = "$0.00";
    }
}

function showLoadingState(show) {
    const loading = document.getElementById("loading-state");
    const table = document.getElementById("instructors-table");
    const empty = document.getElementById("empty-state");

    if (show) {
        loading.classList.remove("hidden");
        table.innerHTML = "";
        empty.classList.add("hidden");
    } else {
        loading.classList.add("hidden");
    }
}

function renderTable() {
    const tbody = document.getElementById("instructors-table");
    const emptyState = document.getElementById("empty-state");


    let filteredData = instructorsData.filter(instructor => {
        if (!searchState.query) return true;

        let value = "";
        if (searchState.column === "first_name") {

            value = `${instructor.first_name || ''} ${instructor.last_name || ''}`.toLowerCase().trim();
        } else {
            value = (instructor[searchState.column] || "").toString().toLowerCase();
        }

        return value.includes(searchState.query);
    });


    if (filteredData.length === 0) {
        tbody.innerHTML = "";
        emptyState.classList.remove("hidden");
        document.getElementById("pagination").innerHTML = "";
        return;
    } else {
        emptyState.classList.add("hidden");
    }


    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const pageData = filteredData.slice(startIndex, endIndex);


    tbody.innerHTML = pageData.map((instructor, index) => {
        const fullName = `${instructor.first_name || ''} ${instructor.last_name || ''}`.trim();
        const initials = instructor.first_name && instructor.last_name ?
            `${instructor.first_name[0]}${instructor.last_name[0]}`.toUpperCase() : '??';

        return `
            <tr class="hover:bg-gray-750 transition-colors duration-150 group cursor-pointer">
                <td class="p-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            ${initials}
                        </div>
                        <div>
                            <div class="font-semibold text-white">${fullName || "Unknown"}</div>
                            <div class="text-sm text-gray-400">ID: ${instructor.id.slice(-8)}</div>
                        </div>
                    </div>
                </td>
                <td class="p-4">
                    <div class="text-white">${instructor.email || "No email"}</div>
                    <div class="text-sm text-gray-400">Joined ${instructor.created_at ? new Date(instructor.created_at).toLocaleDateString() : "Unknown"}</div>
                </td>
                <td class="p-4">
                    <div class="flex flex-wrap gap-1">
                        ${instructor.ratings ? instructor.ratings.split(',').map(rating => `
                            <span class="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs font-medium">${rating.trim()}</span>
                        `).join('') : '<span class="text-gray-500 text-sm">No ratings</span>'}
                    </div>
                </td>
                <td class="p-4">
                    <div class="flex items-center gap-2">
                        <div class="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div class="h-full bg-purple-500 rounded-full" style="width: ${Math.min((parseFloat(instructor.total_hours) || 0) / 1000 * 100, 100)}%"></div>
                        </div>
                        <span class="font-semibold text-white">${instructor.total_hours || "0"}</span>
                        <span class="text-gray-400 text-sm">hours</span>
                    </div>
                </td>
                <td class="p-4">
                    <div class="text-white">${instructor.created_at ? new Date(instructor.created_at).toLocaleDateString() : "N/A"}</div>
                </td>
                <td class="p-4">
                    <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        ${canEdit ? `
                        <button class="edit-instructor-btn p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded-lg transition-colors duration-200" data-id="${instructor.id}">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                        ` : ''}
                        <button class="view-instructor-btn p-2 text-green-400 hover:text-green-300 hover:bg-green-500/20 rounded-lg transition-colors duration-200" data-id="${instructor.id}">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');


    tbody.querySelectorAll('.view-instructor-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const instructorId = btn.getAttribute('data-id');
            viewInstructorProfile(instructorId);
        });
    });

    if (canEdit) {
        tbody.querySelectorAll('.edit-instructor-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const instructorId = btn.getAttribute('data-id');
                const instructor = instructorsData.find(i => i.id === instructorId);


                if (instructor) instructorModal.show(instructor, fetchInstructors);
            });
        });
    }


    tbody.querySelectorAll('tr').forEach(row => {
        row.addEventListener('click', () => {
            const instructorId = row.querySelector('.view-instructor-btn').getAttribute('data-id');
            viewInstructorProfile(instructorId);
        });
    });

    updateSortArrows();
    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    const pagination = document.getElementById("pagination");

    let filteredData = instructorsData.filter(instructor => {
        if (!searchState.query) return true;

        let value = "";
        if (searchState.column === "first_name") {
            value = `${instructor.first_name || ''} ${instructor.last_name || ''}`.toLowerCase().trim();
        } else {
            value = (instructor[searchState.column] || "").toString().toLowerCase();
        }

        return value.includes(searchState.query);
    });

    if (totalPages <= 1) {
        pagination.innerHTML = `
            <div class="text-sm text-gray-400">
                Showing ${filteredData.length} instructor${filteredData.length !== 1 ? 's' : ''}
            </div>
        `;
        return;
    }

    const startItem = (currentPage - 1) * rowsPerPage + 1;
    const endItem = Math.min(currentPage * rowsPerPage, filteredData.length);

    let buttons = `
        <div class="text-sm text-gray-400">
            Showing ${startItem}-${endItem} of ${filteredData.length} instructors
        </div>
        <div class="flex gap-1">
    `;

    if (currentPage > 1) {
        buttons += `
            <button class="px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors duration-200 text-sm font-medium" data-page="${currentPage - 1}">
                Previous
            </button>
        `;
    }


    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
        buttons += `<button class="px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors duration-200 text-sm" data-page="1">1</button>`;
        if (startPage > 2) {
            buttons += `<span class="px-2 py-2 text-gray-400">...</span>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        buttons += `
            <button class="px-3 py-2 border border-gray-600 rounded-lg text-sm font-medium transition-colors duration-200 ${i === currentPage
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-gray-700 text-white hover:bg-gray-600"
            }" data-page="${i}">${i}</button>
        `;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            buttons += `<span class="px-2 py-2 text-gray-400">...</span>`;
        }
        buttons += `<button class="px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors duration-200 text-sm" data-page="${totalPages}">${totalPages}</button>`;
    }

    if (currentPage < totalPages) {
        buttons += `
            <button class="px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors duration-200 text-sm font-medium" data-page="${currentPage + 1}">
                Next
            </button>
        `;
    }

    buttons += `</div>`;
    pagination.innerHTML = buttons;

    pagination.querySelectorAll("button[data-page]").forEach(btn => {
        btn.addEventListener("click", () => {
            currentPage = parseInt(btn.getAttribute("data-page"));
            renderTable();
        });
    });
}

function backupTableState() {
    tableStateBackup = {
        instructorsData: [...instructorsData],
        currentPage,
        sortState: { ...sortState },
        searchState: { ...searchState }
    };
}

function viewInstructorProfile(instructorId) {
    backupTableState();


    window.location.hash = `#instructor/${instructorId}`;
    window.dispatchEvent(new CustomEvent('navigate', {
        detail: {
            page: 'instructordetails',
            instructorId,
            backPage: 'instructors'
        }
    }));
}

export function editInstructor(instructorId) {
    const instructor = instructorsData.find(i => i.id === instructorId);
    if (instructor) {
        if (!instructorModal) instructorModal = new InstructorModal();
        instructorModal.show(instructor, fetchInstructors);
    }
}

function toggleSort(column) {
    if (sortState.column !== column) {
        sortState = { column, direction: "asc" };
    } else {
        if (sortState.direction === "asc") sortState.direction = "desc";
        else if (sortState.direction === "desc") sortState.direction = "none";
        else sortState.direction = "asc";
    }

    if (sortState.direction === "none") {
        fetchInstructors();
    } else {
        instructorsData.sort((a, b) => {
            if (column === 'first_name') {
                const aFullName = `${a.first_name || ''} ${a.last_name || ''}`.toLowerCase();
                const bFullName = `${b.first_name || ''} ${b.last_name || ''}`.toLowerCase();
                if (aFullName < bFullName) return sortState.direction === "asc" ? -1 : 1;
                if (aFullName > bFullName) return sortState.direction === "asc" ? 1 : -1;
                return 0;
            }


            if (column === 'total_hours') {
                const aVal = parseFloat(a[column]) || 0;
                const bVal = parseFloat(b[column]) || 0;
                return sortState.direction === "asc" ? aVal - bVal : bVal - aVal;
            }


            if (column === 'created_at') {
                const aDate = new Date(a[column]);
                const bDate = new Date(b[column]);
                return sortState.direction === "asc" ? aDate - bDate : bDate - aDate;
            }


            const aVal = (a[column] || "").toString().toLowerCase();
            const bVal = (b[column] || "").toString().toLowerCase();
            if (aVal < bVal) return sortState.direction === "asc" ? -1 : 1;
            if (aVal > bVal) return sortState.direction === "asc" ? 1 : -1;
            return 0;
        });
        currentPage = 1;
        renderTable();
    }
}

function updateSortArrows() {
    document.querySelectorAll("th[data-column]").forEach(th => {
        const column = th.getAttribute("data-column");
        const arrowSpan = th.querySelector(".sort-arrow");

        if (sortState.column === column) {
            arrowSpan.textContent = sortState.direction === "asc" ? "↑" :
                sortState.direction === "desc" ? "↓" : "";
        } else {
            arrowSpan.textContent = "";
        }
    });
}

// Export the main function
export default {
    loadInstructorsPage
};