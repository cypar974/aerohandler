// ./js/pages/bookings.js
import { supabase } from "../supabase.js";
import { AddBookingModal } from "../modals/AddBookingModal.js";
import { EditBookingModal } from "../modals/EditBookingModal.js";
import { BookingDetailsModal } from "../modals/BookingDetailsModal.js";
import { showToast } from "../components/showToast.js";
import { CustomDatePicker } from "../components/customDatePicker.js";
import { BookingCancelModal } from "../modals/BookingCancelModal.js";
import { CustomWeekPicker } from "../components/customWeekPicker.js";
import { Autocomplete } from "../components/autocomplete.js";
import { getMembers } from "../utils/memberData.js";

let currentDate = new Date();
let searchQuery = "";

// Data Store
let bookings = [];
let planes = [];
let students = [];
let instructors = [];
let allMembers = [];
let allUsers = [];
let userIdToPersonMap = {};

let currentSearchType = "";
let currentPlanePage = 0;
const PLANES_PER_PAGE = 8;
let searchAutocomplete = null;
let autocompleteData = [];

const calendarStyles = `<style>
.daily-grid-container,
.weekly-grid-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #1f2937;
    border-radius: 8px;
    overflow: auto;
}


.grid-header {
    background: #374151;
    border-bottom: 1px solid #4b5563;
    z-index: 10;
    position: sticky;
    top: 0;
}

.time-axis {
    display: flex;
    height: 40px;
}

.time-slot {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
    color: #d1d5db;
    flex-shrink: 0;
}


.grid-body {
    flex: 1;
    overflow: auto;
    position: relative;
}

.plane-row {
    display: flex;
    height: 60px;
    border-bottom: 1px solid #4b5563;
    position: relative;
}

.plane-label {
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    color: #e5e7eb;
    background: #374151;
    border-right: 1px solid #4b5563;
    position: sticky;
    left: 0;
    z-index: 5;
    flex-shrink: 0;
}

.time-slots {
    position: relative;
    flex-shrink: 0;
}

.time-grid {
    height: 100%;
    position: relative;
}


.time-grid::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: 
        repeating-linear-gradient(
            to right,
            transparent,
            transparent calc(var(--hour-width, 80px) - 1px),
            #4b5563 calc(var(--hour-width, 80px) - 1px),
            #4b5563 var(--hour-width, 80px)
        );
    pointer-events: none;
    z-index: 1;
}


.weekly-grid-container .time-grid::before {
    
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: 
        repeating-linear-gradient(
            to right,
            transparent,
            transparent calc(var(--hour-width, 80px) - 1px),
            #4b5563 calc(var(--hour-width, 80px) - 1px),
            #4b5563 var(--hour-width, 80px)
        );
    pointer-events: none;
    z-index: 1;
}


.weekly-grid-container .plane-row {
    border-bottom: 1px solid #4b5563;
}

.weekly-grid-container .grid-body,
.weekly-grid-container .grid-body::before {
    background: none !important;
    background-image: none !important;
    border: none !important;
    box-shadow: none !important;
    outline: none !important;
}


.booking-slot {
    position: absolute;
    background: #3b82f6;
    border-radius: 4px;
    cursor: pointer;
    z-index: 2;
    overflow: hidden;
    transition: all 0.2s ease;
    border: 1px solid #2563eb;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.booking-slot:hover {
    background: #2563eb;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
}

.daily-booking {
    top: 4px;
    bottom: 4px;
    min-width: 20px;
}

.weekly-booking {
    min-height: 20px;
}

.booking-content {
    padding: 4px 6px;
    color: white;
    font-size: 11px;
    line-height: 1.2;
    overflow: hidden;
}

.booking-pilot {
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.booking-instructor,
.booking-plane {
    font-size: 10px;
    opacity: 0.9;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}


.current-time-line {
    position: absolute;
    top: 40px;
    bottom: 0;
    width: 2px;
    background: #ef4444;
    z-index: 15;
    pointer-events: none;
}

.current-time-dot {
    position: absolute;
    top: -4px;
    left: -3px;
    width: 8px;
    height: 8px;
    background: #ef4444;
    border-radius: 50%;
}


.grid-body::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

.grid-body::-webkit-scrollbar-track {
    background: #374151;
}

.grid-body::-webkit-scrollbar-thumb {
    background: #6b7280;
    border-radius: 4px;
}

.grid-body::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
}
</style>`;

let datePickerInstance = null;
const hours = Array.from({ length: 17 }, (_, i) => 6 + i);
let lastBookingClick = 0;
const CLICK_DEBOUNCE_MS = 500;

// Table view states
let tableView = false;
let sortState = { column: null, direction: "none" };
let searchState = { column: "pilot_name", query: "" };
let currentPage = 1;
const rowsPerPage = 9;

// Modal management
let activeModal = null;
let modalCleanupTimeout = null;

// Helper to bridge User ID (Auth) -> Person ID (Data)
function getPersonByUserId(userId) {
    if (!userId) return null;
    return userIdToPersonMap[userId] || null;
}

export async function loadBookingsPage() {
    console.log('Loading bookings page...');
    lastBookingClick = 0;

    await cleanupBookingsPage();

    searchQuery = "";
    currentSearchType = "";
    currentPlanePage = 0;
    currentDate = new Date();
    tableView = false;

    if (!document.querySelector('#bookings-calendar-styles')) {
        const styleElement = document.createElement('div');
        styleElement.id = 'bookings-calendar-styles';
        styleElement.innerHTML = calendarStyles;
        document.head.appendChild(styleElement.firstElementChild);
    }

    document.getElementById("main-content").innerHTML = `
        <div class="flex flex-col h-full text-white relative">
            <div class="flex justify-between items-center mb-6">
                <div class="flex space-x-2">
                    <button id="schedule-view-btn" class="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors duration-200 font-medium">Schedule View</button>
                    <button id="table-view-btn" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors duration-200 font-medium">Table View</button>
                </div>
                <h1 class="text-2xl font-bold text-white absolute left-1/2 transform -translate-x-1/2">Bookings</h1>
                <button id="create-booking-btn" class="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-500 transition-colors duration-200 font-medium flex items-center space-x-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                    <span>New Booking</span>
                </button>
            </div>

            <div id="schedule-view" class="flex flex-col h-full">
                <div class="flex justify-between items-center mb-4 relative">
                    <div class="w-1/3 relative">
                        <div class="relative">
                            <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                            <input id="search-input" type="text" placeholder="Search by plane, person, or instructor..."
                                class="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200">
                        </div>
                        </div>
                </div>

                <div class="flex justify-center items-center mb-6 space-x-4">
                    <button id="prev-date" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors duration-200 flex items-center space-x-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                        </svg>
                        <span>${searchQuery ? 'Prev Week' : 'Prev Day'}</span>
                    </button>
                    <h2 class="text-xl font-bold flex items-center space-x-2 whitespace-nowrap">
                        <span id="schedule-title"></span>
                        <input type="text" id="current-date" class="cursor-pointer bg-gray-800 px-2 py-1 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[120px] max-w-[300px] text-lg !important" 
                            placeholder="${searchQuery ? 'Select week' : 'Select date'}" readonly>
                    </h2>
                    <button id="this-week-btn" class="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors duration-200 font-medium hidden">
                        This Week
                    </button>
                    <button id="today-btn" class="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors duration-200 font-medium ${searchQuery ? 'hidden' : ''}">
                        Today
                    </button>
                    <button id="next-date" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors duration-200 flex items-center space-x-1">
                        <span>${searchQuery ? 'Next Week' : 'Next Day'}</span>
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                    </button>
                </div>

                <div id="schedule-container" class="flex-1 overflow-x-auto border border-gray-700 rounded-lg bg-gray-900 shadow-lg"></div>

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
    `;

    attachScheduleEvents();
    setupTableViewEvents();
    setupSearchFunctionality();
    setupDateNavigation();
    setupPagination();

    await fetchData();
    renderSchedule();
    renderTableView();

    window.addEventListener('beforeunload', cleanupBookingsPage);
}

async function fetchData() {
    try {

        const { data: planesData, error: planesError } = await supabase.schema('api').rpc('get_planes');
        if (planesError) throw planesError;
        planes = planesData || [];


        const { data: bookingsData, error: bookingsError } = await supabase.schema('api').rpc('get_bookings');
        if (bookingsError) throw bookingsError;
        bookings = bookingsData || [];


        const { data: membersData, error: membersError } = await getMembers();
        if (membersError) throw membersError;
        allMembers = membersData || [];



        const roles = ['student', 'instructor', 'regular_pilot', 'maintenance_technician', 'other_person'];
        const userPromises = roles.map(role =>
            supabase.schema('api').rpc('get_users_by_role', { user_role: role })
        );

        const userResults = await Promise.all(userPromises);


        allUsers = userResults.flatMap(r => r.data || []);


        userIdToPersonMap = {};
        allUsers.forEach(user => {
            const person = allMembers.find(m => m.id === user.person_id);
            if (person) {
                userIdToPersonMap[user.id] = person;
            }
        });


        students = allMembers.filter(m => m.type === 'student');
        instructors = allMembers.filter(m => m.type === 'instructor');


        updateSearchAutocompleteData();

    } catch (error) {
        console.error('Error fetching data:', error);
        showToast('Error loading data: ' + error.message, 'error');
    }
}

function updateSearchAutocompleteData() {
    if (!searchAutocomplete) return;


    autocompleteData = [];


    planes.forEach(p => {
        if (p.tail_number) {
            autocompleteData.push({
                id: p.id,
                label: p.tail_number,
                type: null,
                searchType: "Plane"
            });
        }
    });


    students.forEach(s => {
        autocompleteData.push({
            id: s.id,
            label: `${s.first_name} ${s.last_name}`,
            type: s.type,
            searchType: "Person"
        });
    });


    instructors.forEach(i => {
        autocompleteData.push({
            id: i.id,
            label: `${i.first_name} ${i.last_name}`,
            type: i.type,
            searchType: "Instructor"
        });
    });


    searchAutocomplete.updateData(autocompleteData);
}

function setupTableViewEvents() {

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


    document.querySelectorAll("#table-view th[data-column]").forEach(th => {
        th.addEventListener("click", () => {
            const column = th.getAttribute("data-column");
            toggleTableSort(column);
        });
    });


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


    document.getElementById("time-filter").addEventListener("change", () => {
        currentPage = 1;
        renderTableView();
    });
}

function renderTableView() {

    const canEdit = true;


    const timeFilter = document.getElementById("time-filter").value;
    const now = new Date();

    let tableData = bookings.map(booking => {
        const plane = planes.find(p => p.id === booking.plane_id);


        const instructor = getPersonByUserId(booking.instructor_id);



        const pilot = getPersonByUserId(booking.pilot_id);
        const pilotName = pilot ? `${pilot.first_name} ${pilot.last_name}` : 'Unknown';

        const startTime = new Date(booking.start_time);
        const endTime = new Date(booking.end_time);
        const duration = (endTime - startTime) / (1000 * 60 * 60);

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


    if (timeFilter === 'future') {
        tableData = tableData.filter(booking => booking.start_datetime > now);
    } else if (timeFilter === 'past') {
        tableData = tableData.filter(booking => booking.start_datetime <= now);
    }


    let filteredData = tableData.filter(booking => {
        if (!searchState.query) return true;
        const value = (booking[searchState.column] || "").toString().toLowerCase();
        return value.includes(searchState.query);
    });


    if (sortState.direction !== "none") {
        filteredData.sort((a, b) => {
            let aVal = a[sortState.column];
            let bVal = b[sortState.column];


            if (sortState.column === 'start_time') {
                aVal = new Date(a.start_time).getTime();
                bVal = new Date(b.start_time).getTime();
            }

            if (aVal < bVal) return sortState.direction === "asc" ? -1 : 1;
            if (aVal > bVal) return sortState.direction === "asc" ? 1 : -1;
            return 0;
        });
    }


    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const pageData = filteredData.slice(startIndex, endIndex);


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
                ${canEdit ? `
                <button class="text-blue-400 hover:text-blue-300 edit-booking" data-id="${booking.id}">Edit</button>
                <button class="text-red-400 hover:text-red-300 delete-booking" data-id="${booking.id}">Delete</button>
                ` : ''}
            </div>
        </td>
    </tr>
`).join('');


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

    tbody.addEventListener('click', (e) => {
        const row = e.target.closest('tr[data-booking-id]');
        if (row && !e.target.closest('.edit-booking') && !e.target.closest('.delete-booking')) {
            const now = Date.now();
            if (now - lastBookingClick < CLICK_DEBOUNCE_MS) return;

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


    const plane = planes.find(p => p.id === booking.plane_id);
    const instructor = getPersonByUserId(booking.instructor_id);
    const pilot = getPersonByUserId(booking.pilot_id);

    const pilotName = pilot ? `${pilot.first_name} ${pilot.last_name}` : 'Unknown';

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

            const { error } = await supabase.schema('api').rpc('delete_booking', {
                booking_uuid: bookingToDelete.id
            });

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


    searchAutocomplete = new Autocomplete({
        inputElement: searchInput,
        dataSource: [],
        displayField: 'label',
        valueField: 'id',
        placeholder: 'Search by plane, person, or instructor...',

        onSelect: (selection) => {


            const item = selection.rawItem;

            if (item) {
                searchQuery = item.label;
                currentSearchType = item.searchType;
                renderSchedule();
            }
        },

        onInput: (value) => {

            if (!value || !value.trim()) {
                searchQuery = "";
                currentSearchType = "";
                renderSchedule();
            }
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
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    return date;
}

function setupDateNavigation() {
    document.getElementById("prev-date").addEventListener("click", () => {
        if (searchQuery) {
            currentDate.setDate(currentDate.getDate() - 7);
        } else {
            currentDate.setDate(currentDate.getDate() - 1);
        }
        updateDateInputValue();
        updateNavigationButtons();
        renderSchedule();
    });

    document.getElementById("next-date").addEventListener("click", () => {
        if (searchQuery) {
            currentDate.setDate(currentDate.getDate() + 7);
        } else {
            currentDate.setDate(currentDate.getDate() + 1);
        }
        updateDateInputValue();
        updateNavigationButtons();
        renderSchedule();
    });

    document.getElementById("today-btn").addEventListener("click", () => {
        currentDate = new Date();
        updateDateInputValue();
        updateNavigationButtons();
        renderSchedule();
    });

    document.getElementById("this-week-btn").addEventListener("click", () => {
        currentDate = getMonday(new Date());
        updateDateInputValue();
        updateNavigationButtons();
        renderSchedule();
    });


    const dateInput = document.getElementById("current-date");
    updateDateInputValue();
    updateNavigationButtons();

    if (searchQuery) {
        datePickerInstance = new CustomWeekPicker(dateInput);
    } else {
        datePickerInstance = new CustomDatePicker(dateInput);
    }

    const originalSelectDate = datePickerInstance.selectDate?.bind(datePickerInstance);
    if (originalSelectDate) {
        datePickerInstance.selectDate = (dateString) => {
            originalSelectDate(dateString);
            const selectedDate = parseDateFromInput(dateString);
            if (!isNaN(selectedDate.getTime())) {
                currentDate = selectedDate;
                updateNavigationButtons();
                renderSchedule();
            }
        };
    }
}

function updateNavigationButtons() {
    const prevButton = document.getElementById("prev-date");
    const nextButton = document.getElementById("next-date");
    const todayButton = document.getElementById("today-btn");
    const thisWeekButton = document.getElementById("this-week-btn");

    if (prevButton && nextButton && todayButton && thisWeekButton) {
        if (searchQuery) {
            todayButton.classList.add("hidden");
            thisWeekButton.classList.remove("hidden");

            const currentWeekStart = getMonday(new Date());
            const viewingWeekStart = getMonday(currentDate);
            const isThisWeek = currentWeekStart.getTime() === viewingWeekStart.getTime();

            if (isThisWeek) {
                thisWeekButton.classList.add("bg-blue-500", "cursor-not-allowed");
                thisWeekButton.classList.remove("bg-blue-600", "hover:bg-blue-500");
            } else {
                thisWeekButton.classList.remove("bg-blue-500", "cursor-not-allowed");
                thisWeekButton.classList.add("bg-blue-600", "hover:bg-blue-500");
            }

            prevButton.innerHTML = `
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                </svg>
                <span>Prev Week</span>
            `;
            nextButton.innerHTML = `
                <span>Next Week</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
            `;
        } else {
            todayButton.classList.remove("hidden");
            thisWeekButton.classList.add("hidden");

            const today = new Date();
            const isToday = currentDate.toDateString() === today.toDateString();
            if (isToday) {
                todayButton.classList.add("bg-blue-500", "cursor-not-allowed");
                todayButton.classList.remove("bg-blue-600", "hover:bg-blue-500");
            } else {
                todayButton.classList.remove("bg-blue-500", "cursor-not-allowed");
                todayButton.classList.add("bg-blue-600", "hover:bg-blue-500");
            }

            prevButton.innerHTML = `
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                </svg>
                <span>Prev Day</span>
            `;
            nextButton.innerHTML = `
                <span>Next Day</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
            `;
        }
    }
}

function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function getWeekRange(date) {
    const monday = getMonday(date);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const options = { month: 'short', day: 'numeric' };

    if (monday.getFullYear() === sunday.getFullYear()) {
        return `${monday.toLocaleDateString('en-US', options)} - ${sunday.toLocaleDateString('en-US', options)}, ${monday.getFullYear()}`;
    } else {
        return `${monday.toLocaleDateString('en-US', options)}, ${monday.getFullYear()} - ${sunday.toLocaleDateString('en-US', options)}, ${sunday.getFullYear()}`;
    }
}

function updateDateInputValue() {
    const dateInput = document.getElementById("current-date");
    if (dateInput) {
        if (searchQuery) {
            const weekRange = getWeekRange(currentDate);
            dateInput.value = weekRange;
            dateInput.placeholder = "Select week";
        } else {
            const dateString = formatDateForInput(currentDate);
            dateInput.value = dateString;
            dateInput.placeholder = "Select date";
        }

        if (datePickerInstance && datePickerInstance.setValue) {
            if (searchQuery) {
                const monday = getMonday(currentDate);
                datePickerInstance.setValue(formatDateForInput(monday));
            } else {
                datePickerInstance.setValue(dateInput.value);
            }
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

function getAeroclubTime() {
    return new Date();
}

export async function cleanupBookingsPage() {
    console.log('Cleaning up bookings page...');

    if (datePickerInstance) {
        datePickerInstance.destroy();
        datePickerInstance = null;
    }


    if (searchAutocomplete) {
        searchAutocomplete.destroy();
        searchAutocomplete = null;
    }

    BookingDetailsModal.cleanupAll();

    if (activeModal) {
        closeActiveModal();
    }

    if (window.currentTimeInterval) {
        clearInterval(window.currentTimeInterval);
        window.currentTimeInterval = null;
    }

    if (modalCleanupTimeout) {
        clearTimeout(modalCleanupTimeout);
        modalCleanupTimeout = null;
    }

    if (window.bookingModalTimeout) {
        clearTimeout(window.bookingModalTimeout);
        window.bookingModalTimeout = null;
    }

    const mainContent = document.getElementById("main-content");
    if (mainContent) {
        mainContent.innerHTML = "";
    }

    window.removeEventListener('beforeunload', cleanupBookingsPage);
}

function attachScheduleEvents() {
    document.getElementById("create-booking-btn").addEventListener("click", () => {
        openAddBookingModal();
    });
}

function closeActiveModal() {
    console.log('❌ closeActiveModal called, activeModal:', activeModal);

    if (window.isClosingModal) return;
    window.isClosingModal = true;

    if (activeModal && activeModal instanceof AddBookingModal && !activeModal.isOpen) {
        window.isClosingModal = false;
        return;
    }

    BookingDetailsModal.cleanupAll();

    if (activeModal) {
        const modalToClose = activeModal;
        activeModal = null;

        if (typeof modalToClose.close === 'function') {
            modalToClose.close();
        } else if (typeof modalToClose.hide === 'function') {
            modalToClose.hide();
        } else if (typeof modalToClose.destroy === 'function') {
            modalToClose.destroy();
        }
    }

    if (window.bookingModalTimeout) {
        clearTimeout(window.bookingModalTimeout);
        window.bookingModalTimeout = null;
    }

    setTimeout(() => {
        window.isClosingModal = false;
    }, 100);
}

function openAddBookingModal() {
    console.log('➕ openAddBookingModal called');
    closeActiveModal();
    setTimeout(() => {
        createAddBookingModal();
    }, 300);
}

function createAddBookingModal() {
    console.log('🛠️ Creating FRESH AddBookingModal instance...');
    const modal = new AddBookingModal();

    modal.onSuccess(async (newBooking) => {
        console.log('✅ Booking created successfully:', newBooking);
        showToast('Booking created successfully!', 'success');
        await fetchData();
        if (tableView) {
            renderTableView();
        } else {
            renderSchedule();
        }
        closeActiveModal();
    });

    modal.onClose(() => {
        console.log('📝 AddBookingModal closed');
        closeActiveModal();
    });

    activeModal = modal;

    modal.show().catch(error => {
        console.error('Failed to show AddBookingModal:', error);
        showToast('Error opening booking form: ' + error.message, 'error');
    });
}

function openEditBookingModal(booking) {
    closeActiveModal();

    const modal = new EditBookingModal({
        booking,
        planes,
        students,
        instructors,
        onSave: async (bookingData) => {

            const { error } = await supabase.schema('api').rpc('update_booking', {
                booking_uuid: booking.id,
                payload: bookingData
            });

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
                closeActiveModal();
            }
        },
        onClose: () => {
            closeActiveModal();
        }
    });

    activeModal = modal;
    modal.render();
}

function openBookingDetails(booking) {
    console.log('📖 openBookingDetails called for booking:', booking.id);
    closeActiveModal();

    if (window.bookingModalTimeout) {
        clearTimeout(window.bookingModalTimeout);
    }

    window.bookingModalTimeout = setTimeout(() => {
        console.log('📖 Creating new BookingDetailsModal instance...');
        BookingDetailsModal.cleanupAll();

        const modal = new BookingDetailsModal({
            booking: booking,
            planes: planes,
            students: students,
            instructors: instructors,
            onEdit: () => {
                console.log('📖 Edit button clicked');
                closeActiveModal();
                setTimeout(() => {
                    openEditBookingModal(booking);
                }, 50);
            },
            onClose: () => {
                console.log('📖 Close button clicked');
                closeActiveModal();
            }
        });

        activeModal = modal;
        console.log('📖 Calling modal.render()...');
        modal.render();
    }, 50);
}

function editBooking(bookingId) {
    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
        openEditBookingModal(booking);
    }
}

function renderSchedule() {
    const scheduleContainer = document.getElementById("schedule-container");
    if (!scheduleContainer) return;

    scheduleContainer.innerHTML = "";

    const titleEl = document.getElementById("schedule-title");
    const pagination = document.getElementById("pagination-controls");

    if (datePickerInstance) {
        datePickerInstance.destroy();
        datePickerInstance = null;
    }

    if (searchQuery) {
        renderWeeklyGrid(scheduleContainer);
        pagination.classList.add("hidden");
        titleEl.textContent = currentSearchType === "Plane" ? `Plane ${searchQuery} –` :
            currentSearchType === "Instructor" ? `Instructor ${searchQuery} –` :
                `${searchQuery} –`;
    } else {
        renderDailyGrid(scheduleContainer);
        pagination.classList.remove("hidden");
        titleEl.textContent = "General Schedule –";
    }

    const dateInput = document.getElementById("current-date");
    if (searchQuery) {
        datePickerInstance = new CustomWeekPicker(dateInput);
    } else {
        datePickerInstance = new CustomDatePicker(dateInput);
    }

    const originalSelectDate = datePickerInstance.selectDate?.bind(datePickerInstance);
    if (originalSelectDate) {
        datePickerInstance.selectDate = (dateString) => {
            originalSelectDate(dateString);
            const selectedDate = parseDateFromInput(dateString);
            if (!isNaN(selectedDate.getTime())) {
                currentDate = selectedDate;
                updateNavigationButtons();
                renderSchedule();
            }
        };
    }

    updateDateInputValue();
    updateNavigationButtons();
}

function renderDailyGrid(container) {
    const planesToShow = planes.slice(currentPlanePage * PLANES_PER_PAGE, (currentPlanePage + 1) * PLANES_PER_PAGE);

    const dayStart = new Date(currentDate);
    dayStart.setHours(6, 0, 0, 0);
    const dayEnd = new Date(currentDate);
    dayEnd.setHours(22, 0, 0, 0);

    const dayBookings = bookings.filter(booking => {
        const bookingStart = new Date(booking.start_time);
        const bookingEnd = new Date(booking.end_time);
        return bookingStart < dayEnd && bookingEnd > dayStart;
    });

    const PLANE_COLUMN_WIDTH = 120;
    const TOTAL_HOURS = 16;
    const HOUR_WIDTH = 80;
    const TOTAL_WIDTH = PLANE_COLUMN_WIDTH + (TOTAL_HOURS * HOUR_WIDTH);

    container.innerHTML = `
    <div class="daily-grid-container" style="width: ${TOTAL_WIDTH}px;">
        <div class="grid-header">
            <div class="time-axis" style="margin-left: ${PLANE_COLUMN_WIDTH}px; width: ${TOTAL_HOURS * HOUR_WIDTH}px;">
                ${Array.from({ length: 16 }, (_, i) => 6 + i).map(hour => `
                    <div class="time-slot" style="width: ${HOUR_WIDTH}px; transform: translateX(-50%);">${hour}:00</div>
                `).join('')}
            </div>
        </div>
        <div class="grid-body">
            ${planesToShow.map(plane => `
                <div class="plane-row" data-plane-id="${plane.id}">
                    <div class="plane-label" style="width: ${PLANE_COLUMN_WIDTH}px;">${plane.tail_number}</div>
                    <div class="time-slots" style="width: ${TOTAL_HOURS * HOUR_WIDTH}px;">
                        <div class="time-grid" style="width: ${TOTAL_HOURS * HOUR_WIDTH}px; --hour-width: ${HOUR_WIDTH}px;">
                            ${renderPlaneBookings(plane.id, dayBookings, dayStart, HOUR_WIDTH)}
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
    ${renderCurrentTimeLine(dayStart, HOUR_WIDTH)}
`;

    document.getElementById("page-indicator").textContent =
        `Page ${currentPlanePage + 1} of ${Math.ceil(planes.length / PLANES_PER_PAGE)}`;

    attachBookingClickHandlers();
}

function renderWeeklyGrid(container) {
    const startOfWeek = new Date(currentDate);
    const offsetToMonday = (currentDate.getDay() + 6) % 7;
    startOfWeek.setDate(currentDate.getDate() - offsetToMonday);

    const days = Array.from({ length: 7 }, (_, i) => {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        day.setHours(0, 0, 0, 0);
        return day;
    });

    const dayStarts = days.map(day => {
        const start = new Date(day);
        start.setHours(6, 0, 0, 0);
        return start;
    });

    const dayEnds = days.map(day => {
        const end = new Date(day);
        end.setHours(22, 0, 0, 0);
        return end;
    });

    const weekBookings = bookings.filter(booking => {
        const bookingStart = new Date(booking.start_time);
        const bookingEnd = new Date(booking.end_time);
        return days.some((day, index) => bookingStart < dayEnds[index] && bookingEnd > dayStarts[index]);
    });

    const PLANE_COLUMN_WIDTH = 120;
    const TOTAL_HOURS = 16;
    const HOUR_WIDTH = 80;
    const TOTAL_WIDTH = PLANE_COLUMN_WIDTH + (TOTAL_HOURS * HOUR_WIDTH);

    container.innerHTML = `
    <div class="daily-grid-container weekly-grid-container" style="width: ${TOTAL_WIDTH}px;">
        <div class="grid-header">
            <div class="time-axis" style="margin-left: ${PLANE_COLUMN_WIDTH}px; width: ${TOTAL_HOURS * HOUR_WIDTH}px;">
                ${Array.from({ length: TOTAL_HOURS }, (_, i) => 6 + i).map(hour => `
                    <div class="time-slot" style="width: ${HOUR_WIDTH}px; transform: translateX(-50%);">${hour}:00</div>
                `).join('')}
            </div>
        </div>

        <div class="grid-body">
            ${days.map((day, dayIndex) => `
                <div class="plane-row" data-day-index="${dayIndex}">
                    <div class="plane-label" style="width: ${PLANE_COLUMN_WIDTH}px;">
                        ${day.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                    <div class="time-slots" style="width: ${TOTAL_HOURS * HOUR_WIDTH}px;">
                        <div class="time-grid" style="width: ${TOTAL_HOURS * HOUR_WIDTH}px; --hour-width: ${HOUR_WIDTH}px;">
                            ${renderDayBookings(dayIndex, dayStarts[dayIndex], HOUR_WIDTH)}
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
    ${''}
    `;

    const pagination = document.getElementById("pagination-controls");
    if (pagination) pagination.classList.add("hidden");

    attachBookingClickHandlers();
}

function renderPlaneBookings(planeId, dayBookings, dayStart, hourWidth) {
    const planeBookings = dayBookings.filter(booking => booking.plane_id === planeId);

    return planeBookings.map(booking => {
        const bookingStart = new Date(booking.start_time);
        const bookingEnd = new Date(booking.end_time);

        const startHours = (bookingStart - dayStart) / (1000 * 60 * 60);
        const endHours = (bookingEnd - dayStart) / (1000 * 60 * 60);

        const visibleStart = Math.max(0, startHours);
        const visibleEnd = Math.min(16, endHours);
        const duration = Math.max(0, visibleEnd - visibleStart);

        const left = visibleStart * hourWidth;
        const width = duration * hourWidth;



        const pilot = getPersonByUserId(booking.pilot_id);
        const instructor = getPersonByUserId(booking.instructor_id);

        const pilotName = pilot ? `${pilot.first_name} ${pilot.last_name}` : "Unknown";
        const instructorName = instructor ? `${instructor.first_name} ${instructor.last_name}` : "-";

        const isInstruction = !!booking.instructor_id;
        const bookingColor = isInstruction ? '#3b82f6' : '#10b981';

        if (width <= 0) return '';

        return `
            <div class="booking-slot daily-booking" 
                 data-booking-id="${booking.id}"
                 style="left: ${left}px; width: ${width}px; background: ${bookingColor}; border-color: ${bookingColor}"
                 title="${pilotName} with ${instructorName} - ${booking.description || 'No description'}">
                <div class="booking-content">
                    <div class="booking-pilot">${pilotName}</div>
                    <div class="booking-instructor">${instructorName}</div>
                </div>
            </div>
        `;
    }).join('');
}

function renderDayBookings(dayIndex, dayStart, hourWidth) {
    const visibleDayStart = new Date(dayStart);
    const visibleDayEnd = new Date(dayStart);
    visibleDayEnd.setHours(22, 0, 0, 0);

    let rowBookings = bookings.filter(booking => {
        const bookingStart = new Date(booking.start_time);
        const bookingEnd = new Date(booking.end_time);
        return bookingStart < visibleDayEnd && bookingEnd > visibleDayStart;
    });

    if (searchQuery && currentSearchType) {
        rowBookings = rowBookings.filter(booking => {
            const plane = planes.find(p => p.id === booking.plane_id);

            const instructor = getPersonByUserId(booking.instructor_id);
            const pilot = getPersonByUserId(booking.pilot_id);
            const pilotName = pilot ? `${pilot.first_name} ${pilot.last_name}` : '';

            if (currentSearchType === "Person") {
                return pilotName.toLowerCase().includes(searchQuery.toLowerCase());
            } else if (currentSearchType === "Instructor") {
                const instructorFullName = instructor ? `${instructor.first_name} ${instructor.last_name}` : '';
                const isAssignedInstructor = instructorFullName.toLowerCase().includes(searchQuery.toLowerCase());
                const isPilotInstructor = pilotName.toLowerCase().includes(searchQuery.toLowerCase());
                return isAssignedInstructor || isPilotInstructor;
            } else if (currentSearchType === "Plane") {
                return plane?.tail_number?.toLowerCase().includes(searchQuery.toLowerCase());
            }
            return true;
        });
    }

    return rowBookings.map(booking => {
        const bookingStart = new Date(booking.start_time);
        const bookingEnd = new Date(booking.end_time);

        const startHours = (bookingStart - dayStart) / (1000 * 60 * 60);
        const endHours = (bookingEnd - dayStart) / (1000 * 60 * 60);

        const visibleStart = Math.max(0, startHours);
        const visibleEnd = Math.min(16, endHours);
        const duration = Math.max(0, visibleEnd - visibleStart);

        const left = visibleStart * hourWidth;
        const width = duration * hourWidth;


        const plane = planes.find(p => p.id === booking.plane_id);
        const instructor = getPersonByUserId(booking.instructor_id);
        const pilot = getPersonByUserId(booking.pilot_id);
        const pilotName = pilot ? `${pilot.first_name} ${pilot.last_name}` : "Unknown";

        const isInstruction = !!booking.instructor_id;
        const bookingColor = isInstruction ? '#3b82f6' : '#10b981';

        if (width <= 0) return '';

        let firstLine = '';
        let secondLine = '';

        if (currentSearchType === "Person") {
            firstLine = plane?.tail_number || 'Unknown';
            secondLine = instructor ? `${instructor.first_name} ${instructor.last_name}` : '';
        } else if (currentSearchType === "Plane") {
            firstLine = pilotName || 'Unknown';
            secondLine = instructor ? `${instructor.first_name} ${instructor.last_name}` : '';
        } else if (currentSearchType === "Instructor") {
            firstLine = plane?.tail_number || 'Unknown';
            secondLine = pilotName || '';
        } else {
            firstLine = plane?.tail_number || 'Unknown';
            secondLine = instructor ? `${instructor.first_name} ${instructor.last_name}` : '';
        }

        const tooltip = `${plane?.tail_number || 'Unknown'} - ${pilotName}${instructor ? ' with ' + `${instructor.first_name} ${instructor.last_name}` : ''} - ${booking.description || 'No description'}`;

        return `
            <div class="booking-slot daily-booking" 
                 data-booking-id="${booking.id}"
                 style="left: ${left}px; width: ${width}px; background: ${bookingColor}; border-color: ${bookingColor}"
                 title="${tooltip}">
                <div class="booking-content">
                    <div class="booking-pilot">${firstLine}</div>
                    ${secondLine ? `<div class="booking-instructor">${secondLine}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function renderCurrentTimeLine(dayStart, hourWidth) {
    const now = getAeroclubTime();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const viewingDate = new Date(currentDate);
    viewingDate.setHours(0, 0, 0, 0);

    if (viewingDate.getTime() !== today.getTime()) return '';

    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const totalMinutesFrom6AM = ((currentHour - 6) * 60) + currentMinute;
    let hoursFromDayStart = totalMinutesFrom6AM / 60;
    hoursFromDayStart += 1.5;

    if (hoursFromDayStart >= 0 && hoursFromDayStart <= 18.5) {
        const left = hoursFromDayStart * hourWidth;
        return `
            <div class="current-time-line" style="left: ${left}px;">
                <div class="current-time-dot"></div>
            </div>
        `;
    }
    return '';
}

function attachBookingClickHandlers() {
    document.querySelectorAll('.booking-slot').forEach(bookingEl => {
        bookingEl.addEventListener('click', (e) => {
            e.stopPropagation();

            const now = Date.now();
            if (now - lastBookingClick < CLICK_DEBOUNCE_MS) {
                return;
            }
            lastBookingClick = now;

            const bookingId = bookingEl.getAttribute('data-booking-id');
            const booking = bookings.find(b => b.id === bookingId);
            if (booking) {
                openBookingDetails(booking);
            }
        });
    });
}