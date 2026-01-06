// ./js/pages/flight_logs.js
import { supabase } from "../supabase.js";
import { AddFlightLogModal } from "../modals/AddFlightLogModal.js";
import { FlightDetailsModal } from "../modals/FlightDetailsModal.js";
import { showToast } from "../components/showToast.js";
import { CustomDatePicker } from "../components/customDatePicker.js";
import { CustomWeekPicker } from "../components/customWeekPicker.js";
import { Autocomplete } from "../components/autocomplete.js";
import { getMembers } from "../utils/memberData.js";

let currentDate = new Date();
let searchQuery = "";
let flightLogs = [];
let planes = [];
let students = [];
let instructors = [];
let allMembers = [];
let userMap = new Map();
let currentSearchType = "";
let currentPlanePage = 0;
const PLANES_PER_PAGE = 8;
let searchAutocomplete = null;

let easaAutocomplete = null;
let selectedEasaPlaneId = null;

// Enum Mapping for CSS consistency
const flightTypeCssMap = {
    'P': 'flight-p',
    'PI': 'flight-p-i',
    'EPI': 'flight-ep-i',
    'EPFE': 'flight-ep-fe',
    'nav': 'flight-nav'
};

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


.flight-slot {
    position: absolute;
    border-radius: 4px;
    cursor: pointer;
    z-index: 2;
    overflow: hidden;
    transition: all 0.2s ease;
    border: 1px solid;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.flight-slot:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
}

.daily-flight {
    top: 4px;
    bottom: 4px;
    min-width: 20px;
}

.weekly-flight {
    min-height: 20px;
}

.flight-content {
    padding: 4px 6px;
    color: white;
    font-size: 11px;
    line-height: 1.2;
    overflow: hidden;
}

.flight-pilot {
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.flight-instructor,
.flight-plane {
    font-size: 10px;
    opacity: 0.9;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}


.flight-p { background: #3b82f6; border-color: #2563eb; }
.flight-ep-i { background: #10b981; border-color: #059669; }
.flight-ep-fe { background: #f59e0b; border-color: #d97706; }
.flight-p-i { background: #8b5cf6; border-color: #7c3aed; }
.flight-maintenance { background: #6b7280; border-color: #4b5563; }
.flight-ferry { background: #ec4899; border-color: #db2777; }
.flight-other { background: #6366f1; border-color: #4f46e5; }


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
let lastFlightClick = 0;
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

export async function loadFlightLogsPage() {
    console.log('Loading flight logs page...');
    lastFlightClick = 0;

    await cleanupFlightLogsPage();

    searchQuery = "";
    currentSearchType = "";
    currentPlanePage = 0;
    currentDate = new Date();
    tableView = false;

    if (!document.querySelector('#flight-logs-calendar-styles')) {
        const styleElement = document.createElement('div');
        styleElement.innerHTML = calendarStyles;
        styleElement.firstElementChild.id = 'flight-logs-calendar-styles';
        document.head.appendChild(styleElement.firstElementChild);
    }

    document.getElementById("main-content").innerHTML = `
        <div class="flex flex-col h-full text-white relative">
            <div class="flex justify-between items-center mb-6">
                <div class="flex space-x-2">
                    <button id="schedule-view-btn" class="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors duration-200 font-medium">Schedule View</button>
                    <button id="table-view-btn" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors duration-200 font-medium">Table View</button>
                    <button id="easa-view-btn" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors duration-200 font-medium flex items-center space-x-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                        <span>EASA View</span>
                    </button>
                </div>

                <h1 class="text-2xl font-bold text-white absolute left-1/2 transform -translate-x-1/2">Flight Logs</h1>

                <button id="create-flight-log-btn" class="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-500 transition-colors duration-200 font-medium flex items-center space-x-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                    <span>New Flight Log</span>
                </button>
            </div>

            <div id="schedule-view" class="flex flex-col h-full">
                <div class="flex justify-between items-center mb-4 relative">
                    <div class="w-1/3 relative" id="search-container">
                        <div class="relative">
                            <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                            <input id="search-input" type="text" placeholder="Search by plane, pilot, or instructor..."
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
                        <select id="search-column" class="p-2.5 border border-gray-700 rounded-lg bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200">
                            <option value="pilot_name">Pilot Name</option>
                            <option value="plane_tail">Plane</option>
                            <option value="instructor_name">Instructor</option>
                            <option value="departure_icao">Departure</option>
                            <option value="arrival_icao">Arrival</option>
                            <option value="type_of_flight">Flight Type</option>
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
                                <th class="p-3 cursor-pointer hover:bg-gray-600 transition-colors duration-200" data-column="flight_date">Date <span class="sort-arrow"></span></th>
                                <th class="p-3 cursor-pointer hover:bg-gray-600 transition-colors duration-200" data-column="plane_tail">Plane <span class="sort-arrow"></span></th>
                                <th class="p-3 cursor-pointer hover:bg-gray-600 transition-colors duration-200" data-column="pilot_name">Pilot <span class="sort-arrow"></span></th>
                                <th class="p-3 cursor-pointer hover:bg-gray-600 transition-colors duration-200" data-column="instructor_name">Instructor <span class="sort-arrow"></span></th>
                                <th class="p-3 cursor-pointer hover:bg-gray-600 transition-colors duration-200" data-column="type_of_flight">Type <span class="sort-arrow"></span></th>
                                <th class="p-3 cursor-pointer hover:bg-gray-600 transition-colors duration-200" data-column="route">Route <span class="sort-arrow"></span></th>
                                <th class="p-3 cursor-pointer hover:bg-gray-600 transition-colors duration-200" data-column="flight_duration">Duration <span class="sort-arrow"></span></th>
                                <th class="p-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="flight-logs-table" class="divide-y divide-gray-700"></tbody>
                    </table>
                </div>
                <div id="table-pagination" class="flex justify-center mt-6 space-x-2"></div>
            </div>

            <div id="easa-view" class="hidden flex flex-col h-full">
                <div class="flex justify-center items-center mb-6">
                    <div class="w-1/2 relative">
                         <div class="relative">
                            <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                            <input id="easa-plane-search" type="text" placeholder="Look up a plane tail number (e.g., F-ABCD)..."
                                class="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200">
                        </div>
                    </div>
                </div>

                <div id="easa-content-area" class="flex-1 bg-white text-black overflow-auto rounded-sm p-4 font-mono text-sm shadow-xl">
                    <div class="text-center text-gray-500 mt-10">Select a plane above to view its Carnet de Route</div>
                </div>
            </div>
        </div>
    `;

    attachScheduleEvents();
    setupTableViewEvents();
    setupDateNavigation();
    setupPagination();

    await fetchData();
    setupSearchFunctionality();
    renderSchedule();
    renderTableView();

    window.addEventListener('beforeunload', cleanupFlightLogsPage);
}

// Helper: Resolve User UUID to Member Data
function resolveUser(userUuid) {
    if (!userUuid) return null;
    const userData = userMap.get(userUuid);
    if (!userData) return null;


    return allMembers.find(m => m.id === userData.person_id);
}

async function fetchData() {
    try {

        const [planesResponse, membersResponse, usersResponse, flightLogsResponse] = await Promise.all([
            supabase.schema('api').rpc('get_planes'),
            getMembers(),
            supabase.schema('api').rpc('get_users'),
            supabase.schema('api').rpc('get_flight_logs')
        ]);

        if (planesResponse.error) throw planesResponse.error;
        if (membersResponse.error) throw membersResponse.error;
        if (usersResponse.error) throw usersResponse.error;
        if (flightLogsResponse.error) throw flightLogsResponse.error;

        planes = planesResponse.data || [];
        allMembers = membersResponse.data || [];
        flightLogs = flightLogsResponse.data || [];
        const users = usersResponse.data || [];


        userMap.clear();
        users.forEach(u => userMap.set(u.id, u));


        students = allMembers.filter(m => m.type === 'student');
        instructors = allMembers.filter(m => m.type === 'instructor');

    } catch (error) {
        console.error('Error fetching data:', error);
        showToast('Error loading data: ' + error.message, 'error');
    }
}

function setupTableViewEvents() {

    const scheduleBtn = document.getElementById("schedule-view-btn");
    const tableBtn = document.getElementById("table-view-btn");
    const easaBtn = document.getElementById("easa-view-btn");

    const scheduleDiv = document.getElementById("schedule-view");
    const tableDiv = document.getElementById("table-view");
    const easaDiv = document.getElementById("easa-view");


    function setActiveTab(activeBtn, activeDiv) {

        [scheduleBtn, tableBtn, easaBtn].forEach(btn => {
            if (btn) {
                btn.classList.remove("bg-blue-600");
                btn.classList.add("bg-gray-700");
            }
        });


        [scheduleDiv, tableDiv, easaDiv].forEach(div => {
            if (div) div.classList.add("hidden");
        });


        if (activeBtn) {
            activeBtn.classList.remove("bg-gray-700");
            activeBtn.classList.add("bg-blue-600");
        }
        if (activeDiv) {
            activeDiv.classList.remove("hidden");
        }
    }


    if (scheduleBtn) {
        scheduleBtn.addEventListener("click", () => {
            tableView = false;
            setActiveTab(scheduleBtn, scheduleDiv);
        });
    }


    if (tableBtn) {
        tableBtn.addEventListener("click", () => {
            tableView = true;
            setActiveTab(tableBtn, tableDiv);
            renderTableView();
        });
    }


    if (easaBtn) {
        easaBtn.addEventListener("click", () => {


            setActiveTab(easaBtn, easaDiv);



            if (typeof setupEasaSearch === 'function') {
                setupEasaSearch();
            }
        });
    }


    document.querySelectorAll("#table-view th[data-column]").forEach(th => {
        th.addEventListener("click", () => {
            const column = th.getAttribute("data-column");
            toggleTableSort(column);
        });
    });


    const searchBox = document.getElementById("search-box");
    if (searchBox) {
        searchBox.addEventListener("input", e => {
            searchState.query = e.target.value.toLowerCase();
            currentPage = 1;
            renderTableView();
        });
    }

    const searchColumn = document.getElementById("search-column");
    if (searchColumn) {
        searchColumn.addEventListener("change", e => {
            searchState.column = e.target.value;
            currentPage = 1;
            renderTableView();
        });
    }
}

function setupEasaSearch() {
    const inputElement = document.getElementById("easa-plane-search");
    if (!inputElement || easaAutocomplete) return;


    const planeData = planes.map(p => ({
        id: p.id,
        name: p.tail_number,
        type: 'plane',
        searchCategory: 'Plane'
    }));

    easaAutocomplete = new Autocomplete({
        inputElement: inputElement,
        dataSource: planeData,
        allowedTypes: null,
        displayField: 'name',
        valueField: 'id',
        placeholder: 'Search for a plane...',
        onSelect: (selection) => {
            const item = selection.rawItem;
            if (item) {
                selectedEasaPlaneId = item.id;
                renderEasaView(selectedEasaPlaneId);
            }
        },
        onInput: (query) => {
            if (!query.trim()) {
                selectedEasaPlaneId = null;
                document.getElementById("easa-content-area").innerHTML = '<div class="text-center text-gray-500 mt-10">Select a plane above to view its Carnet de Route</div>';
            }
        }
    });
}

function renderEasaView(planeId) {
    const container = document.getElementById("easa-content-area");
    const plane = planes.find(p => p.id === planeId);


    const logs = flightLogs
        .filter(f => f.plane_id === planeId)
        .sort((a, b) => new Date(a.flight_date) - new Date(b.flight_date));

    if (!logs.length) {
        container.innerHTML = `<div class="text-center text-gray-500 mt-10">No flight logs found for ${plane?.tail_number || 'this plane'}.</div>`;
        return;
    }


    const tableStyle = `
        <style>
            .easa-table { width: 100%; border-collapse: collapse; font-family: 'Courier New', monospace; font-size: 11px; }
            .easa-table th, .easa-table td { border: 1px solid #000; padding: 4px; }
            .easa-table th { background-color: #f0f0f0; text-align: center; font-weight: bold; }
            .easa-header-main { background-color: #e0e0e0; }
            
            .page-separator { border-left: 4px double #000 !important; }
        </style>
    `;

    let rowsHtml = logs.map(flight => {

        const dateObj = new Date(flight.flight_date);
        const dateStr = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getFullYear()).slice(-2)}`;


        const pilot = resolveUser(flight.pilot_uuid);
        const instructor = resolveUser(flight.instructor_uuid);
        let names = pilot ? pilot.last_name.toUpperCase() : "UNKNOWN";
        if (instructor) {
            names += ` / ${instructor.last_name.toUpperCase()}`;
        }


        let functionCode = "";
        const type = flight.type_of_flight;
        if (type === 'P') functionCode = "P";
        else if (type === 'EPI') functionCode = "EP / I";
        else if (type === 'EPFE') functionCode = "EP / FE";
        else if (type === 'PI') functionCode = "P / I";
        else functionCode = type;


        const depPlace = flight.departure_icao;
        const arrPlace = flight.arrival_icao;


        const formatTime = (isoString) => {
            if (!isoString) return "";
            const d = new Date(isoString);
            return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
        };
        const depTime = formatTime(flight.departure_time);
        const arrTime = formatTime(flight.arrival_time);


        let durationStr = "0h00";
        if (flight.flight_duration) {
            const hours = Math.floor(flight.flight_duration);
            const minutes = Math.round((flight.flight_duration - hours) * 60);
            durationStr = `${hours}h${String(minutes).padStart(2, '0')}`;
        }




        let nature = "Privé";
        if (['EPI', 'EPFE', 'PI'].includes(type) || instructor) {
            nature = "Instruction";
        }



        let fuelStr = "-";
        const totalLiters = (parseFloat(flight.fuel_added_departure_liters) || 0) + (parseFloat(flight.fuel_added_arrival_liters) || 0);





        const depText = flight.fuel_added_departure || "";
        const arrText = flight.fuel_added_arrival || "";

        if (depText || arrText) {

            fuelStr = `${depText} ${arrText}`.trim();
        } else if (totalLiters > 0) {

            fuelStr = `+${totalLiters}l`;
        }


        const oilTotal = (parseFloat(flight.engine_oil_added_departure) || 0) + (parseFloat(flight.engine_oil_added_arrival) || 0);
        const oilStr = oilTotal > 0 ? `${oilTotal}l` : "-";


        const obs = flight.incidents_or_observations || "";

        return `
            <tr>
                <td>${dateStr}</td>
                <td style="text-align:left">${names}</td>
                <td>${functionCode}</td>
                <td>${depPlace}</td>
                <td>${arrPlace}</td>
                <td>${depTime}</td>
                <td>${arrTime}</td>
                <td>${durationStr}</td>
                <td>${nature}</td>
                
                <td class="page-separator">${fuelStr}</td>
                <td>${oilStr}</td>
                <td style="text-align:left">${obs}</td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        ${tableStyle}
        <h2 class="text-lg font-bold mb-2 border-b border-black pb-2">CARNET DE ROUTE - ${plane.tail_number}</h2>
        <table class="easa-table">
            <thead>
                <tr class="easa-header-main">
                    <th colspan="9">PAGE DE GAUCHE</th>
                    <th colspan="3" class="page-separator">PAGE DE DROITE</th>
                </tr>
                <tr>
                    <th rowspan="2" style="width:60px">1. Date</th>
                    <th colspan="2">2/3. Equipage</th>
                    <th colspan="2">4. Lieu</th>
                    <th colspan="2">5. Heures (UTC)</th>
                    <th rowspan="2" style="width:50px">6. Tps Vol</th>
                    <th rowspan="2">7. Nature</th>
                    <th rowspan="2" class="page-separator">8. Carburant</th>
                    <th rowspan="2" style="width:40px">9. Huile</th>
                    <th rowspan="2">10. Incidents / Observations</th>
                </tr>
                <tr>
                    <th>Noms</th>
                    <th style="width:40px">Fct</th>
                    <th style="width:45px">Dep</th>
                    <th style="width:45px">Arr</th>
                    <th style="width:45px">Dep</th>
                    <th style="width:45px">Arr</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHtml}
            </tbody>
        </table>
    `;
}

function renderTableView() {

    const canManage = true;



    const now = new Date();

    let tableData = flightLogs.map(flight => {
        const plane = planes.find(p => p.id === flight.plane_id);


        const pilotDetails = resolveUser(flight.pilot_uuid);
        const instructorDetails = resolveUser(flight.instructor_uuid);

        const flightDate = new Date(flight.flight_date);



        const flightTypeDisplay = flight.type_of_flight;

        return {
            ...flight,
            plane_tail: plane?.tail_number || 'Unknown',
            instructor_name: instructorDetails ?
                `${instructorDetails.first_name} ${instructorDetails.last_name}` : '-',
            pilot_name: pilotDetails ?
                `${pilotDetails.first_name} ${pilotDetails.last_name}` :
                'Unknown Pilot',
            route: `${flight.departure_icao} → ${flight.arrival_icao}`,
            flight_date_display: flightDate.toLocaleDateString(),
            flight_datetime: flightDate,
            type_display: flightTypeDisplay
        };
    });


    let filteredData = tableData.filter(flight => {
        if (!searchState.query) return true;

        let value = "";
        if (searchState.column === 'route') {
            value = `${flight.departure_icao} ${flight.arrival_icao}`.toLowerCase();
        } else {
            value = (flight[searchState.column] || "").toString().toLowerCase();
        }

        return value.includes(searchState.query);
    });


    if (sortState.direction !== "none") {
        filteredData.sort((a, b) => {
            let aVal = a[sortState.column];
            let bVal = b[sortState.column];


            if (sortState.column === 'flight_date') {
                aVal = new Date(a.flight_date).getTime();
                bVal = new Date(b.flight_date).getTime();
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


    const tbody = document.getElementById("flight-logs-table");
    tbody.innerHTML = pageData.map((flight, index) => {

        const cssClass = flightTypeCssMap[flight.type_of_flight] || 'flight-other';

        return `
        <tr class="${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-700'} hover:bg-gray-600 cursor-pointer" data-flight-id="${flight.id}">
            <td class="p-2 border-b border-gray-600">
                <div class="font-medium">${flight.flight_date_display}</div>
                <div class="text-sm text-gray-400">
                    ${new Date(flight.departure_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - 
                    ${new Date(flight.arrival_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </div>
            </td>
            <td class="p-2 border-b border-gray-600">${flight.plane_tail}</td>
            <td class="p-2 border-b border-gray-600">${flight.pilot_name}</td>
            <td class="p-2 border-b border-gray-600">${flight.instructor_name}</td>
            <td class="p-2 border-b border-gray-600">
                <span class="px-2 py-1 rounded text-xs ${cssClass}">${flight.type_display}</span>
            </td>
            <td class="p-2 border-b border-gray-600 font-medium">${flight.route}</td>
            <td class="p-2 border-b border-gray-600">${flight.flight_duration || 0}h</td>
            <td class="p-2 border-b border-gray-600">
                <div class="flex justify-center space-x-2">
                    <button class="text-blue-400 hover:text-blue-300 view-flight" data-id="${flight.id}">View</button>
                </div>
            </td>
        </tr>
        `;
    }).join('');


    tbody.querySelectorAll('.view-flight').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const flightId = btn.getAttribute('data-id');
            viewFlight(flightId);
        });
    });


    tbody.addEventListener('click', (e) => {
        const row = e.target.closest('tr[data-flight-id]');
        if (row && !e.target.closest('.view-flight')) {
            const now = Date.now();
            if (now - lastFlightClick < CLICK_DEBOUNCE_MS) {
                return;
            }

            const flightId = row.getAttribute('data-flight-id');
            const flight = flightLogs.find(f => f.id === flightId);
            if (flight) {
                openFlightDetails(flight);
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

function setupSearchFunctionality() {
    const inputElement = document.getElementById("search-input");
    if (!inputElement) return;

    if (searchAutocomplete) {
        searchAutocomplete.destroy();
    }



    const planeData = planes.map(p => ({
        id: p.id,
        name: p.tail_number,
        searchCategory: 'Plane',



    }));


    const instructorData = instructors.map(i => ({
        id: i.id,
        name: `${i.first_name} ${i.last_name}`,
        type: 'instructor',
        searchCategory: 'Instructor'
    }));


    const pilotData = students.map(s => ({
        id: s.id,
        name: `${s.first_name} ${s.last_name}`,
        type: s.type,
        searchCategory: 'Pilot'
    }));

    const combinedData = [...planeData, ...instructorData, ...pilotData];

    searchAutocomplete = new Autocomplete({
        inputElement: inputElement,
        dataSource: combinedData,
        allowedTypes: null,
        displayField: 'name',
        valueField: 'id',
        placeholder: 'Search by plane, pilot, or instructor...',


        onSelect: (selection) => {

            const item = selection.rawItem;

            if (item) {

                searchQuery = item.name;

                currentSearchType = item.searchCategory;
                renderSchedule();
            }
        },
        onInput: (query) => {

            if (!query.trim()) {
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

function getWeekStartEnd(date) {
    const start = getMonday(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
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

export async function cleanupFlightLogsPage() {
    console.log('Cleaning up flight logs page...');

    if (datePickerInstance) {
        datePickerInstance.destroy();
        datePickerInstance = null;
    }

    if (searchAutocomplete) {
        searchAutocomplete.destroy();
        searchAutocomplete = null;
    }


    if (FlightDetailsModal.cleanupAll) {
        FlightDetailsModal.cleanupAll();
    }


    if (activeModal) {
        if (typeof activeModal.destroy === 'function') {
            activeModal.destroy();
        } else if (typeof activeModal.close === 'function') {
            activeModal.close();
        }
        activeModal = null;
    }


    if (window.currentTimeInterval) {
        clearInterval(window.currentTimeInterval);
        window.currentTimeInterval = null;
    }


    if (modalCleanupTimeout) {
        clearTimeout(modalCleanupTimeout);
        modalCleanupTimeout = null;
    }


    if (window.flightModalTimeout) {
        clearTimeout(window.flightModalTimeout);
        window.flightModalTimeout = null;
    }


    window.isClosingModal = false;


    const mainContent = document.getElementById("main-content");
    if (mainContent) {
        mainContent.innerHTML = "";
    }


    window.removeEventListener('beforeunload', cleanupFlightLogsPage);
}

function attachScheduleEvents() {
    document.getElementById("create-flight-log-btn").addEventListener("click", () => {
        openAddFlightLogModal();
    });
}

function closeActiveModal() {
    console.log('❌ closeActiveModal called, activeModal:', activeModal);

    if (window.isClosingModal) return;
    window.isClosingModal = true;

    if (activeModal && activeModal instanceof AddFlightLogModal && !activeModal.isOpen) {
        console.log('📝 AddFlightLogModal not yet open, skipping cleanup');
        window.isClosingModal = false;
        return;
    }


    if (FlightDetailsModal.cleanupAll) {
        FlightDetailsModal.cleanupAll();
    }


    if (activeModal) {
        const modalToClose = activeModal;
        activeModal = null;


        if (typeof modalToClose.destroy === 'function') {
            console.log('🧹 Destroying modal with custom pickers...');
            modalToClose.destroy();
        } else if (typeof modalToClose.close === 'function') {
            modalToClose.close();
        } else if (typeof modalToClose.hide === 'function') {
            modalToClose.hide();
        }
    }


    if (window.flightModalTimeout) {
        clearTimeout(window.flightModalTimeout);
        window.flightModalTimeout = null;
    }


    setTimeout(() => {
        window.isClosingModal = false;
    }, 150);
}

function openAddFlightLogModal() {
    console.log('➕ openAddFlightLogModal called');


    closeActiveModal();


    setTimeout(() => {
        createAddFlightLogModal();
    }, 200);
}

function createAddFlightLogModal() {
    console.log('🛠️ Creating FRESH AddFlightLogModal instance...');


    if (activeModal && typeof activeModal.destroy === 'function') {
        activeModal.destroy();
        activeModal = null;
    }

    const modal = new AddFlightLogModal();


    modal.init().then(() => {
        modal.onSuccess(async (newFlight) => {
            console.log('✅ Flight log created successfully:', newFlight);
            showToast('Flight log created successfully!', 'success');
            await fetchData();
            if (tableView) {
                renderTableView();
            } else {
                renderSchedule();
            }
            closeActiveModal();
        });

        modal.onClose(() => {
            console.log('📝 AddFlightLogModal closed');
            closeActiveModal();
        });

        activeModal = modal;


        modal.show().catch(error => {
            console.error('Failed to show AddFlightLogModal:', error);
            showToast('Error opening flight log form: ' + error.message, 'error');

            closeActiveModal();
        });
    }).catch(error => {
        console.error('Failed to initialize AddFlightLogModal:', error);
        showToast('Error initializing flight log form: ' + error.message, 'error');
    });
}
function openFlightDetails(flight) {
    console.log('📖 openFlightDetails called for flight:', flight.id);

    closeActiveModal();

    if (window.flightModalTimeout) {
        clearTimeout(window.flightModalTimeout);
    }

    window.flightModalTimeout = setTimeout(() => {
        console.log('📖 Creating new FlightDetailsModal instance...');

        if (FlightDetailsModal.cleanupAll) {
            FlightDetailsModal.cleanupAll();
        }

        const modal = new FlightDetailsModal();

        activeModal = modal;
        console.log('📖 Calling modal.show()...');
        modal.show(flight);
    }, 50);
}

function viewFlight(flightId) {
    const flight = flightLogs.find(f => f.id === flightId);
    if (flight) {
        openFlightDetails(flight);
    }
}

function renderSchedule() {

    const canManage = true;


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
        titleEl.textContent = "Flight Schedule –";
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


    const dayFlights = flightLogs.filter(flight => {
        const flightDate = new Date(flight.flight_date);
        return flightDate.toDateString() === currentDate.toDateString();
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
                            ${renderPlaneFlights(plane.id, dayFlights, dayStart, HOUR_WIDTH)}
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

    attachFlightClickHandlers();
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


    const weekFlights = flightLogs.filter(flight => {
        const flightDate = new Date(flight.flight_date);
        return days.some(day => flightDate.toDateString() === day.toDateString());
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
                            ${renderDayFlights(dayIndex, dayStarts[dayIndex], HOUR_WIDTH)}
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
    `;

    const pagination = document.getElementById("pagination-controls");
    if (pagination) pagination.classList.add("hidden");

    attachFlightClickHandlers();
}

function renderPlaneFlights(planeId, dayFlights, dayStart, hourWidth) {
    const planeFlights = dayFlights.filter(flight => flight.plane_id === planeId);

    return planeFlights.map(flight => {

        const depTime = new Date(flight.departure_time);
        const arrTime = new Date(flight.arrival_time);
        const depHours = depTime.getHours();
        const depMinutes = depTime.getMinutes();
        const arrHours = arrTime.getHours();
        const arrMinutes = arrTime.getMinutes();

        const startHours = depHours - 6 + (depMinutes / 60);
        const endHours = arrHours - 6 + (arrMinutes / 60);
        const duration = Math.max(0, endHours - startHours);

        const left = startHours * hourWidth;
        const width = duration * hourWidth;


        const instructor = resolveUser(flight.instructor_uuid);
        const pilotDetails = resolveUser(flight.pilot_uuid);

        const pilotName = pilotDetails ?
            `${pilotDetails.first_name} ${pilotDetails.last_name}` : 'Unknown';

        const instructorName = instructor ?
            `${instructor.first_name} ${instructor.last_name}` : "-";


        const flightTypeClass = flightTypeCssMap[flight.type_of_flight] || 'flight-other';

        if (width <= 0) return '';

        return `
            <div class="flight-slot daily-flight ${flightTypeClass}" 
                 data-flight-id="${flight.id}"
                 style="left: ${left}px; width: ${width}px;"
                 title="${pilotName} with ${instructorName} - ${flight.type_of_flight} - ${flight.departure_icao} → ${flight.arrival_icao}">
                <div class="flight-content">
                    <div class="flight-pilot">${pilotName}</div>
                    <div class="flight-instructor">${instructorName}</div>
                </div>
            </div>
        `;
    }).join('');
}

function renderDayFlights(dayIndex, dayStart, hourWidth) {
    const day = new Date(dayStart);
    day.setHours(0, 0, 0, 0);


    let rowFlights = flightLogs.filter(flight => {
        const flightDate = new Date(flight.flight_date);
        return flightDate.toDateString() === day.toDateString();
    });


    if (searchQuery && currentSearchType) {
        rowFlights = rowFlights.filter(flight => {
            const plane = planes.find(p => p.id === flight.plane_id);
            const instructor = resolveUser(flight.instructor_uuid);
            const pilotDetails = resolveUser(flight.pilot_uuid);

            const pilotName = pilotDetails ?
                `${pilotDetails.first_name} ${pilotDetails.last_name}` : 'Unknown';

            if (currentSearchType === "Pilot") {
                return pilotName.toLowerCase().includes(searchQuery.toLowerCase());
            } else if (currentSearchType === "Instructor") {
                const instructorFullName = instructor ?
                    `${instructor.first_name} ${instructor.last_name}`.toLowerCase() : '';
                const isAssignedInstructor = instructorFullName.includes(searchQuery.toLowerCase());
                const isPilotInstructor = pilotName.toLowerCase().includes(searchQuery.toLowerCase());
                return isAssignedInstructor || isPilotInstructor;
            } else if (currentSearchType === "Plane") {
                return plane?.tail_number?.toLowerCase().includes(searchQuery.toLowerCase());
            }
            return true;
        });
    }

    return rowFlights.map(flight => {

        const depTime = new Date(flight.departure_time);
        const arrTime = new Date(flight.arrival_time);
        const depHours = depTime.getHours();
        const depMinutes = depTime.getMinutes();
        const arrHours = arrTime.getHours();
        const arrMinutes = arrTime.getMinutes();

        const startHours = depHours - 6 + (depMinutes / 60);
        const endHours = arrHours - 6 + (arrMinutes / 60);
        const duration = Math.max(0, endHours - startHours);

        const left = startHours * hourWidth;
        const width = duration * hourWidth;


        const plane = planes.find(p => p.id === flight.plane_id);
        const instructor = resolveUser(flight.instructor_uuid);
        const pilotDetails = resolveUser(flight.pilot_uuid);

        const pilotName = pilotDetails ?
            `${pilotDetails.first_name} ${pilotDetails.last_name}` : 'Unknown';


        const flightTypeClass = flightTypeCssMap[flight.type_of_flight] || 'flight-other';


        let firstLine = '';
        let secondLine = '';

        if (currentSearchType === "Pilot") {
            firstLine = plane?.tail_number || 'Unknown';
            secondLine = instructor ?
                `${instructor.first_name} ${instructor.last_name}` : ''
        } else if (currentSearchType === "Plane") {
            firstLine = pilotName || 'Unknown';
            secondLine = instructor ?
                `${instructor.first_name} ${instructor.last_name}` : ''
        } else if (currentSearchType === "Instructor") {
            firstLine = plane?.tail_number || 'Unknown';
            secondLine = pilotName || '';
        } else {
            firstLine = plane?.tail_number || 'Unknown';
            secondLine = instructor ?
                `${instructor.first_name} ${instructor.last_name}` : ''
        }

        const instructorFullName = instructor ?
            `${instructor.first_name} ${instructor.last_name}` : '';
        const tooltip = `${plane?.tail_number || 'Unknown'} - ${pilotName}${instructor ? ' with ' + instructorFullName : ''} - ${flight.type_of_flight} - ${flight.departure_icao} → ${flight.arrival_icao}`;
        if (width <= 0) return '';

        return `
            <div class="flight-slot daily-flight ${flightTypeClass}" 
                 data-flight-id="${flight.id}"
                 style="left: ${left}px; width: ${width}px;"
                 title="${tooltip}">
                <div class="flight-content">
                    <div class="flight-pilot">${firstLine}</div>
                    ${secondLine ? `<div class="flight-instructor">${secondLine}</div>` : ''}
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

    const currentHours = (now - dayStart) / (1000 * 60 * 60);


    const adjustedHours = currentHours + 1.5;


    if (adjustedHours >= 0 && adjustedHours <= 17.5) {
        const left = adjustedHours * hourWidth;

        return `
            <div class="current-time-line" style="left: ${left}px;">
                <div class="current-time-dot"></div>
            </div>
        `;
    }

    return '';
}

function attachFlightClickHandlers() {
    document.querySelectorAll('.flight-slot').forEach(flightEl => {
        flightEl.addEventListener('click', (e) => {
            e.stopPropagation();

            const now = Date.now();
            if (now - lastFlightClick < CLICK_DEBOUNCE_MS) {
                return;
            }
            lastFlightClick = now;

            const flightId = flightEl.getAttribute('data-flight-id');
            const flight = flightLogs.find(f => f.id === flightId);
            if (flight) {
                openFlightDetails(flight);
            }
        });
    });
}