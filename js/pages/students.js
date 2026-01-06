import { supabase } from "../supabase.js";
import { showToast } from "../components/showToast.js";
import { loadStudentDetailsPage } from "./studentdetails.js";
import { Autocomplete } from "../components/autocomplete.js";

let studentsData = [];
let sortState = { column: null, direction: "none" };
let searchState = { column: "first_name", query: "" };
let currentPage = 1;
const rowsPerPage = 10;
let searchAutocomplete = null;

export async function loadStudentsPage() {

    const canManageStudents = true;


    document.getElementById("main-content").innerHTML = `
        <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
            <div>
                <h1 class="text-3xl font-bold text-white mb-2">Student Management</h1>
                <p class="text-gray-400">Manage student records, profiles, and training progress</p>
            </div>
            <div class="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <div class="flex gap-2">
                    <select id="search-column" class="p-2 border border-gray-600 rounded-lg bg-gray-800 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="first_name">First Name</option>
                        <option value="last_name">Last Name</option>
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                        <option value="student_number">Student Number</option>
                        <option value="membership_status">Status</option>
                    </select>
                    <div class="relative w-full lg:w-64">
                        <input type="text" id="search-box" placeholder="Search students..." class="pl-10 pr-4 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white placeholder-gray-400 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full">
                        <div class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                        </div>
                    </div>
                </div>
                ${canManageStudents ? `
                <button id="add-student-btn" class="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-500 hover:to-blue-600 transition-all duration-200 font-medium flex items-center gap-2 justify-center">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                    Add Student
                </button>
                ` : ''}
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div class="bg-gradient-to-br from-blue-600 to-blue-700 p-4 rounded-xl shadow-lg">
                <div class="text-blue-200 text-sm font-medium">Total Students</div>
                <div class="text-2xl font-bold text-white mt-1" id="total-students">-</div>
            </div>
            <div class="bg-gradient-to-br from-green-600 to-green-700 p-4 rounded-xl shadow-lg">
                <div class="text-green-200 text-sm font-medium">Active Members</div>
                <div class="text-2xl font-bold text-white mt-1" id="active-students">-</div>
            </div>
            <div class="bg-gradient-to-br from-yellow-600 to-yellow-700 p-4 rounded-xl shadow-lg">
                <div class="text-yellow-200 text-sm font-medium">Pending Payments</div>
                <div class="text-2xl font-bold text-white mt-1" id="pending-payments">-</div>
            </div>
            <div class="bg-gradient-to-br from-purple-600 to-purple-700 p-4 rounded-xl shadow-lg">
                <div class="text-purple-200 text-sm font-medium">Avg. Flight Hours</div>
                <div class="text-2xl font-bold text-white mt-1" id="avg-hours">-</div>
            </div>
        </div>

        <div class="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-white">
                    <thead class="bg-gray-700 text-gray-200">
                        <tr>
                            <th class="p-4 cursor-pointer hover:bg-gray-600 transition-colors group" data-column="first_name">
                                <div class="flex items-center justify-between">
                                    <span>First Name</span>
                                    <span class="sort-arrow text-gray-400 group-hover:text-white"></span>
                                </div>
                            </th>
                            <th class="p-4 cursor-pointer hover:bg-gray-600 transition-colors group" data-column="last_name">
                                <div class="flex items-center justify-between">
                                    <span>Last Name</span>
                                    <span class="sort-arrow text-gray-400 group-hover:text-white"></span>
                                </div>
                            </th>
                            <th class="p-4 cursor-pointer hover:bg-gray-600 transition-colors group" data-column="email">
                                <div class="flex items-center justify-between">
                                    <span>Email</span>
                                    <span class="sort-arrow text-gray-400 group-hover:text-white"></span>
                                </div>
                            </th>
                            <th class="p-4 cursor-pointer hover:bg-gray-600 transition-colors group" data-column="phone">
                                <div class="flex items-center justify-between">
                                    <span>Phone</span>
                                    <span class="sort-arrow text-gray-400 group-hover:text-white"></span>
                                </div>
                            </th>
                            <th class="p-4 cursor-pointer hover:bg-gray-600 transition-colors group" data-column="student_number">
                                <div class="flex items-center justify-between">
                                    <span>Student #</span>
                                    <span class="sort-arrow text-gray-400 group-hover:text-white"></span>
                                </div>
                            </th>
                            <th class="p-4 cursor-pointer hover:bg-gray-600 transition-colors group" data-column="membership_status">
                                <div class="flex items-center justify-between">
                                    <span>Status</span>
                                    <span class="sort-arrow text-gray-400 group-hover:text-white"></span>
                                </div>
                            </th>
                            <th class="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="students-table" class="divide-y divide-gray-700"></tbody>
                </table>
            </div>
            
            <div id="loading-state" class="hidden p-8 text-center">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <p class="text-gray-400 mt-4">Loading students...</p>
            </div>

            <div id="empty-state" class="hidden p-8 text-center">
                <svg class="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
                </svg>
                <h3 class="text-lg font-medium text-gray-300 mb-2">No students found</h3>
                <p class="text-gray-500 mb-4">Get started by adding your first student</p>
                <button id="empty-add-btn" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 transition-colors">
                    Add Student
                </button>
            </div>
        </div>

        <div id="pagination" class="flex justify-center items-center mt-6 space-x-2"></div>

        <div id="student-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50 p-4">
            <div class="bg-gray-900 text-white p-6 rounded-xl shadow-2xl w-full max-w-2xl">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-xl font-bold">Add New Student</h2>
                    <button id="close-modal" class="text-gray-400 hover:text-white transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                <form id="add-student-form" class="space-y-6">
                    <fieldset class="border border-gray-700 p-4 rounded-lg bg-gray-800">
                        <legend class="font-semibold text-gray-100 px-2">Mandatory Information</legend>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-1">First Name *</label>
                                <input type="text" id="student-first-name" placeholder="Enter first name" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" required>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-1">Last Name *</label>
                                <input type="text" id="student-last-name" placeholder="Enter last name" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" required>
                            </div>
                            <div class="md:col-span-2">
                                <label class="block text-sm font-medium text-gray-300 mb-1">Email *</label>
                                <input type="email" id="student-email" placeholder="Enter email address" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" required>
                            </div>
                            <div class="md:col-span-2">
                                <label class="block text-sm font-medium text-gray-300 mb-2">Date of Birth *</label>
                                <div class="flex space-x-2">
                                    <div class="flex-1">
                                        <input type="number" id="dob-day" placeholder="DD" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" min="1" max="31" required>
                                    </div>
                                    <div class="flex-1">
                                        <input type="number" id="dob-month" placeholder="MM" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" min="1" max="12" required>
                                    </div>
                                    <div class="flex-1">
                                        <input type="number" id="dob-year" placeholder="YYYY" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" min="1900" max="2100" required>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </fieldset>

                    <fieldset class="border border-gray-700 p-4 rounded-lg bg-gray-800">
                        <legend class="font-semibold text-gray-100 px-2">Additional Information</legend>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                                <input type="text" id="student-phone" placeholder="Enter phone number" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-1">License Number</label>
                                <input type="text" id="license-number" placeholder="Enter license number" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                            </div>
                        </div>
                    </fieldset>

                    <div class="flex justify-end space-x-3 pt-4 border-t border-gray-700">
                        <button type="button" id="cancel-btn" class="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium">
                            Cancel
                        </button>
                        <button type="submit" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-medium flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            Save Student
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;


    setupEventListeners();
    await fetchStudents();
}

function setupEventListeners() {
    const addBtn = document.getElementById("add-student-btn");
    if (addBtn) addBtn.addEventListener("click", showAddModal);

    document.getElementById("empty-add-btn").addEventListener("click", showAddModal);
    document.getElementById("close-modal").addEventListener("click", hideAddModal);
    document.getElementById("cancel-btn").addEventListener("click", hideAddModal);

    document.querySelectorAll("th[data-column]").forEach(th => {
        th.addEventListener("click", () => {
            const column = th.getAttribute("data-column");
            toggleSort(column);
        });
    });

    document.getElementById("add-student-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        await addStudent();
    });


    const searchBox = document.getElementById("search-box");



    if (searchBox) {
        searchAutocomplete = new Autocomplete({
            inputElement: searchBox,
            dataSource: [],
            allowedTypes: ['student'],
            displayField: 'name',
            valueField: 'id',
            additionalFields: ['email', 'student_number'],
            placeholder: 'Search by name or email...',

            onInput: (query) => {
                searchState.query = query.toLowerCase();
                currentPage = 1;
                renderTable();
            },

            onSelect: (item) => {
                if (item && item.rawItem && item.rawItem.id) {
                    navigateToStudent(item.rawItem.id);
                }
            }
        });
    }

    document.getElementById("search-column").addEventListener("change", e => {
        searchState.column = e.target.value;
        currentPage = 1;
        renderTable();
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            const modal = document.getElementById("student-modal");
            if (modal && !modal.classList.contains("hidden")) {
                hideAddModal();
            }
        }
        if ((e.ctrlKey || e.metaKey) && e.key === "k") {
            e.preventDefault();
            const searchBox = document.getElementById("search-box");
            if (searchBox) {
                searchBox.focus();
            }
        }
    });


    document.getElementById("student-modal").addEventListener("click", (e) => {
        if (e.target.id === "student-modal") {
            hideAddModal();
        }
    });
}

function showAddModal() {
    document.getElementById("student-modal").classList.remove("hidden");
    document.getElementById("student-first-name").focus();
}

function hideAddModal() {
    const modal = document.getElementById("student-modal");
    if (modal) {
        modal.classList.add("hidden");
    }
    document.getElementById("add-student-form").reset();
}

async function fetchStudents() {
    showLoading(true);
    try {
        const { data, error } = await supabase.schema('api').rpc('get_students');

        if (!error) {

            studentsData = data.map(s => ({
                ...s,
                membership_status: s.membership_status || 'active',
                pending_payments: s.pending_payments || 0,
                total_hours: s.total_hours || 0
            }));


            if (searchAutocomplete) {



                const autocompleteData = studentsData.map(s => ({
                    ...s,
                    name: `${s.first_name} ${s.last_name}`,
                    type: 'student'
                }));
                searchAutocomplete.updateData(autocompleteData);
            }

            updateStatsCards(studentsData);
            renderTable();
        } else {
            console.error('Error fetching students:', error);
            showToast('Error loading students: ' + error.message, 'error');
        }
    } catch (error) {
        console.error('Error fetching students:', error);
        showToast('Error loading students', 'error');
    } finally {
        showLoading(false);
    }
}

function updateStatsCards(students) {
    const total = students.length;
    const active = students.filter(s => s.membership_status === 'active').length;

    const pendingPaymentsTotal = students.reduce((sum, student) => {
        return sum + (student.pending_payments || 0);
    }, 0);

    const totalHours = students.reduce((sum, student) => sum + (student.total_hours || 0), 0);
    const avgHours = total > 0 ? (totalHours / total).toFixed(1) : '0.0';

    document.getElementById("total-students").textContent = total;
    document.getElementById("active-students").textContent = active;
    document.getElementById("pending-payments").textContent = `$${pendingPaymentsTotal.toFixed(0)}`;
    document.getElementById("avg-hours").textContent = avgHours;
}

function showLoading(show) {
    const loading = document.getElementById("loading-state");
    const table = document.getElementById("students-table");
    const empty = document.getElementById("empty-state");

    if (!loading || !table || !empty) return;

    if (show) {
        loading.classList.remove("hidden");
        table.innerHTML = "";
        empty.classList.add("hidden");
    } else {
        loading.classList.add("hidden");
    }
}

function renderTable() {

    let filteredData = studentsData.filter(student => {
        if (!searchState.query) return true;



        if (searchState.column === 'first_name') {

            const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
            if (fullName.includes(searchState.query)) return true;
        }

        const value = (student[searchState.column] || "").toString().toLowerCase();
        return value.includes(searchState.query);
    });


    const emptyState = document.getElementById("empty-state");
    const tableBody = document.getElementById("students-table");

    if (filteredData.length === 0) {
        emptyState.classList.remove("hidden");
        tableBody.innerHTML = "";
        renderPagination(0);
        return;
    } else {
        emptyState.classList.add("hidden");
    }


    if (sortState.direction !== "none") {
        filteredData.sort((a, b) => {
            let aVal = a[sortState.column] || "";
            let bVal = b[sortState.column] || "";

            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();

            if (aVal < bVal) return sortState.direction === "asc" ? -1 : 1;
            if (aVal > bVal) return sortState.direction === "asc" ? 1 : -1;
            return 0;
        });
    }


    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const pageData = filteredData.slice(startIndex, endIndex);


    tableBody.innerHTML = pageData.map((student, index) => `
        <tr class="hover:bg-gray-750 transition-colors cursor-pointer group" data-id="${student.id}">
            <td class="p-4 border-b border-gray-700">
                <div class="flex items-center">
                    <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
                        ${student.first_name?.[0]?.toUpperCase() || 'S'}
                    </div>
                    <span class="font-medium">${student.first_name || ""}</span>
                </div>
            </td>
            <td class="p-4 border-b border-gray-700 font-medium">${student.last_name || ""}</td>
            <td class="p-4 border-b border-gray-700">
                <div class="flex items-center">
                    <svg class="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                    </svg>
                    ${student.email || ""}
                </div>
            </td>
            <td class="p-4 border-b border-gray-700">
                ${student.phone ? `
                    <div class="flex items-center">
                        <svg class="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                        </svg>
                        ${student.phone}
                    </div>
                ` : '<span class="text-gray-500">-</span>'}
            </td>
            <td class="p-4 border-b border-gray-700 font-mono text-sm">${student.student_number || '<span class="text-gray-500">-</span>'}</td>
            <td class="p-4 border-b border-gray-700">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${student.membership_status === 'active'
            ? 'bg-green-500/20 text-green-400'
            : student.membership_status === 'inactive'
                ? 'bg-gray-500/20 text-gray-400'
                : 'bg-yellow-500/20 text-yellow-400'
        }">
                    ${student.membership_status || 'inactive'}
                </span>
            </td>
            <td class="p-4 border-b border-gray-700 text-right">
                <div class="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors view-student" data-id="${student.id}">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                        </svg>
                    </button>
                    <button class="p-2 text-gray-400 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-colors edit-student" data-id="${student.id}">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                    </button>
                    <button class="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors delete-student" data-id="${student.id}">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');


    tableBody.querySelectorAll('tr[data-id]').forEach(row => {
        row.addEventListener('click', (e) => {

            if (!e.target.closest('button')) {
                const studentId = row.getAttribute('data-id');

                if (studentId) {
                    navigateToStudent(studentId);
                }
            }
        });
    });


    tableBody.querySelectorAll('.view-student').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const studentId = btn.getAttribute('data-id');

            if (studentId) {
                navigateToStudent(studentId);
            }
        });
    });

    tableBody.querySelectorAll('.edit-student').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const studentId = btn.getAttribute('data-id');
            editStudent(studentId);
        });
    });

    tableBody.querySelectorAll('.delete-student').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const studentId = btn.getAttribute('data-id');
            deleteStudent(studentId);
        });
    });

    updateSortArrows();
    renderPagination(totalPages, filteredData.length);
}

function navigateToStudent(studentId) {
    window.dispatchEvent(new CustomEvent('navigate', {
        detail: {
            page: 'studentdetails',
            studentId: studentId,
            backPage: 'students'
        }
    }));
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
        fetchStudents();
    } else {
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

function renderPagination(totalPages, totalItems) {
    const pagination = document.getElementById("pagination");


    if (totalItems === 0) {
        pagination.innerHTML = '';
        return;
    }


    const startItem = (currentPage - 1) * rowsPerPage + 1;
    const endItem = Math.min(currentPage * rowsPerPage, totalItems);

    let buttons = `
        <div class="text-sm text-gray-400">
            Showing ${startItem}-${endItem} of ${totalItems} students
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

async function addStudent() {
    const submitBtn = document.querySelector('#add-student-form button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto"></div>
            Saving...
        `;

        const firstName = document.getElementById("student-first-name").value.trim();
        const lastName = document.getElementById("student-last-name").value.trim();
        const email = document.getElementById("student-email").value.trim();
        const day = document.getElementById("dob-day").value;
        const month = document.getElementById("dob-month").value;
        const year = document.getElementById("dob-year").value;


        if (!firstName || !lastName || !email) {
            showToast("Please fill in all required fields", "error");
            return;
        }


        const dob = `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        const dobDate = new Date(dob);
        if (isNaN(dobDate.getTime())) {
            showToast("Please enter a valid date of birth", "error");
            return;
        }

        const phone = document.getElementById("student-phone").value.trim();
        const license = document.getElementById("license-number").value.trim();


        const { data: allStudents, error: fetchError } = await supabase.schema('api').rpc('get_students');

        if (fetchError) throw fetchError;

        let nextStudentNumber = 1;
        if (allStudents && allStudents.length > 0) {
            const numbers = allStudents
                .map(s => parseInt(s.student_number))
                .filter(n => !isNaN(n));
            if (numbers.length > 0) {
                nextStudentNumber = Math.max(...numbers) + 1;
            }
        }

        const payload = {
            first_name: firstName,
            last_name: lastName,
            email: email,
            date_of_birth: dob,
            student_number: nextStudentNumber.toString().padStart(4, '0'),
            phone: phone,
            license_number: license,
            join_date: new Date().toISOString().split('T')[0],
            membership_status: 'active'
        };


        const { error } = await supabase.schema('api').rpc('insert_student', { payload });

        if (error) throw error;




        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {

                redirectTo: window.location.origin + '/update-password.html'
            });

            if (resetError) {
                console.error("User created, but email failed:", resetError);
                showToast("Student saved, but Invite Email failed: " + resetError.message, "warning");
            } else {
                showToast("Student saved & Invite Email sent!", "success");
            }
        } catch (emailErr) {
            console.error("Unexpected email error:", emailErr);
            showToast("Student saved, but Invite Email failed.", "warning");
        }


        hideAddModal();
        await fetchStudents();


    } catch (error) {
        console.error('Error adding student:', JSON.stringify(error, null, 2));

        const message = error.message || error.error_description || error.details || "Unknown error";
        showToast("Error adding student: " + message, "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

async function deleteStudent(studentId) {
    if (!confirm("Are you sure you want to delete this student? This action cannot be undone.")) {
        return;
    }

    try {
        const { error } = await supabase.schema('api').rpc('delete_student', { student_uuid: studentId });

        if (error) throw error;

        await fetchStudents();
        showToast("Student deleted successfully", "success");
    } catch (error) {
        console.error('Error deleting student:', error);
        showToast("Error deleting student: " + error.message, "error");
    }
}

async function editStudent(studentId) {
    try {
        const { data: students, error } = await supabase.schema('api').rpc('get_student_by_id', { student_uuid: studentId });

        if (error) throw error;

        const student = students && students.length > 0 ? students[0] : null;

        if (student) {
            showEditModal(student);
        } else {
            showToast("Student not found", "error");
        }
    } catch (error) {
        console.error('Error loading student for edit:', error);
        showToast("Error loading student data", "error");
    }
}

function showEditModal(student) {
    const modalHtml = `
        <div id="edit-student-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div class="bg-gray-900 text-white p-6 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-xl font-bold">Edit Student</h2>
                    <button id="close-edit-modal" class="text-gray-400 hover:text-white transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                <form id="edit-student-form" class="space-y-6">
                    <fieldset class="border border-gray-700 p-4 rounded-lg bg-gray-800">
                        <legend class="font-semibold text-gray-100 px-2">Basic Information</legend>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-1">First Name *</label>
                                <input type="text" id="edit-student-first-name" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" required>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-1">Last Name *</label>
                                <input type="text" id="edit-student-last-name" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" required>
                            </div>
                            <div class="md:col-span-2">
                                <label class="block text-sm font-medium text-gray-300 mb-1">Email *</label>
                                <input type="email" id="edit-student-email" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" required>
                            </div>
                            <div class="md:col-span-2">
                                <label class="block text-sm font-medium text-gray-300 mb-2">Date of Birth *</label>
                                <div class="flex space-x-2">
                                    <div class="flex-1">
                                        <input type="number" id="edit-dob-day" placeholder="DD" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" min="1" max="31" required>
                                    </div>
                                    <div class="flex-1">
                                        <input type="number" id="edit-dob-month" placeholder="MM" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" min="1" max="12" required>
                                    </div>
                                    <div class="flex-1">
                                        <input type="number" id="edit-dob-year" placeholder="YYYY" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" min="1900" max="2100" required>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                                <input type="text" id="edit-student-phone" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-1">Membership Status</label>
                                <select id="edit-membership-status" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="pending">Pending</option>
                                </select>
                            </div>
                        </div>
                    </fieldset>

                    <fieldset class="border border-gray-700 p-4 rounded-lg bg-gray-800">
                        <legend class="font-semibold text-gray-100 px-2">Contact & Emergency</legend>
                        <div class="grid grid-cols-1 gap-4 mt-2">
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-1">Address</label>
                                <textarea id="edit-address" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" rows="2"></textarea>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-300 mb-1">Emergency Contact Name</label>
                                    <input type="text" id="edit-emergency-contact" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-300 mb-1">Emergency Contact Phone</label>
                                    <input type="text" id="edit-emergency-phone" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                                </div>
                            </div>
                        </div>
                    </fieldset>

                    <fieldset class="border border-gray-700 p-4 rounded-lg bg-gray-800">
                        <legend class="font-semibold text-gray-100 px-2">License & Medical</legend>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-1">License Number</label>
                                <input type="text" id="edit-license-number" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-1">License Expiry</label>
                                <input type="date" id="edit-license-expiry" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-1">Medical Expiry</label>
                                <input type="date" id="edit-medical-expiry" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                            </div>
                        </div>
                    </fieldset>

                    <div class="flex justify-end space-x-3 pt-4 border-t border-gray-700">
                        <button type="button" id="cancel-edit-btn" class="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium">
                            Cancel
                        </button>
                        <button type="submit" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-medium flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            Update Student
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;


    document.body.insertAdjacentHTML('beforeend', modalHtml);


    document.getElementById("edit-student-first-name").value = student.first_name || "";
    document.getElementById("edit-student-last-name").value = student.last_name || "";
    document.getElementById("edit-student-email").value = student.email || "";
    document.getElementById("edit-student-phone").value = student.phone || "";
    document.getElementById("edit-license-number").value = student.license_number || "";
    document.getElementById("edit-membership-status").value = student.membership_status || "active";
    document.getElementById("edit-address").value = student.address || "";
    document.getElementById("edit-emergency-contact").value = student.emergency_contact_name || "";
    document.getElementById("edit-emergency-phone").value = student.emergency_contact_phone || "";

    if (student.license_expiry) {
        document.getElementById("edit-license-expiry").value = student.license_expiry;
    }
    if (student.medical_expiry) {
        document.getElementById("edit-medical-expiry").value = student.medical_expiry;
    }

    if (student.date_of_birth) {
        const [year, month, day] = student.date_of_birth.split('-');
        document.getElementById("edit-dob-day").value = parseInt(day);
        document.getElementById("edit-dob-month").value = parseInt(month);
        document.getElementById("edit-dob-year").value = parseInt(year);
    }


    document.getElementById("close-edit-modal").addEventListener("click", hideEditModal);
    document.getElementById("cancel-edit-btn").addEventListener("click", hideEditModal);
    document.getElementById("edit-student-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        await updateStudent(student.id);
    });


    document.getElementById("edit-student-modal").addEventListener("click", (e) => {
        if (e.target.id === "edit-student-modal") {
            hideEditModal();
        }
    });
}

function hideEditModal() {
    const modal = document.getElementById("edit-student-modal");
    if (modal) {
        modal.remove();
    }
}

async function updateStudent(studentId) {
    const submitBtn = document.querySelector('#edit-student-form button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto"></div>
            Updating...
        `;

        const firstName = document.getElementById("edit-student-first-name").value.trim();
        const lastName = document.getElementById("edit-student-last-name").value.trim();
        const email = document.getElementById("edit-student-email").value.trim();
        const day = document.getElementById("edit-dob-day").value;
        const month = document.getElementById("edit-dob-month").value;
        const year = document.getElementById("edit-dob-year").value;


        if (!firstName || !lastName || !email) {
            showToast("Please fill in all required fields", "error");
            return;
        }


        const dob = `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        const dobDate = new Date(dob);
        if (isNaN(dobDate.getTime())) {
            showToast("Please enter a valid date of birth", "error");
            return;
        }

        const phone = document.getElementById("edit-student-phone").value.trim();
        const license = document.getElementById("edit-license-number").value.trim();
        const membershipStatus = document.getElementById("edit-membership-status")?.value;
        const licenseExpiry = document.getElementById("edit-license-expiry")?.value;
        const medicalExpiry = document.getElementById("edit-medical-expiry")?.value;
        const address = document.getElementById("edit-address")?.value.trim();
        const emergencyContact = document.getElementById("edit-emergency-contact")?.value.trim();
        const emergencyPhone = document.getElementById("edit-emergency-phone")?.value.trim();

        const updatePayload = {
            first_name: firstName,
            last_name: lastName,
            email: email,
            date_of_birth: dob,
            phone: phone,
            license_number: license,
            updated_at: new Date().toISOString()
        };

        if (membershipStatus) updatePayload.membership_status = membershipStatus;
        if (licenseExpiry) updatePayload.license_expiry = licenseExpiry;
        if (medicalExpiry) updatePayload.medical_expiry = medicalExpiry;
        if (address) updatePayload.address = address;
        if (emergencyContact) updatePayload.emergency_contact_name = emergencyContact;
        if (emergencyPhone) updatePayload.emergency_contact_phone = emergencyPhone;

        Object.keys(updatePayload).forEach(key => {
            if (updatePayload[key] === '' || updatePayload[key] === null) {
                delete updatePayload[key];
            }
        });

        const { error } = await supabase.schema('api').rpc('update_student', {
            student_uuid: studentId,
            payload: updatePayload
        });

        if (error) throw error;

        hideEditModal();
        await fetchStudents();
        showToast("Student updated successfully!", "success");

    } catch (error) {
        console.error('Error updating student:', error);
        showToast("Error updating student: " + error.message, "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}
export default {
    loadStudentsPage
};

export { editStudent };