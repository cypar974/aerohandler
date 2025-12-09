// ./js/pages/planes.js
import { supabase } from "../supabase.js";

let planesData = [];
let sortState = { column: null, direction: "none" };
let searchState = { column: "tail_number", query: "" };

// Pagination
let currentPage = 1;
const rowsPerPage = 10;


export async function loadPlanesPage() {
    document.getElementById("main-content").innerHTML = `
        
    <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div>
            <h1 class="text-3xl font-bold text-white mb-2">Planes Management</h1>
            <p class="text-gray-400">Manage aircraft fleet, status, and scheduling</p>
        </div>
        <div class="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div class="flex gap-2">
                <select id="search-column" class="p-2 border border-gray-600 rounded-lg bg-gray-800 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="tail_number">Tail Number</option>
                    <option value="model">Model</option>
                    <option value="status">Status</option>
                </select>
                <div class="relative">
                    <input type="text" id="search-box" placeholder="Search planes..." class="pl-10 pr-4 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white placeholder-gray-400 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full lg:w-64">
                    <div class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </div>
                </div>
            </div>
            <button id="add-plane-btn" class="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-500 hover:to-blue-600 transition-all duration-200 font-medium flex items-center gap-2 justify-center">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
                Add Plane
            </button>
        </div>
    </div>

    <!-- Table Container -->
    <div class="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-white">
                <thead class="bg-gray-700 text-gray-200">
                    <tr>
                        <th class="p-4 cursor-pointer hover:bg-gray-600 transition-colors group" data-column="status">
                            <div class="flex items-center justify-between">
                                <span>Status</span>
                                <span class="sort-arrow text-gray-400 group-hover:text-white"></span>
                            </div>
                        </th>
                        <th class="p-4 cursor-pointer hover:bg-gray-600 transition-colors group" data-column="tail_number">
                            <div class="flex items-center justify-between">
                                <span>Tail Number</span>
                                <span class="sort-arrow text-gray-400 group-hover:text-white"></span>
                            </div>
                        </th>
                        <th class="p-4 cursor-pointer hover:bg-gray-600 transition-colors group" data-column="model">
                            <div class="flex items-center justify-between">
                                <span>Model</span>
                                <span class="sort-arrow text-gray-400 group-hover:text-white"></span>
                            </div>
                        </th>
                        <th class="p-4 cursor-pointer hover:bg-gray-600 transition-colors group" data-column="current_flight">
                            <div class="flex items-center justify-between">
                                <span>Current Flight</span>
                                <span class="sort-arrow text-gray-400 group-hover:text-white"></span>
                            </div>
                        </th>
                        <th class="p-4 cursor-pointer hover:bg-gray-600 transition-colors group" data-column="next_flight">
                            <div class="flex items-center justify-between">
                                <span>Next Flight</span>
                                <span class="sort-arrow text-gray-400 group-hover:text-white"></span>
                            </div>
                        </th>
                    </tr>
                </thead>
                <tbody id="planes-table" class="divide-y divide-gray-700"></tbody>
            </table>
        </div>
        
        <!-- Loading State -->
        <div id="loading-state" class="hidden p-8 text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p class="text-gray-400 mt-4">Loading planes...</p>
        </div>

        <!-- Empty State -->
        <div id="empty-state" class="hidden p-8 text-center">
            <svg class="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
            </svg>
            <h3 class="text-lg font-medium text-gray-300 mb-2">No planes found</h3>
            <p class="text-gray-500 mb-4">Get started by adding your first aircraft</p>
            <button id="empty-add-btn" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 transition-colors">
                Add Plane
            </button>
        </div>
    </div>

    <div id="pagination" class="flex justify-center items-center mt-6 space-x-2"></div>

    `;

    // ADD THIS MODAL HTML RIGHT HERE, before the event listeners
    document.body.insertAdjacentHTML('beforeend', `
        <div id="plane-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50 p-4">
            <div class="bg-gray-900 text-white p-6 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-xl font-bold">Add New Plane</h2>
                    <button id="close-plane-modal" class="text-gray-400 hover:text-white transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                <form id="add-plane-form" class="space-y-6">
                    <fieldset class="border border-gray-700 p-4 rounded-lg bg-gray-800">
                        <legend class="font-semibold text-gray-100 px-2">Plane Information</legend>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-1">Tail Number *</label>
                                <input type="text" id="plane-tail-number" placeholder="Enter tail number" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" required>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-1">Model *</label>
                                <input type="text" id="plane-model" placeholder="Enter model" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" required>
                            </div>
                            <div class="md:col-span-2">
                                <label class="block text-sm font-medium text-gray-300 mb-1">Status</label>
                                <select id="plane-status" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                    <option value="available">Available</option>
                                    <option value="in_use">In Use</option>
                                    <option value="maintenance">Maintenance</option>
                                    <option value="unavailable">Unavailable</option>
                                </select>
                            </div>
                        </div>
                    </fieldset>

                    <div class="flex justify-end space-x-3 pt-4 border-t border-gray-700">
                        <button type="button" id="cancel-plane-btn" class="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium">
                            Cancel
                        </button>
                        <button type="submit" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-medium flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            Save Plane
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `);

    await fetchPlanes();

    // NOW set up the event listeners (the modal exists in the DOM)
    document.getElementById("add-plane-btn").addEventListener("click", showPlaneModal);
    document.getElementById("close-plane-modal").addEventListener("click", hidePlaneModal);
    document.getElementById("cancel-plane-btn").addEventListener("click", hidePlaneModal);

    // Submit handler
    document.getElementById("add-plane-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const tailNumber = document.getElementById("plane-tail-number").value;
        const model = document.getElementById("plane-model").value;
        const status = document.getElementById("plane-status").value;

        const { error } = await supabase.from("planes").insert([{
            tail_number: tailNumber,
            model: model,
            status: status
        }]);

        if (!error) {
            hidePlaneModal();
            showToast("Plane added successfully!", "success");
            fetchPlanes();
        } else {
            showToast("Error adding plane: " + error.message, "error");
        }
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

    document.querySelectorAll("th[data-column]").forEach(th => {
        th.addEventListener("click", () => {
            toggleSort(th.getAttribute("data-column"));
        });
    });


    fetchPlanes();
    setTimeout(() => {
        if (typeof initializeCustomPickers === 'function') {
            initializeCustomPickers();
        }
    }, 100);
}


function renderStatus(status) {
    switch (status) {
        case "available":
            return "✅";   // available
        case "in_use":
            return "✈️";   // in flight / in use
        case "maintenance":
            return "🛠️";   // under maintenance
        case "unavailable":
            return "❌";   // grounded / unavailable
        default:
            return "ℹ️";   // fallback
    }
}

function renderTable() {
    let filteredData = planesData.filter(plane => {
        if (!searchState.query) return true;
        const value = (plane[searchState.column] || "").toString().toLowerCase();
        return value.startsWith(searchState.query);
    });

    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const pageData = filteredData.slice(startIndex, startIndex + rowsPerPage);

    const tbody = document.getElementById("planes-table");
    tbody.innerHTML = pageData.map((plane, index) => `
        <tr class="hover:bg-gray-750 transition-colors cursor-pointer group" data-id="${plane.id}">
            <td class="p-4 border-b border-gray-700">
                <div class="flex items-center justify-center">
                    ${renderStatus(plane.status)}
                </div>
            </td>
            <td class="p-4 border-b border-gray-700 font-medium">${plane.tail_number}</td>
            <td class="p-4 border-b border-gray-700">${plane.model}</td>
            <td class="p-4 border-b border-gray-700">${plane.current_flight || '<span class="text-gray-500">-</span>'}</td>
            <td class="p-4 border-b border-gray-700">${plane.next_flight || '<span class="text-gray-500">-</span>'}</td>
        </tr>
    `).join('');

    tbody.querySelectorAll('tr').forEach(row => {
        row.addEventListener('click', () => {
            const planeId = row.getAttribute('data-id');
            loadPlaneMenu(planeId);
        });
    });

    renderPagination(totalPages);
    updateSortArrows();
}

function renderPagination(totalPages) {
    const pagination = document.getElementById("pagination");
    let buttons = "";

    if (currentPage > 1) buttons += `<button class="px-3 py-1 border border-gray-600 rounded bg-gray-700 text-white hover:bg-gray-600" data-page="${currentPage - 1}">Prev</button>`;
    for (let i = 1; i <= totalPages; i++) buttons += `<button class="px-3 py-1 border border-gray-600 rounded ${i === currentPage ? "bg-blue-500 text-white" : "bg-gray-700 text-white hover:bg-gray-600"}" data-page="${i}">${i}</button>`;
    if (currentPage < totalPages) buttons += `<button class="px-3 py-1 border border-gray-600 rounded bg-gray-700 text-white hover:bg-gray-600" data-page="${currentPage + 1}">Next</button>`;

    pagination.innerHTML = buttons;
    pagination.querySelectorAll("button").forEach(btn => {
        btn.addEventListener("click", () => {
            currentPage = parseInt(btn.getAttribute("data-page"));
            renderTable();
        });
    });
}

function toggleSort(column) {
    if (sortState.column !== column) sortState = { column, direction: "asc" };
    else sortState.direction = sortState.direction === "asc" ? "desc" : sortState.direction === "desc" ? "none" : "asc";

    if (sortState.direction === "none") fetchPlanes();
    else {
        planesData.sort((a, b) => {
            if (a[column] < b[column]) return sortState.direction === "asc" ? -1 : 1;
            if (a[column] > b[column]) return sortState.direction === "asc" ? 1 : -1;
            return 0;
        });
        currentPage = 1;
        renderTable();
    }
}

function updateSortArrows() {
    document.querySelectorAll("th[data-column]").forEach(th => {
        const arrow = th.querySelector(".sort-arrow");
        if (sortState.column === th.getAttribute("data-column")) arrow.textContent = sortState.direction === "asc" ? "↑" : sortState.direction === "desc" ? "↓" : "";
        else arrow.textContent = "";
    });
}

async function loadPlaneMenu(planeId) {
    const { data, error } = await supabase.from("planes").select("*").eq("id", planeId).single();
    if (error) {
        showToast("Error loading plane: " + error.message, "error");
        return;
    }

    const p = data;

    // NEW: Fetch recent flight activity for this plane
    const { data: recentFlights, error: flightsError } = await supabase
        .from('flight_logs')
        .select('flight_date, flight_duration, departure_iata, arrival_iata, pilot_name, type_of_flight')
        .eq('plane_id', planeId)
        .order('flight_date', { ascending: false })
        .limit(5);

    // NEW: Fetch maintenance records
    const { data: maintenanceRecords, error: maintenanceError } = await supabase
        .from('maintenance')
        .select('*')
        .eq('plane_id', planeId)
        .order('created_at', { ascending: false })
        .limit(5);

    document.getElementById("main-content").innerHTML = `
        <div class="flex items-center mb-4 cursor-pointer" id="back-to-table">← Go Back</div>
        <div class="text-center mb-6">
            <h1 class="text-3xl font-bold">${p.tail_number}</h1>
            <p class="text-gray-400">${p.model} • ${renderStatus(p.status)} ${p.status.replace('_', ' ').toUpperCase()}</p>
        </div>

        <!-- NEW: Plane Stats Overview -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div class="bg-gray-800 p-4 rounded-xl text-center">
                <div class="text-sm text-gray-400">Total Hours</div>
                <div class="text-2xl font-bold text-blue-400">${p.hours_flown || '0'}</div>
                <div class="text-sm text-gray-400">Hours flown</div>
            </div>
            <div class="bg-gray-800 p-4 rounded-xl text-center">
                <div class="text-sm text-gray-400">Recent Flights</div>
                <div class="text-2xl font-bold text-green-400">${recentFlights ? recentFlights.length : '0'}</div>
                <div class="text-sm text-gray-400">Last 5 flights</div>
            </div>
            <div class="bg-gray-800 p-4 rounded-xl text-center">
                <div class="text-sm text-gray-400">Maintenance</div>
                <div class="text-2xl font-bold ${maintenanceRecords && maintenanceRecords.length > 0 ? 'text-yellow-400' : 'text-green-400'}">
                    ${maintenanceRecords ? maintenanceRecords.length : '0'}
                </div>
                <div class="text-sm text-gray-400">Active records</div>
            </div>
            <div class="bg-gray-800 p-4 rounded-xl text-center">
                <div class="text-sm text-gray-400">Last Service</div>
                <div class="text-2xl font-bold text-purple-400">${p.last_maintenance ? new Date(p.last_maintenance).getFullYear() : 'N/A'}</div>
                <div class="text-sm text-gray-400">Year</div>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Quick Actions -->
            <div class="space-y-4">
                <h2 class="text-xl font-semibold mb-2">Quick Actions</h2>
                <button class="w-full px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-500 text-left flex items-center" id="flight-history-btn">
                    <span class="text-xl mr-3">📊</span>
                    <div>
                        <div class="font-medium">Flight History</div>
                        <div class="text-sm text-blue-200">View all flights for this plane</div>
                    </div>
                </button>
                <button class="w-full px-4 py-3 bg-green-600 text-white rounded hover:bg-green-500 text-left flex items-center" id="future-flights-btn">
                    <span class="text-xl mr-3">📅</span>
                    <div>
                        <div class="font-medium">Future Bookings</div>
                        <div class="text-sm text-green-200">View scheduled flights</div>
                    </div>
                </button>
                <button class="w-full px-4 py-3 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-left flex items-center" id="maintenance-history-btn">
                    <span class="text-xl mr-3">🛠️</span>
                    <div>
                        <div class="font-medium">Maintenance History</div>
                        <div class="text-sm text-yellow-200">View service records</div>
                    </div>
                </button>
                <button class="w-full px-4 py-3 bg-orange-500 text-white rounded hover:bg-orange-600 text-left flex items-center" id="fuel-oil-btn">
                    <span class="text-xl mr-3">⛽</span>
                    <div>
                        <div class="font-medium">Fuel & Oil Logs</div>
                        <div class="text-sm text-orange-200">Track fuel consumption</div>
                    </div>
                </button>
            </div>

            <!-- NEW: Recent Activity -->
            <div class="space-y-4">
                <h2 class="text-xl font-semibold mb-2">Recent Activity</h2>
                
                <!-- Recent Flights -->
                <div class="bg-gray-800 p-4 rounded-xl">
                    <h3 class="font-semibold mb-3 text-gray-200">Recent Flights</h3>
                    <div class="space-y-2 max-h-48 overflow-y-auto">
                        ${recentFlights && recentFlights.length > 0 ?
            recentFlights.map(flight => `
        <div class="flex justify-between items-center p-2 bg-gray-700 rounded">
            <div>
                <div class="font-medium text-sm">${flight.departure_iata} → ${flight.arrival_iata}</div>
                <div class="text-xs text-gray-400">
                    ${new Date(flight.flight_date).toLocaleDateString()} • ${flight.pilot_name}
                </div>
            </div>
            <div class="text-right">
                <div class="text-blue-400 font-bold">${flight.flight_duration}h</div>
                <div class="text-xs text-gray-400">${flight.type_of_flight}</div>
            </div>
        </div>
    `).join('') :
            '<p class="text-gray-400 text-center py-2">No recent flights</p>'
        }
                    </div>
                </div>

                <!-- Maintenance Status -->
                <div class="bg-gray-800 p-4 rounded-xl">
                    <h3 class="font-semibold mb-3 text-gray-200">Maintenance Status</h3>
                    <div class="space-y-2">
                        ${maintenanceRecords && maintenanceRecords.length > 0 ?
            maintenanceRecords.map(record => `
                                <div class="flex justify-between items-center p-2 bg-gray-700 rounded">
                                    <div>
                                        <div class="font-medium text-sm">${record.notes || 'Maintenance'}</div>
                                        <div class="text-xs text-gray-400">
                                            Due at ${record.due_hours} hours
                                        </div>
                                    </div>
                                    <span class="px-2 py-1 rounded text-xs ${record.status === 'Completed' ? 'bg-green-600' : 'bg-yellow-600'}">
                                        ${record.status}
                                    </span>
                                </div>
                            `).join('') :
            '<p class="text-gray-400 text-center py-2">No active maintenance</p>'
        }
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById("back-to-table").addEventListener("click", () => {
        loadPlanesPage();
    });

    // TODO: implement each button functionality
    document.getElementById("flight-history-btn").addEventListener("click", () => {
        loadFlightHistory(planeId);
    });
    document.getElementById("future-flights-btn").addEventListener("click", () => {
        loadFutureBookings(planeId);
    });
    document.getElementById("maintenance-history-btn").addEventListener("click", () => {
        showToast("Maintenance history feature coming soon!", "info");
    });
    document.getElementById("fuel-oil-btn").addEventListener("click", () => {
        showToast("Fuel & oil tracking feature coming soon!", "info");
    });
}

async function loadFutureBookings(planeId) {
    const { data: plane, error: planeError } = await supabase
        .from("planes")
        .select("tail_number, model")
        .eq("id", planeId)
        .single();

    if (planeError) {
        showToast("Error loading plane details: " + planeError.message, "error");
        return;
    }

    // Get current date and time for filtering future bookings
    const now = new Date().toISOString();

    // Fetch future bookings for this plane without complex joins
    const { data: futureBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('plane_id', planeId)
        .gte('start_time', now)
        .order('start_time', { ascending: true });

    if (bookingsError) {
        showToast("Error loading future bookings: " + bookingsError.message, "error");
        return;
    }

    // Fetch related data separately
    let studentsMap = new Map();
    let instructorsMap = new Map();

    if (futureBookings && futureBookings.length > 0) {
        // Get all unique student and instructor IDs
        const studentIds = new Set();
        const instructorIds = new Set();

        futureBookings.forEach(booking => {
            if (booking.student1_id) studentIds.add(booking.student1_id);
            if (booking.student2_id) studentIds.add(booking.student2_id);
            if (booking.student3_id) studentIds.add(booking.student3_id);
            if (booking.instructor_id) instructorIds.add(booking.instructor_id);
        });

        // Fetch students and instructors in parallel
        const [studentsResponse, instructorsResponse] = await Promise.all([
            studentIds.size > 0 ?
                supabase.from('students').select('*').in('id', Array.from(studentIds)) :
                { data: [], error: null },
            instructorIds.size > 0 ?
                supabase.from('instructors').select('*').in('id', Array.from(instructorIds)) :
                { data: [], error: null }
        ]);

        // Create lookup maps
        studentsResponse.data?.forEach(student => {
            studentsMap.set(student.id, student);
        });
        instructorsResponse.data?.forEach(instructor => {
            instructorsMap.set(instructor.id, instructor);
        });
    }

    document.getElementById("main-content").innerHTML = `
        <div class="space-y-6">
            <!-- Header with Back Button -->
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <button class="text-blue-400 hover:text-blue-300 flex items-center" id="back-to-plane-menu">
                        ← Back to ${plane.tail_number}
                    </button>
                    <div class="h-6 border-l border-gray-600"></div>
                    <h1 class="text-2xl font-bold">Future Bookings - ${plane.tail_number}</h1>
                    <span class="text-gray-400">${plane.model}</span>
                </div>
                <div class="text-sm text-gray-400">
                    ${futureBookings ? futureBookings.length : 0} upcoming bookings
                </div>
            </div>

            <!-- Statistics Summary -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="bg-gray-800 p-4 rounded-xl text-center">
                    <div class="text-2xl font-bold text-blue-400">
                        ${futureBookings ? futureBookings.filter(b => isToday(new Date(b.start_time))).length : '0'}
                    </div>
                    <div class="text-sm text-gray-400">Today</div>
                </div>
                <div class="bg-gray-800 p-4 rounded-xl text-center">
                    <div class="text-2xl font-bold text-green-400">
                        ${futureBookings ? futureBookings.filter(b => isThisWeek(new Date(b.start_time))).length : '0'}
                    </div>
                    <div class="text-sm text-gray-400">This Week</div>
                </div>
                <div class="bg-gray-800 p-4 rounded-xl text-center">
                    <div class="text-2xl font-bold text-yellow-400">
                        ${futureBookings ? futureBookings.filter(b => isNextWeek(new Date(b.start_time))).length : '0'}
                    </div>
                    <div class="text-sm text-gray-400">Next Week</div>
                </div>
                <div class="bg-gray-800 p-4 rounded-xl text-center">
                    <div class="text-2xl font-bold text-purple-400">
                        ${futureBookings ? getUniqueStudentsCount(futureBookings) : '0'}
                    </div>
                    <div class="text-sm text-gray-400">Unique Students</div>
                </div>
            </div>

            <!-- Calendar View Toggle -->
            <div class="flex justify-center space-x-4">
                <button class="px-4 py-2 bg-blue-600 text-white rounded" id="list-view-btn">List View</button>
                <button class="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600" id="calendar-view-btn">Calendar View</button>
            </div>

            <!-- List View -->
            <div id="list-view" class="space-y-4">
                <div class="bg-gray-800 rounded-xl overflow-hidden">
                    <div class="p-4 border-b border-gray-700">
                        <h2 class="text-lg font-semibold">Upcoming Bookings</h2>
                    </div>
                    <div class="overflow-x-auto">
                        ${futureBookings && futureBookings.length > 0 ? `
                            <table class="min-w-full">
                                <thead class="bg-gray-700">
                                    <tr>
                                        <th class="p-3 text-left text-sm font-semibold">Date & Time</th>
                                        <th class="p-3 text-left text-sm font-semibold">Duration</th>
                                        <th class="p-3 text-left text-sm font-semibold">Students</th>
                                        <th class="p-3 text-left text-sm font-semibold">Instructor</th>
                                        <th class="p-3 text-left text-sm font-semibold">Description</th>
                                        <th class="p-3 text-left text-sm font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-700">
                                    ${futureBookings.map(booking => {
        const startTime = new Date(booking.start_time);
        const endTime = new Date(booking.end_time);
        const duration = (endTime - startTime) / (1000 * 60 * 60); // hours
        const studentNames = getStudentNamesFromMap(booking, studentsMap);
        const instructor = booking.instructor_id ? instructorsMap.get(booking.instructor_id) : null;
        const instructorName = instructor ?
            `${instructor.first_name} ${instructor.last_name}` :
            'No instructor';

        return `
                                            <tr class="hover:bg-gray-750">
                                                <td class="p-3">
                                                    <div class="font-medium">${startTime.toLocaleDateString()}</div>
                                                    <div class="text-sm text-gray-400">
                                                        ${booking.start_time.split('T')[1].substring(0, 5)} - 
                                                        ${booking.end_time.split('T')[1].substring(0, 5)}
                                                    </div>
                                                </td>
                                                <td class="p-3">
                                                    <div class="font-bold">${duration.toFixed(1)}h</div>
                                                </td>
                                                <td class="p-3">
                                                    <div class="space-y-1">
                                                        ${studentNames.map(name =>
            `<div class="text-sm">${name}</div>`
        ).join('')}
                                                    </div>
                                                </td>
                                                <td class="p-3">
                                                    ${instructorName}
                                                </td>
                                                <td class="p-3">
                                                    <div class="text-sm">${booking.description || 'No description'}</div>
                                                </td>
                                                <td class="p-3">
                                                    <div class="flex space-x-2">
                                                        <button class="text-blue-400 hover:text-blue-300 text-sm edit-booking" 
                                                                data-id="${booking.id}">
                                                            Edit
                                                        </button>
                                                        <button class="text-red-400 hover:text-red-300 text-sm cancel-booking" 
                                                                data-id="${booking.id}">
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        `;
    }).join('')}
                                </tbody>
                            </table>
                        ` : `
                            <div class="p-8 text-center text-gray-400">
                                <div class="text-4xl mb-4">📅</div>
                                <div class="text-lg mb-2">No upcoming bookings</div>
                                <div class="text-sm">This aircraft has no scheduled future flights</div>
                            </div>
                        `}
                    </div>
                </div>
            </div>

            <!-- Calendar View (Hidden by Default) -->
            <div id="calendar-view" class="hidden">
                <div class="bg-gray-800 rounded-xl p-4">
                    <h2 class="text-lg font-semibold mb-4">Calendar View</h2>
                    <div id="calendar-container" class="grid grid-cols-7 gap-2">
                        <!-- Calendar will be populated by JavaScript -->
                    </div>
                </div>
            </div>

            <!-- Quick Actions -->
            <div class="flex justify-end space-x-3">
                <button class="px-4 py-2 bg-green-600 hover:bg-green-500 rounded flex items-center space-x-2" id="add-booking-btn">
                    <span>➕</span>
                    <span>Add New Booking</span>
                </button>
                <button class="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded flex items-center space-x-2" id="export-schedule">
                    <span>📥</span>
                    <span>Export Schedule</span>
                </button>
            </div>
        </div>
    `;

    // Back button event
    document.getElementById("back-to-plane-menu").addEventListener("click", () => {
        loadPlaneMenu(planeId);
    });

    // View toggle events
    document.getElementById("list-view-btn").addEventListener("click", () => {
        document.getElementById("list-view").classList.remove("hidden");
        document.getElementById("calendar-view").classList.add("hidden");
        document.getElementById("list-view-btn").classList.add("bg-blue-600");
        document.getElementById("list-view-btn").classList.remove("bg-gray-700");
        document.getElementById("calendar-view-btn").classList.remove("bg-blue-600");
        document.getElementById("calendar-view-btn").classList.add("bg-gray-700");
    });

    document.getElementById("calendar-view-btn").addEventListener("click", () => {
        document.getElementById("list-view").classList.add("hidden");
        document.getElementById("calendar-view").classList.remove("hidden");
        document.getElementById("calendar-view-btn").classList.add("bg-blue-600");
        document.getElementById("calendar-view-btn").classList.remove("bg-gray-700");
        document.getElementById("list-view-btn").classList.remove("bg-blue-600");
        document.getElementById("list-view-btn").classList.add("bg-gray-700");
        renderCalendarView(futureBookings, plane, studentsMap);
    });

    // Action buttons
    document.getElementById("add-booking-btn").addEventListener("click", () => {
        showToast("Add booking functionality to be implemented", "info");
    });

    document.getElementById("export-schedule").addEventListener("click", () => {
        exportScheduleToCSV(futureBookings, plane, studentsMap, instructorsMap);
    });

    // Edit and Cancel booking buttons
    document.querySelectorAll('.edit-booking').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const bookingId = e.target.getAttribute('data-id');
            editBooking(bookingId);
        });
    });

    document.querySelectorAll('.cancel-booking').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const bookingId = e.target.getAttribute('data-id');
            cancelBooking(bookingId, planeId);
        });
    });
}

async function loadFlightHistory(planeId) {
    const { data: plane, error: planeError } = await supabase
        .from("planes")
        .select("tail_number, model")
        .eq("id", planeId)
        .single();

    if (planeError) {
        showToast("Error loading plane details: " + planeError.message, "error");
        return;
    }

    // Fetch flight history without joins (since foreign keys don't exist)
    const { data: flightHistory, error: flightsError } = await supabase
        .from('flight_logs')
        .select('*')
        .eq('plane_id', planeId)
        .order('flight_date', { ascending: false });

    if (flightsError) {
        showToast("Error loading flight history: " + flightsError.message, "error");
        return;
    }

    // If you need student/instructor details, fetch them separately
    let studentsMap = new Map();
    let instructorsMap = new Map();

    if (flightHistory && flightHistory.length > 0) {
        // Get unique student and instructor UUIDs from flight logs
        const studentUuids = [...new Set(flightHistory.map(f => f.pilot_uuid).filter(Boolean))];
        const instructorUuids = [...new Set(flightHistory.map(f => f.instructor_uuid).filter(Boolean))];

        // Fetch students and instructors in parallel
        const [studentsResponse, instructorsResponse] = await Promise.all([
            studentUuids.length > 0 ?
                supabase.from('students').select('*').in('id', studentUuids) :
                { data: [], error: null },
            instructorUuids.length > 0 ?
                supabase.from('instructors').select('*').in('id', instructorUuids) :
                { data: [], error: null }
        ]);

        // Create lookup maps
        studentsResponse.data?.forEach(student => {
            studentsMap.set(student.id, student);
        });
        instructorsResponse.data?.forEach(instructor => {
            instructorsMap.set(instructor.id, instructor);
        });
    }

    document.getElementById("main-content").innerHTML = `
        <div class="space-y-6">
            <!-- Header with Back Button -->
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <button class="text-blue-400 hover:text-blue-300 flex items-center" id="back-to-plane-menu">
                        ← Back to ${plane.tail_number}
                    </button>
                    <div class="h-6 border-l border-gray-600"></div>
                    <h1 class="text-2xl font-bold">Flight History - ${plane.tail_number}</h1>
                    <span class="text-gray-400">${plane.model}</span>
                </div>
                <div class="text-sm text-gray-400">
                    ${flightHistory ? flightHistory.length : 0} total flights
                </div>
            </div>

            <!-- Statistics Summary -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="bg-gray-800 p-4 rounded-xl text-center">
                    <div class="text-2xl font-bold text-blue-400">
                        ${flightHistory ? flightHistory.reduce((total, flight) => total + (flight.flight_duration || 0), 0).toFixed(1) : '0'}
                    </div>
                    <div class="text-sm text-gray-400">Total Hours</div>
                </div>
                <div class="bg-gray-800 p-4 rounded-xl text-center">
                    <div class="text-2xl font-bold text-green-400">
                        ${flightHistory ? flightHistory.filter(f => f.type_of_flight === 'Training').length : '0'}
                    </div>
                    <div class="text-sm text-gray-400">Training Flights</div>
                </div>
                <div class="bg-gray-800 p-4 rounded-xl text-center">
                    <div class="text-2xl font-bold text-yellow-400">
                        ${flightHistory ? flightHistory.filter(f => f.type_of_flight === 'Solo').length : '0'}
                    </div>
                    <div class="text-sm text-gray-400">Solo Flights</div>
                </div>
                <div class="bg-gray-800 p-4 rounded-xl text-center">
                    <div class="text-2xl font-bold text-purple-400">
                        ${flightHistory ? [...new Set(flightHistory.map(f => f.pilot_name))].length : '0'}
                    </div>
                    <div class="text-sm text-gray-400">Unique Pilots</div>
                </div>
            </div>

            <!-- Flight History Table -->
            <div class="bg-gray-800 rounded-xl overflow-hidden">
                <div class="p-4 border-b border-gray-700">
                    <h2 class="text-lg font-semibold">All Flights</h2>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full">
                        <thead class="bg-gray-700">
                            <tr>
                                <th class="p-3 text-left text-sm font-semibold">Date</th>
                                <th class="p-3 text-left text-sm font-semibold">Pilot</th>
                                <th class="p-3 text-left text-sm font-semibold">Route</th>
                                <th class="p-3 text-left text-sm font-semibold">Type</th>
                                <th class="p-3 text-left text-sm font-semibold">Duration</th>
                                <th class="p-3 text-left text-sm font-semibold">Instructor</th>
                                <th class="p-3 text-left text-sm font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-700">
                            ${flightHistory && flightHistory.length > 0 ?
            flightHistory.map(flight => {
                const student = studentsMap.get(flight.pilot_uuid);
                const instructor = instructorsMap.get(flight.instructor_uuid);

                return `
                                    <tr class="hover:bg-gray-750">
                                        <td class="p-3">${new Date(flight.flight_date).toLocaleDateString()}</td>
                                        <td class="p-3">
                                            <div class="font-medium">${flight.pilot_name}</div>
                                            ${student ?
                        `<div class="text-xs text-gray-400">Student</div>` :
                        `<div class="text-xs text-gray-400">Pilot</div>`
                    }
                                        </td>
                                        <td class="p-3">
                                            <div class="font-mono">${flight.departure_iata} → ${flight.arrival_iata}</div>
                                            <div class="text-xs text-gray-400">${flight.departure_time} - ${flight.arrival_time}</div>
                                        </td>
                                        <td class="p-3">
                                            <span class="px-2 py-1 rounded text-xs ${flight.type_of_flight === 'Training' ? 'bg-blue-600' :
                        flight.type_of_flight === 'Solo' ? 'bg-green-600' :
                            flight.type_of_flight === 'Cross Country' ? 'bg-orange-600' :
                                'bg-gray-600'
                    }">
                                                ${flight.type_of_flight}
                                            </span>
                                        </td>
                                        <td class="p-3">
                                            <div class="font-bold">${flight.flight_duration}h</div>
                                            <div class="text-xs text-gray-400">
                                                ${flight.hour_meter_departure} → ${flight.hour_meter_arrival}
                                            </div>
                                        </td>
                                        <td class="p-3">
                                            ${instructor ? `${instructor.first_name} ${instructor.last_name}` : (flight.instructor_name || 'N/A')}
                                        </td>
                                        <td class="p-3">
                                            <button class="text-blue-400 hover:text-blue-300 text-sm view-flight-details" 
                                                    data-id="${flight.id}">
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                `}).join('') :
            `<tr>
                                    <td colspan="7" class="p-8 text-center text-gray-400">
                                        No flight history found for this aircraft
                                    </td>
                                </tr>`
        }
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Export Options -->
            <div class="flex justify-end space-x-3">
                <button class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded flex items-center space-x-2" id="export-csv">
                    <span>📥</span>
                    <span>Export CSV</span>
                </button>
                <button class="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded flex items-center space-x-2" id="print-report">
                    <span>🖨️</span>
                    <span>Print Report</span>
                </button>
            </div>
        </div>
    `;

    // Back button event
    document.getElementById("back-to-plane-menu").addEventListener("click", () => {
        loadPlaneMenu(planeId);
    });

    // View flight details
    document.querySelectorAll('.view-flight-details').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const flightId = e.target.getAttribute('data-id');
            viewFlightDetails(flightId);
        });
    });

    // Export functionality
    document.getElementById('export-csv').addEventListener('click', () => {
        exportFlightHistoryToCSV(flightHistory, plane);
    });

    document.getElementById('print-report').addEventListener('click', () => {
        window.print();
    });
}

function viewFlightDetails(flightId) {
    // You can implement a detailed flight view modal here
    // For now, show a simple alert with basic info
    showToast(`Flight details view for ID: ${flightId} - To be implemented`, 'info');
}

function exportFlightHistoryToCSV(flightHistory, plane) {
    if (!flightHistory || flightHistory.length === 0) {
        showToast('No flight data to export', 'error');
        return;
    }

    const headers = ['Date', 'Pilot', 'Departure', 'Arrival', 'Duration', 'Type', 'Instructor', 'Remarks'];
    const csvData = flightHistory.map(flight => [
        new Date(flight.flight_date).toLocaleDateString(),
        flight.pilot_name,
        flight.departure_iata,
        flight.arrival_iata,
        flight.flight_duration,
        flight.type_of_flight,
        flight.instructor_name || 'N/A',
        flight.remarks || ''
    ]);

    const csvContent = [headers, ...csvData]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flight-history-${plane.tail_number}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showToast('Flight history exported successfully!', 'success');
}

function showToast(message, type = "success") {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        container.className = "fixed top-4 right-4 z-50 space-y-2";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `px-4 py-2 rounded shadow text-white animate-fade-in 
        ${type === "success" ? "bg-green-500" :
            type === "error" ? "bg-red-500" :
                type === "info" ? "bg-blue-500" : "bg-gray-500"}`;
    toast.innerText = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("animate-fade-out");
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// Helper functions for date calculations
function isToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
}

function isThisWeek(date) {
    const today = new Date();
    // Get Monday of this week (set to Monday)
    const startOfWeek = new Date(today);
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    // Get Sunday of this week
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return date >= startOfWeek && date <= endOfWeek;
}

function isNextWeek(date) {
    const today = new Date();
    // Get Monday of next week
    const startOfNextWeek = new Date(today);
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1) + 7; // this Monday + 7 days
    startOfNextWeek.setDate(diff);
    startOfNextWeek.setHours(0, 0, 0, 0);

    // Get Sunday of next week
    const endOfNextWeek = new Date(startOfNextWeek);
    endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);
    endOfNextWeek.setHours(23, 59, 59, 999);

    return date >= startOfNextWeek && date <= endOfNextWeek;
}

function getUniqueStudentsCount(bookings) {
    const studentIds = new Set();
    bookings.forEach(booking => {
        if (booking.student1_id) studentIds.add(booking.student1_id);
        if (booking.student2_id) studentIds.add(booking.student2_id);
        if (booking.student3_id) studentIds.add(booking.student3_id);
    });
    return studentIds.size;
}

function getStudentNames(booking) {
    const names = [];
    if (booking.students && booking.students.first_name) {
        names.push(`${booking.students.first_name} ${booking.students.last_name}`);
    }
    // Note: For student2 and student3, you'd need to handle the array structure
    // This is simplified - you might need to adjust based on your actual data structure
    return names.length > 0 ? names : ['No students assigned'];
}



function editBooking(bookingId) {
    showToast(`Edit booking ${bookingId} - To be implemented`, 'info');
}

function getStudentNamesFromMap(booking, studentsMap) {
    const names = [];
    if (booking.student1_id) {
        const student = studentsMap.get(booking.student1_id);
        if (student) names.push(`${student.first_name} ${student.last_name}`);
    }
    if (booking.student2_id) {
        const student = studentsMap.get(booking.student2_id);
        if (student) names.push(`${student.first_name} ${student.last_name}`);
    }
    if (booking.student3_id) {
        const student = studentsMap.get(booking.student3_id);
        if (student) names.push(`${student.first_name} ${student.last_name}`);
    }
    return names.length > 0 ? names : ['No students assigned'];
}

function renderCalendarView(bookings, plane, studentsMap) {
    const container = document.getElementById('calendar-container');
    if (!container) return;

    // Simple calendar implementation starting on Monday
    const today = new Date();
    const month = today.getMonth();
    const year = today.getFullYear();

    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    let calendarHTML = '';

    // Day headers starting with Monday
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    dayNames.forEach(day => {
        calendarHTML += `<div class="text-center font-semibold p-2 bg-gray-700">${day}</div>`;
    });

    // Adjust first day: 0=Sunday, 1=Monday, etc. Convert to Monday-start (0=Monday, 6=Sunday)
    let firstDayAdjusted = firstDay.getDay() - 1;
    if (firstDayAdjusted < 0) firstDayAdjusted = 6; // If Sunday (0-1=-1), make it 6

    // Empty cells for days before the first day of month (Monday-start)
    for (let i = 0; i < firstDayAdjusted; i++) {
        calendarHTML += `<div class="h-24 bg-gray-900 border border-gray-700"></div>`;
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month, day);
        const dayBookings = bookings ? bookings.filter(booking => {
            const bookingDate = new Date(booking.start_time);
            return bookingDate.getDate() === day &&
                bookingDate.getMonth() === month &&
                bookingDate.getFullYear() === year;
        }) : [];

        const isTodayDate = isToday(currentDate);

        calendarHTML += `
            <div class="h-24 bg-gray-900 border border-gray-700 p-1 overflow-y-auto ${isTodayDate ? 'border-2 border-blue-500' : ''}">
                <div class="text-sm font-semibold ${isTodayDate ? 'text-blue-400' : ''}">${day}</div>
                <div class="space-y-1 mt-1">
                    ${dayBookings.map(booking => {
            const startTime = new Date(booking.start_time);
            const students = getStudentNamesFromMap(booking, studentsMap);
            return `
                            <div class="text-xs bg-blue-600 rounded p-1 cursor-pointer hover:bg-blue-500" 
                                 title="${students.join(', ')} - ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}">
                                <div class="truncate">${students[0] || 'Booking'}</div>
                                <div class="text-blue-200">${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;
    }

    container.innerHTML = calendarHTML;
}

async function cancelBooking(bookingId, planeId) {
    if (confirm('Are you sure you want to cancel this booking?')) {
        const { error } = await supabase
            .from('bookings')
            .delete()
            .eq('id', bookingId);

        if (error) {
            showToast('Error cancelling booking: ' + error.message, 'error');
        } else {
            showToast('Booking cancelled successfully!', 'success');
            // Refresh the current view
            loadFutureBookings(planeId);
        }
    }
}

function exportScheduleToCSV(bookings, plane, studentsMap, instructorsMap) {
    if (!bookings || bookings.length === 0) {
        showToast('No booking data to export', 'error');
        return;
    }

    const headers = ['Date', 'Start Time', 'End Time', 'Duration', 'Students', 'Instructor', 'Description'];
    const csvData = bookings.map(booking => {
        const startTime = new Date(booking.start_time);
        const endTime = new Date(booking.end_time);
        const duration = (endTime - startTime) / (1000 * 60 * 60);
        const studentNames = getStudentNamesFromMap(booking, studentsMap);
        const instructor = booking.instructor_id ? instructorsMap.get(booking.instructor_id) : null;
        const instructorName = instructor ?
            `${instructor.first_name} ${instructor.last_name}` :
            'No instructor';

        return [
            startTime.toLocaleDateString(),
            startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            duration.toFixed(1),
            studentNames.join(', '),
            instructorName,
            booking.description || ''
        ];
    });

    const csvContent = [headers, ...csvData]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schedule-${plane.tail_number}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showToast('Schedule exported successfully!', 'success');
}

function showLoading(show) {
    const loading = document.getElementById("loading-state");
    const table = document.getElementById("planes-table");
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

// Update your fetchPlanes function to use loading states
async function fetchPlanes() {
    showLoading(true);
    const { data, error } = await supabase.from("planes").select("*");
    if (!error) {
        planesData = data;
        renderTable();
    } else {
        console.error('Error fetching planes:', error);
        showToast('Error loading planes: ' + error.message, 'error');
    }
    showLoading(false);
}

function showPlaneModal() {
    document.getElementById("plane-modal").classList.remove("hidden");
    document.getElementById("plane-tail-number").focus();
}

function hidePlaneModal() {
    document.getElementById("plane-modal").classList.add("hidden");
    document.getElementById("add-plane-form").reset();
}