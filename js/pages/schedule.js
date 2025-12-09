// ./js/pages/schedule.js
import { supabase } from "../supabase.js";
import { AddBookingModal } from "../modals/AddBookingModal.js";
import { EditBookingModal } from "../modals/EditBookingModal.js";
import { BookingDetailsModal } from "../modals/BookingDetailsModal.js";
import { showToast } from "../components/showToast.js";
import { CustomDatePicker } from "../components/customDatePicker.js";
import { BookingCancelModal } from "../modals/BookingCancelModal.js";

let currentDate = new Date();
let searchQuery = "";
let bookings = [];
let planes = [];
let students = [];
let instructors = [];
let currentSearchType = "";
let currentPlanePage = 0;
const PLANES_PER_PAGE = 8;

let datePickerInstance = null;

const hours = Array.from({ length: 17 }, (_, i) => 6 + i);

let lastBookingClick = 0;
const CLICK_DEBOUNCE_MS = 500;

// Table view states
let tableView = false;
let sortState = { column: null, direction: "none" };
let searchState = { column: "pilot_name", query: "" };
let currentPage = 1;
const rowsPerPage = 10;

// Modal management
let activeModal = null;
let modalCleanupTimeout = null;

// Toggle state for showing all bookings vs future only
let showAllBookings = false;

export async function loadSchedulePage() {
    console.log('Loading schedule page...');
    lastBookingClick = 0;

    await cleanupSchedulePage();

    searchQuery = "";
    currentSearchType = "";
    currentPlanePage = 0;
    currentDate = new Date();
    tableView = false;
    showAllBookings = false;

    document.getElementById("main-content").innerHTML = `
        <div class="flex flex-col h-full text-white relative">
            <!-- View Toggle and Controls -->
            <div class="flex justify-between items-center mb-6">
                <div class="flex space-x-2">
                    <button id="schedule-view-btn" class="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors duration-200 font-medium">Schedule View</button>
                    <button id="table-view-btn" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors duration-200 font-medium">Table View</button>
                    
                    <!-- Show All Bookings Toggle -->
                    <div class="flex items-center space-x-3 ml-4">
                        <span class="text-sm text-gray-300">Show All Bookings</span>
                        <input type="checkbox" id="show-all-toggle" class="toggle">
                    </div>
                </div>
                <button id="create-booking-btn" class="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-500 transition-colors duration-200 font-medium flex items-center space-x-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                    <span>New Booking</span>
                </button>
            </div>

            <!-- Schedule View Content -->
            <div id="schedule-view" class="flex flex-col h-full">
                <!-- Search bar -->
                <div class="flex justify-between items-center mb-4 relative">
                    <div class="w-1/3 relative">
                        <div class="relative">
                            <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                            <input id="search-input" type="text" placeholder="Search by plane, person, or instructor..."
                                class="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200">
                        </div>
                        <ul id="search-suggestions"
                            class="absolute left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl hidden z-50 max-h-60 overflow-y-auto">
                        </ul>
                    </div>
                </div>

                <!-- Date navigation -->
                <div class="flex justify-center items-center mb-6 space-x-4">
                    <button id="prev-date" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors duration-200 flex items-center space-x-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                        </svg>
                        <span>${searchQuery ? 'Prev Week' : 'Prev Day'}</span>
                    </button>
                    <h2 class="text-xl font-bold flex items-center space-x-2 whitespace-nowrap">
                        <span id="schedule-title"></span>
                        <input type="text" id="current-date" class="cursor-pointer bg-gray-800 px-2 py-1 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500 w-32 text-lg !important" readonly>
                    </h2>
                    <button id="next-date" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors duration-200 flex items-center space-x-1">
                        <span>${searchQuery ? 'Next Week' : 'Next Day'}</span>
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                    </button>
                </div>

                <!-- Schedule container -->
                <div id="schedule-container" class="flex-1 overflow-x-auto border border-gray-700 rounded-lg bg-gray-900 shadow-lg"></div>

                <!-- Pagination -->
                <div id="pagination-controls" class="flex justify-center items-center mt-4 space-x-2 hidden">
                    <button id="prev-page" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors duration-200 flex items-center space-x-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                        </svg>
                        <span>Previous</span>
                    </button>
                    <span id="page-indicator" class="px-4 py-2 bg-gray-800 rounded-lg font-medium"></span>
                    <button id="next-page" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors duration-200 flex items-center space-x-1">
                        <span>Next</span>
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Table View Content -->
            <div id="table-view" class="hidden">
                <div class="flex justify-between items-center mb-6">
                    <div class="flex space-x-3 items-center">
                        <select id="time-filter" class="p-2.5 border border-gray-700 rounded-lg bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200">
                            <option value="all">All Bookings</option>
                            <option value="future">Future Bookings</option>
                            <option value="past">Past Bookings</option>
                        </select>
                        <select id="search-column" class="p-2.5 border border-gray-700 rounded-lg bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200">
                            <option value="pilot_name">Pilot Name</option>
                            <option value="plane_tail">Plane</option>
                            <option value="instructor_name">Instructor</option>
                            <option value="start_time">Date</option>
                            <option value="description">Description</option>
                        </select>
                        <div class="relative">
                            <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                            <input type="text" id="search-box" placeholder="Search..." class="pl-10 pr-4 py-2.5 border border-gray-700 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200">
                        </div>
                    </div>
                </div>
                
                <div class="overflow-x-auto rounded-lg shadow-lg">
                    <table class="min-w-full bg-gray-800 text-white rounded-lg text-center">
                        <thead class="bg-gray-700 text-gray-200">
                            <tr>
                                <th class="p-3 cursor-pointer hover:bg-gray-600 transition-colors duration-200" data-column="start_time">Date & Time <span class="sort-arrow"></span></th>
                                <th class="p-3 cursor-pointer hover:bg-gray-600 transition-colors duration-200" data-column="plane_tail">Plane <span class="sort-arrow"></span></th>
                                <th class="p-3 cursor-pointer hover:bg-gray-600 transition-colors duration-200" data-column="pilot_name">Pilot <span class="sort-arrow"></span></th>
                                <th class="p-3 cursor-pointer hover:bg-gray-600 transition-colors duration-200" data-column="instructor_name">Instructor <span class="sort-arrow"></span></th>
                                <th class="p-3 cursor-pointer hover:bg-gray-600 transition-colors duration-200" data-column="duration">Duration <span class="sort-arrow"></span></th>
                                <th class="p-3 cursor-pointer hover:bg-gray-600 transition-colors duration-200" data-column="description">Description <span class="sort-arrow"></span></th>
                                <th class="p-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="bookings-table" class="divide-y divide-gray-700"></tbody>
                    </table>
                </div>
                <div id="table-pagination" class="flex justify-center mt-6 space-x-2"></div>
            </div>
        </div>

       <style>
    .toggle {
        height: 32px;
        width: 52px;
        border-radius: 16px;
        display: inline-block;
        position: relative;
        margin: 0;
        border: 2px solid #474755;
        background: linear-gradient(180deg, #2D2F39 0%, #1F2027 100%);
        transition: all .2s ease;
        -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none;
        -webkit-tap-highlight-color: transparent;
        cursor: pointer;
    }
    
    .toggle:focus {
        outline: 0;
    }
    
    .toggle:after {
        content: '';
        position: absolute;
        top: 2px;
        left: 2px;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: white;
        box-shadow: 0 1px 2px rgba(44,44,44,.2);
        transition: all .2s cubic-bezier(.5,.1,.75,1.35);
    }
    
    .toggle:checked {
        border-color: #3b82f6;
        background: linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%);
    }
    
    .toggle:checked:after {
        transform: translatex(20px);
    }
</style>
    `;

    attachScheduleEvents();
    setupTableViewEvents();
    setupSearchFunctionality();
    setupDateNavigation();
    setupPagination();
    setupToggleEvents();

    await fetchData();
    renderSchedule();
    renderTableView();

    window.addEventListener('beforeunload', cleanupSchedulePage);
}

function setupToggleEvents() {
    const toggle = document.getElementById('show-all-toggle');
    if (toggle) {
        // Set initial state to unchecked (off)
        toggle.checked = false;
        showAllBookings = false;

        toggle.addEventListener('change', function () {
            showAllBookings = this.checked;
            if (tableView) {
                renderTableView();
            } else {
                renderSchedule();
            }
        });
    }
}

async function fetchData() {
    try {
        const [planesResponse, studentsResponse, bookingsResponse, instructorsResponse] = await Promise.all([
            supabase.from("planes").select("*"),
            supabase.from("students").select("*"),
            supabase.from("bookings").select("*"),
            supabase.from("instructors").select("*")
        ]);

        if (planesResponse.error) throw planesResponse.error;
        if (studentsResponse.error) throw studentsResponse.error;
        if (bookingsResponse.error) throw bookingsResponse.error;
        if (instructorsResponse.error) console.error('Error fetching instructors:', instructorsResponse.error);

        planes = planesResponse.data || [];
        students = studentsResponse.data || [];
        bookings = bookingsResponse.data || [];
        instructors = instructorsResponse.data || [];

    } catch (error) {
        console.error('Error fetching data:', error);
        showToast('Error loading data: ' + error.message, 'error');
    }
}

function setupTableViewEvents() {
    // View toggle buttons
    document.getElementById("schedule-view-btn").addEventListener("click", () => {
        tableView = false;
        document.getElementById("schedule-view").classList.remove("hidden");
        document.getElementById("table-view").classList.add("hidden");
        document.getElementById("schedule-view-btn").classList.add("bg-blue-600");
        document.getElementById("schedule-view-btn").classList.remove("bg-gray-700");
        document.getElementById("table-view-btn").classList.remove("bg-blue-600");
        document.getElementById("table-view-btn").classList.add("bg-gray-700");
    });

    document.getElementById("table-view-btn").addEventListener("click", () => {
        tableView = true;
        document.getElementById("schedule-view").classList.add("hidden");
        document.getElementById("table-view").classList.remove("hidden");
        document.getElementById("table-view-btn").classList.add("bg-blue-600");
        document.getElementById("table-view-btn").classList.remove("bg-gray-700");
        document.getElementById("schedule-view-btn").classList.remove("bg-blue-600");
        document.getElementById("schedule-view-btn").classList.add("bg-gray-700");
        renderTableView();
    });

    // Table sorting
    document.querySelectorAll("#table-view th[data-column]").forEach(th => {
        th.addEventListener("click", () => {
            const column = th.getAttribute("data-column");
            toggleTableSort(column);
        });
    });

    // Table search
    document.getElementById("search-box").addEventListener("input", e => {
        searchState.query = e.target.value.toLowerCase();
        currentPage = 1;
        renderTableView();
    });

    document.getElementById("search-column").addEventListener("change", e => {
        searchState.column = e.target.value;
        currentPage = 1;
        renderTableView();
    });

    // Time filter
    document.getElementById("time-filter").addEventListener("change", () => {
        currentPage = 1;
        renderTableView();
    });
}

function renderTableView() {
    // Process bookings for table display
    const timeFilter = document.getElementById("time-filter").value;
    const now = new Date();

    let tableData = bookings.map(booking => {
        const plane = planes.find(p => p.id === booking.plane_id);
        const instructor = instructors.find(i => i.id === booking.instructor_id);

        // Get pilot name (primary student/pilot) - handle both students and instructors
        let pilotName = '';
        if (booking.pilot_id) {
            const studentPilot = students.find(s => s.id === booking.pilot_id);
            if (studentPilot) {
                pilotName = `${studentPilot.first_name} ${studentPilot.last_name}`;
            } else {
                const instructorPilot = instructors.find(i => i.id === booking.pilot_id);
                if (instructorPilot) {
                    pilotName = `${instructorPilot.first_name} ${instructorPilot.last_name}`;
                }
            }
        }

        const startTime = new Date(booking.start_time);
        const endTime = new Date(booking.end_time);
        const duration = (endTime - startTime) / (1000 * 60 * 60); // hours

        return {
            ...booking,
            plane_tail: plane?.tail_number || 'Unknown',
            instructor_name: instructor ? `${instructor.first_name} ${instructor.last_name}` : '-',
            pilot_name: pilotName,
            duration: duration.toFixed(1),
            start_date: startTime.toLocaleDateString(),
            start_time_display: startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            start_datetime: startTime
        };
    });

    // Apply showAllBookings filter first
    if (!showAllBookings) {
        tableData = tableData.filter(booking => booking.start_datetime > now);
    }

    // Apply time filter
    if (timeFilter === 'future') {
        tableData = tableData.filter(booking => booking.start_datetime > now);
    } else if (timeFilter === 'past') {
        tableData = tableData.filter(booking => booking.start_datetime <= now);
    }

    // Filter by search
    let filteredData = tableData.filter(booking => {
        if (!searchState.query) return true;
        const value = (booking[searchState.column] || "").toString().toLowerCase();
        return value.includes(searchState.query);
    });

    // Sort data
    if (sortState.direction !== "none") {
        filteredData.sort((a, b) => {
            let aVal = a[sortState.column];
            let bVal = b[sortState.column];

            // Handle date sorting
            if (sortState.column === 'start_time') {
                aVal = new Date(a.start_time).getTime();
                bVal = new Date(b.start_time).getTime();
            }

            if (aVal < bVal) return sortState.direction === "asc" ? -1 : 1;
            if (aVal > bVal) return sortState.direction === "asc" ? 1 : -1;
            return 0;
        });
    }

    // Pagination calculations
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const pageData = filteredData.slice(startIndex, endIndex);

    // Render table
    const tbody = document.getElementById("bookings-table");
    tbody.innerHTML = pageData.map((booking, index) => `
    <tr class="${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-700'} hover:bg-gray-600 cursor-pointer" data-booking-id="${booking.id}">
        <td class="p-2 border-b border-gray-600">
            <div class="font-medium">${booking.start_date}</div>
            <div class="text-sm text-gray-400">${booking.start_time_display}</div>
        </td>
        <td class="p-2 border-b border-gray-600">${booking.plane_tail}</td>
        <td class="p-2 border-b border-gray-600">${booking.pilot_name}</td>
        <td class="p-2 border-b border-gray-600">${booking.instructor_name}</td>
        <td class="p-2 border-b border-gray-600">${booking.duration}h</td>
        <td class="p-2 border-b border-gray-600 max-w-xs truncate" title="${booking.description || ''}">${booking.description || '-'}</td>
        <td class="p-2 border-b border-gray-600">
            <div class="flex justify-center space-x-2">
                <button class="text-blue-400 hover:text-blue-300 edit-booking" data-id="${booking.id}">Edit</button>
                <button class="text-red-400 hover:text-red-300 delete-booking" data-id="${booking.id}">Delete</button>
            </div>
        </td>
    </tr>
`).join('');

    // Add event listeners for actions
    tbody.querySelectorAll('.edit-booking').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const bookingId = btn.getAttribute('data-id');
            editBooking(bookingId);
        });
    });

    tbody.querySelectorAll('.delete-booking').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const bookingId = btn.getAttribute('data-id');
            deleteBooking(bookingId);
        });
    });

    // Row click handler
    tbody.addEventListener('click', (e) => {
        const row = e.target.closest('tr[data-booking-id]');
        if (row && !e.target.closest('.edit-booking') && !e.target.closest('.delete-booking')) {
            const now = Date.now();
            if (now - lastBookingClick < CLICK_DEBOUNCE_MS) {
                return;
            }

            const bookingId = row.getAttribute('data-booking-id');
            const booking = bookings.find(b => b.id === bookingId);
            if (booking) {
                openBookingDetails(booking);
            }
        }
    });

    updateTableSortArrows();
    renderTablePagination(totalPages);
}

function toggleTableSort(column) {
    if (sortState.column !== column) {
        sortState = { column, direction: "asc" };
    } else {
        if (sortState.direction === "asc") sortState.direction = "desc";
        else if (sortState.direction === "desc") sortState.direction = "none";
        else sortState.direction = "asc";
    }

    if (sortState.direction === "none") {
        sortState = { column: null, direction: "none" };
    }

    currentPage = 1;
    renderTableView();
}

function updateTableSortArrows() {
    document.querySelectorAll("#table-view th[data-column]").forEach(th => {
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

function renderTablePagination(totalPages) {
    const pagination = document.getElementById("table-pagination");
    let buttons = "";

    if (currentPage > 1) {
        buttons += `<button class="px-3 py-1 border border-gray-600 rounded bg-gray-700 text-white hover:bg-gray-600" data-page="${currentPage - 1}">Prev</button>`;
    }

    for (let i = 1; i <= totalPages; i++) {
        buttons += `<button class="px-3 py-1 border border-gray-600 rounded ${i === currentPage ? "bg-blue-500 text-white" : "bg-gray-700 text-white hover:bg-gray-600"}" data-page="${i}">${i}</button>`;
    }

    if (currentPage < totalPages) {
        buttons += `<button class="px-3 py-1 border border-gray-600 rounded bg-gray-700 text-white hover:bg-gray-600" data-page="${currentPage + 1}">Next</button>`;
    }

    pagination.innerHTML = buttons;

    pagination.querySelectorAll("button").forEach(btn => {
        btn.addEventListener("click", () => {
            currentPage = parseInt(btn.getAttribute("data-page"));
            renderTableView();
        });
    });
}

async function deleteBooking(bookingId) {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    // Get additional booking details for the modal
    const plane = planes.find(p => p.id === booking.plane_id);
    const instructor = instructors.find(i => i.id === booking.instructor_id);

    // Get pilot name
    let pilotName = '';
    if (booking.pilot_id) {
        const studentPilot = students.find(s => s.id === booking.pilot_id);
        if (studentPilot) {
            pilotName = `${studentPilot.first_name} ${studentPilot.last_name}`;
        } else {
            const instructorPilot = instructors.find(i => i.id === booking.pilot_id);
            if (instructorPilot) {
                pilotName = `${instructorPilot.first_name} ${instructorPilot.last_name}`;
            }
        }
    }

    const bookingWithDetails = {
        ...booking,
        plane_tail: plane?.tail_number || 'Unknown',
        instructor_name: instructor ? `${instructor.first_name} ${instructor.last_name}` : '-',
        pilot_name: pilotName
    };

    closeActiveModal();

    const modal = new BookingCancelModal({
        booking: bookingWithDetails,
        onConfirm: async (bookingToDelete) => {
            const { error } = await supabase
                .from('bookings')
                .delete()
                .eq('id', bookingToDelete.id);

            if (error) {
                showToast('Error deleting booking: ' + error.message, 'error');
            } else {
                showToast('Booking cancelled successfully!', 'success');
                await fetchData();
                if (tableView) {
                    renderTableView();
                } else {
                    renderSchedule();
                }
            }
        },
        onCancel: () => {
            console.log('Booking cancellation cancelled');
        }
    });

    activeModal = modal;
    modal.render();
}

function setupSearchFunctionality() {
    const searchInput = document.getElementById("search-input");
    const suggestionsBox = document.getElementById("search-suggestions");

    suggestionsBox.addEventListener("click", (e) => {
        const li = e.target.closest("li[data-label]");
        if (!li) return;
        searchInput.value = li.getAttribute("data-label");
        searchQuery = li.getAttribute("data-label");
        currentSearchType = li.getAttribute("data-type");
        suggestionsBox.classList.add("hidden");
        renderSchedule();
    });

    searchInput.addEventListener("input", (e) => {
        const query = e.target.value.trim().toLowerCase();
        if (!query) {
            searchQuery = "";
            suggestionsBox.innerHTML = "";
            suggestionsBox.classList.add("hidden");
            renderSchedule();
            return;
        }

        let suggestions = [];

        // Search planes
        planes.forEach(p => {
            if (p.tail_number && p.tail_number.toLowerCase().includes(query)) {
                suggestions.push({ type: "Plane", label: p.tail_number });
            }
        });

        // Search students
        students.forEach(s => {
            const fullName = `${s.first_name} ${s.last_name}`;
            if (fullName.toLowerCase().includes(query)) {
                suggestions.push({ type: "Person", label: fullName });
            }
        });

        // Search instructors
        instructors.forEach(i => {
            const fullName = `${i.first_name} ${i.last_name}`;
            if (fullName.toLowerCase().includes(query)) {
                suggestions.push({ type: "Instructor", label: fullName });
            }
        });

        if (suggestions.length > 0) {
            suggestionsBox.innerHTML = suggestions.map(s =>
                `<li class="p-2 hover:bg-gray-700 cursor-pointer" data-type="${s.type}" data-label="${s.label}">${s.type} – ${s.label}</li>`
            ).join("");
            suggestionsBox.classList.remove("hidden");
        } else {
            suggestionsBox.innerHTML = `<li class="p-2 text-gray-400">No matches</li>`;
            suggestionsBox.classList.remove("hidden");
        }
    });

    // Close suggestions when clicking outside
    document.addEventListener("click", (e) => {
        if (!searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
            suggestionsBox.classList.add("hidden");
        }
    });
}

function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseDateFromInput(dateString) {
    if (!dateString) return null;

    // Split the YYYY-MM-DD format and create date in local timezone
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0); // Normalize to start of day
    return date;
}

function setupDateNavigation() {
    document.getElementById("prev-date").addEventListener("click", () => {
        currentDate.setDate(currentDate.getDate() - (searchQuery ? 7 : 1));
        updateDateInputValue();
        renderSchedule();
    });

    document.getElementById("next-date").addEventListener("click", () => {
        currentDate.setDate(currentDate.getDate() + (searchQuery ? 7 : 1));
        updateDateInputValue();
        renderSchedule();
    });

    // Initialize the date picker on the input and set today's date
    const dateInput = document.getElementById("current-date");

    // Set today's date as the initial value
    updateDateInputValue();

    // Store the picker instance globally so we can access it later
    datePickerInstance = new CustomDatePicker(dateInput);

    // Handle date changes from the picker
    const originalSelectDate = datePickerInstance.selectDate?.bind(datePickerInstance);
    if (originalSelectDate) {
        datePickerInstance.selectDate = (dateString) => {
            originalSelectDate(dateString);

            // Parse the selected date
            const selectedDate = parseDateFromInput(dateString);
            if (!isNaN(selectedDate.getTime())) {
                currentDate = selectedDate;
                renderSchedule();
            }
        };
    }
}

function updateDateInputValue() {
    const dateInput = document.getElementById("current-date");
    if (dateInput) {
        const dateString = formatDateForInput(currentDate);
        dateInput.value = dateString;

        // Also update the custom date picker if it exists
        if (datePickerInstance) {
            datePickerInstance.setValue(dateString);
        }
    }
}

function setupPagination() {
    document.getElementById("prev-page").addEventListener("click", () => {
        if (currentPlanePage > 0) {
            currentPlanePage--;
            renderSchedule();
        }
    });

    document.getElementById("next-page").addEventListener("click", () => {
        if ((currentPlanePage + 1) * PLANES_PER_PAGE < planes.length) {
            currentPlanePage++;
            renderSchedule();
        }
    });
}

function renderSchedule() {
    const scheduleContainer = document.getElementById("schedule-container");
    if (!scheduleContainer) return;
    scheduleContainer.innerHTML = "";

    const titleEl = document.getElementById("schedule-title");
    const pagination = document.getElementById("pagination-controls");

    if (searchQuery) {
        renderWeeklySchedule(scheduleContainer);
        pagination.classList.add("hidden");
        titleEl.textContent = currentSearchType === "Plane" ? `Plane ${searchQuery} –` :
            currentSearchType === "Instructor" ? `Instructor ${searchQuery} –` :
                `${searchQuery} –`;
    } else {
        renderDailySchedule(scheduleContainer);
        pagination.classList.remove("hidden");
        titleEl.textContent = "General Schedule –";
    }

    // Update the date input value and custom date picker
    updateDateInputValue();
}

function renderDailySchedule(container) {
    let html = `
        <table class="min-w-full border-collapse relative">
            <thead>
                <tr>
                    <th class="border border-gray-700 p-2">Plane</th>
                    ${hours.map(h => `<th class="border border-gray-700 p-2">${h}:00</th>`).join("")}
                </tr>
            </thead>
            <tbody>
    `;

    const planesToShow = planes.slice(currentPlanePage * PLANES_PER_PAGE, (currentPlanePage + 1) * PLANES_PER_PAGE);
    planesToShow.forEach(plane => {
        html += `<tr class="border border-gray-700" style="height:55px;">
            <td class="border border-gray-700 p-2">${plane.tail_number}</td>`;
        hours.forEach(() => {
            html += `<td class="relative border border-gray-700"></td>`;
        });
        html += `</tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;

    document.getElementById("page-indicator").textContent =
        `Page ${currentPlanePage + 1} of ${Math.ceil(planes.length / PLANES_PER_PAGE)}`;

    const dayStart = new Date(currentDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(currentDate);
    dayEnd.setHours(23, 59, 59, 999);

    let dailyBookings = bookings.filter(b =>
        new Date(b.start_time) >= dayStart && new Date(b.start_time) <= dayEnd
    );

    // Apply showAllBookings filter
    if (!showAllBookings) {
        const now = new Date();
        dailyBookings = dailyBookings.filter(b => new Date(b.start_time) > now);
    }

    dailyBookings.forEach(b => placeBookingBox(b));

    // Improved current time indicator
    renderCurrentTimeIndicator(container);
}

function renderCurrentTimeIndicator(container) {
    const now = getAeroclubTime();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if we're viewing today (using local date for comparison)
    const viewingDate = new Date(currentDate);
    viewingDate.setHours(0, 0, 0, 0);

    if (viewingDate.getTime() === today.getTime()) {
        const timeDiff = now.getTime() - today.getTime();
        const hoursSinceMidnight = timeDiff / (1000 * 60 * 60);

        if (hoursSinceMidnight >= 6 && hoursSinceMidnight <= 23) {
            const table = container.querySelector('table');
            const firstRow = table.querySelector('tbody tr');
            const firstCell = firstRow.querySelector('td');

            if (firstCell) {
                const cellRect = firstCell.getBoundingClientRect();
                const tableRect = table.getBoundingClientRect();

                const indicator = document.createElement('div');
                indicator.className = 'current-time-indicator';
                indicator.style.cssText = `
                    position: absolute;
                    top: ${cellRect.height}px;
                    left: ${((hoursSinceMidnight - 6) / 17) * 100}%;
                    width: 2px;
                    height: calc(100% - ${cellRect.height}px);
                    background: #ef4444;
                    z-index: 10;
                    pointer-events: none;
                `;

                // Add a circle at the top
                const circle = document.createElement('div');
                circle.style.cssText = `
                    position: absolute;
                    top: -3px;
                    left: -3px;
                    width: 8px;
                    height: 8px;
                    background: #ef4444;
                    border-radius: 50%;
                `;
                indicator.appendChild(circle);

                container.style.position = 'relative';
                container.appendChild(indicator);
            }
        }
    }
}

function getAeroclubTime() {
    return new Date();
}

function renderWeeklySchedule(container) {
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay());

    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + i);
        return day;
    });

    let html = `
        <table class="min-w-full border-collapse">
            <thead>
                <tr>
                    <th class="border border-gray-700 p-2">Plane</th>
                    ${weekDays.map(day => `<th class="border border-gray-700 p-2">${day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</th>`).join("")}
                </tr>
            </thead>
            <tbody>
    `;

    const filteredPlanes = planes.filter(p => {
        if (currentSearchType === "Plane") {
            return p.tail_number === searchQuery;
        }
        return true;
    });

    filteredPlanes.forEach(plane => {
        html += `<tr class="border border-gray-700" style="height:55px;">
            <td class="border border-gray-700 p-2">${plane.tail_number}</td>`;
        weekDays.forEach(() => {
            html += `<td class="relative border border-gray-700"></td>`;
        });
        html += `</tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;

    const weekStartTime = new Date(weekStart);
    weekStartTime.setHours(0, 0, 0, 0);
    const weekEndTime = new Date(weekStart);
    weekEndTime.setDate(weekStart.getDate() + 7);
    weekEndTime.setHours(23, 59, 59, 999);

    let weeklyBookings = bookings.filter(b => {
        const startTime = new Date(b.start_time);
        return startTime >= weekStartTime && startTime <= weekEndTime;
    });

    // Apply showAllBookings filter
    if (!showAllBookings) {
        const now = new Date();
        weeklyBookings = weeklyBookings.filter(b => new Date(b.start_time) > now);
    }

    // Filter by search criteria
    if (currentSearchType === "Plane") {
        weeklyBookings = weeklyBookings.filter(b => {
            const plane = planes.find(p => p.id === b.plane_id);
            return plane && plane.tail_number === searchQuery;
        });
    } else if (currentSearchType === "Person") {
        weeklyBookings = weeklyBookings.filter(b => {
            const student = students.find(s => s.id === b.pilot_id);
            return student && `${student.first_name} ${student.last_name}` === searchQuery;
        });
    } else if (currentSearchType === "Instructor") {
        weeklyBookings = weeklyBookings.filter(b => {
            const instructor = instructors.find(i => i.id === b.instructor_id);
            const instructorFullName = instructor ? `${instructor.first_name} ${instructor.last_name}` : '';
            return instructor && instructorFullName === searchQuery;
        });
    }

    weeklyBookings.forEach(b => placeBookingBox(b, true));
}

function placeBookingBox(booking, isWeekly = false) {
    const plane = planes.find(p => p.id === booking.plane_id);
    if (!plane) return;

    const planeIndex = planes.findIndex(p => p.id === booking.plane_id);
    const displayPlaneIndex = isWeekly ?
        planes.filter(p => {
            if (currentSearchType === "Plane") return p.tail_number === searchQuery;
            return true;
        }).findIndex(p => p.id === booking.plane_id) :
        planeIndex - currentPlanePage * PLANES_PER_PAGE;

    if (displayPlaneIndex < 0) return;

    const startTime = new Date(booking.start_time);
    const endTime = new Date(booking.end_time);

    let columnIndex, startHour, duration;

    if (isWeekly) {
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - currentDate.getDay());
        weekStart.setHours(0, 0, 0, 0);

        columnIndex = Math.floor((startTime - weekStart) / (1000 * 60 * 60 * 24));
        startHour = startTime.getHours() + startTime.getMinutes() / 60;
        duration = (endTime - startTime) / (1000 * 60 * 60);
    } else {
        const dayStart = new Date(currentDate);
        dayStart.setHours(0, 0, 0, 0);

        columnIndex = Math.floor((startTime - dayStart) / (1000 * 60 * 60 * 24));
        startHour = startTime.getHours() + startTime.getMinutes() / 60;
        duration = (endTime - startTime) / (1000 * 60 * 60);
    }

    if (columnIndex < 0 || columnIndex >= (isWeekly ? 7 : 1)) return;

    const table = document.querySelector("#schedule-container table");
    if (!table) return;

    const rows = table.querySelectorAll("tbody tr");
    if (displayPlaneIndex >= rows.length) return;

    const targetRow = rows[displayPlaneIndex];
    const cells = targetRow.querySelectorAll("td");
    const targetCell = cells[columnIndex + 1]; // +1 for plane name column

    if (!targetCell) return;

    const cellRect = targetCell.getBoundingClientRect();
    const tableRect = table.getBoundingClientRect();

    const left = ((startHour - 6) / 17) * 100;
    const width = (duration / 17) * 100;

    if (left + width > 100 || left < 0) return;

    const bookingBox = document.createElement("div");
    bookingBox.className = "booking-box absolute top-0 h-full p-1 text-xs cursor-pointer overflow-hidden";
    bookingBox.style.cssText = `
        left: ${left}%;
        width: ${width}%;
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        border: 1px solid #1e40af;
        border-radius: 4px;
        color: white;
        z-index: 5;
        min-width: ${Math.max(width, 5)}%;
    `;

    const student = students.find(s => s.id === booking.pilot_id);
    const instructor = instructors.find(i => i.id === booking.instructor_id);

    const startTimeStr = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const endTimeStr = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    bookingBox.innerHTML = `
        <div class="font-semibold truncate">${student ? `${student.first_name} ${student.last_name}` : 'Unknown'}</div>
        <div class="text-xs opacity-90 truncate">${startTimeStr} - ${endTimeStr}</div>
        ${instructor ? `<div class="text-xs opacity-75 truncate">w/ ${instructor.first_name} ${instructor.last_name}</div>` : ''}
    `;

    bookingBox.addEventListener("click", (e) => {
        e.stopPropagation();
        const now = Date.now();
        if (now - lastBookingClick < CLICK_DEBOUNCE_MS) {
            return;
        }
        lastBookingClick = now;
        openBookingDetails(booking);
    });

    targetCell.style.position = "relative";
    targetCell.appendChild(bookingBox);
}

function attachScheduleEvents() {
    document.getElementById("create-booking-btn").addEventListener("click", () => {
        createBooking();
    });
}

function createBooking() {
    closeActiveModal();

    const modal = new AddBookingModal({
        planes,
        students,
        instructors,
        onSave: async (newBooking) => {
            const { data, error } = await supabase
                .from('bookings')
                .insert([newBooking])
                .select();

            if (error) {
                showToast('Error creating booking: ' + error.message, 'error');
            } else {
                showToast('Booking created successfully!', 'success');
                await fetchData();
                if (tableView) {
                    renderTableView();
                } else {
                    renderSchedule();
                }
            }
        }
    });

    activeModal = modal;
    modal.render();
}

function editBooking(bookingId) {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    closeActiveModal();

    const modal = new EditBookingModal({
        booking,
        planes,
        students,
        instructors,
        onSave: async (updatedBooking) => {
            const { error } = await supabase
                .from('bookings')
                .update(updatedBooking)
                .eq('id', booking.id);

            if (error) {
                showToast('Error updating booking: ' + error.message, 'error');
            } else {
                showToast('Booking updated successfully!', 'success');
                await fetchData();
                if (tableView) {
                    renderTableView();
                } else {
                    renderSchedule();
                }
            }
        }
    });

    activeModal = modal;
    modal.render();
}

function openBookingDetails(booking) {
    closeActiveModal();

    const modal = new BookingDetailsModal({
        booking,
        planes,
        students,
        instructors,
        onEdit: () => {
            modal.close();
            editBooking(booking.id);
        },
        onDelete: () => {
            modal.close();
            deleteBooking(booking.id);
        }
    });

    activeModal = modal;
    modal.render();
}

function closeActiveModal() {
    if (activeModal) {
        activeModal.close();
        activeModal = null;
    }
}

export async function cleanupSchedulePage() {
    console.log('Cleaning up schedule page...');

    // Clear any modal cleanup timeouts
    if (modalCleanupTimeout) {
        clearTimeout(modalCleanupTimeout);
        modalCleanupTimeout = null;
    }

    // Remove global event listeners
    window.removeEventListener('beforeunload', cleanupSchedulePage);

    // Close active modal
    closeActiveModal();

    // Clear global variables
    currentDate = new Date();
    searchQuery = "";
    bookings = [];
    planes = [];
    students = [];
    instructors = [];
    currentSearchType = "";
    currentPlanePage = 0;
    tableView = false;
    sortState = { column: null, direction: "none" };
    searchState = { column: "pilot_name", query: "" };
    currentPage = 1;
    activeModal = null;
    datePickerInstance = null;
    showAllBookings = false;

    console.log('Schedule page cleanup complete');
}