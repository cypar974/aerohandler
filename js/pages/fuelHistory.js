import { supabase } from "../supabase.js";
import { showToast } from "../components/showToast.js";
import { loadPlanesPage } from "./planes.js";
import { Autocomplete } from "../components/autocomplete.js";

let allFuelLogs = [];
let currentFilter = "";

export async function loadFuelHistoryPage() {
    document.getElementById("main-content").innerHTML = `
        <div class="flex flex-col space-y-6">
            <div class="flex items-center justify-between">
                <div>
                    <button id="back-to-planes" class="text-blue-400 hover:text-blue-300 flex items-center mb-2 transition-colors">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                        Back to Planes
                    </button>
                    <h1 class="text-3xl font-bold text-white">Fuel History</h1>
                    <p class="text-gray-400">Global fuel consumption analytics and logs</p>
                </div>
                <div class="flex gap-2">
                    <button id="refresh-data" class="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 text-white transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-4 gap-4" id="stats-container">
                <div class="bg-gray-800 p-4 rounded-xl border border-gray-700 animate-pulse">
                    <div class="h-16 bg-gray-700 rounded"></div>
                </div>
            </div>

            <div class="flex flex-col md:flex-row gap-4 bg-gray-800 p-4 rounded-xl border border-gray-700">
                <div class="flex-1">
                    <label class="block text-xs text-gray-400 mb-1">Search Aircraft</label>
                    <input type="text" id="search-tail" placeholder="Search Tail Number..." class="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:ring-2 focus:ring-orange-500 outline-none">
                </div>
                <div class="flex-1">
                    <label class="block text-xs text-gray-400 mb-1">Filter by Type</label>
                    <select id="filter-type" class="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:ring-2 focus:ring-orange-500 outline-none">
                        <option value="">All Fuel Types</option>
                        <option value="100LL">100LL</option>
                        <option value="Jet-A">Jet-A</option>
                        <option value="MoGas">MoGas</option>
                    </select>
                </div>
            </div>

            <div class="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-gray-300">
                        <thead class="bg-gray-750 text-xs uppercase text-gray-400 bg-gray-900">
                            <tr>
                                <th class="px-6 py-4">Date</th>
                                <th class="px-6 py-4">Aircraft</th>
                                <th class="px-6 py-4">Type</th>
                                <th class="px-6 py-4">Amount</th>
                                <th class="px-6 py-4">Cost</th>
                                <th class="px-6 py-4">Location</th>
                                <th class="px-6 py-4">Logged By</th>
                            </tr>
                        </thead>
                        <tbody id="fuel-table-body" class="divide-y divide-gray-700">
                            <tr><td colspan="7" class="p-8 text-center">Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    document.getElementById("back-to-planes").addEventListener("click", loadPlanesPage);
    document.getElementById("refresh-data").addEventListener("click", fetchData);

    document.getElementById("filter-type").addEventListener("change", (e) => {
        filterData(document.getElementById("search-tail").value, e.target.value);
    });

    await fetchData();
}

async function fetchData() {
    try {
        const { data, error } = await supabase
            .from('fuel_oil_logs')
            .select(`
                *,
                planes (tail_number),
                users (person_id)
            `)
            .neq('fuel_type', 'Oil')
            .order('log_date', { ascending: false });

        if (error) throw error;

        allFuelLogs = data;
        renderStats();
        renderTable(allFuelLogs);

        // --- NEW AUTOCOMPLETE LOGIC START ---
        // 1. Extract unique aircraft from the logs to create a data source
        const uniquePlanesMap = new Map();

        allFuelLogs.forEach(log => {
            const tail = log.planes?.tail_number;
            if (tail && !uniquePlanesMap.has(tail)) {
                uniquePlanesMap.set(tail, {
                    id: tail,       // Use tail as ID for filtering
                    name: tail,     // Display the tail number
                    type: null      // Null type ensures no "User" label appears in dropdown
                });
            }
        });

        const planeDataSource = Array.from(uniquePlanesMap.values());

        // 2. Initialize Autocomplete on the search input
        const inputElement = document.getElementById("search-tail");

        // Remove old listeners to prevent duplicates if fetchData is called again
        const newElement = inputElement.cloneNode(true);
        inputElement.parentNode.replaceChild(newElement, inputElement);

        new Autocomplete({
            inputElement: newElement,
            dataSource: planeDataSource,
            displayField: 'name',
            valueField: 'id',
            additionalFields: [],
            placeholder: 'Search Tail Number...',
            onSelect: (selected) => {
                // Filter by the selected tail number
                filterData(selected.value, document.getElementById("filter-type").value);
            },
            onInput: (query) => {
                // Filter as user types (or clears input)
                filterData(query, document.getElementById("filter-type").value);
            }
        });
        // --- NEW AUTOCOMPLETE LOGIC END ---

    } catch (err) {
        console.error("Error fetching fuel logs:", err);
        showToast("Failed to load fuel history", "error");
    }
}

function renderStats() {
    const totalGallons = allFuelLogs.reduce((acc, log) => acc + (Number(log.amount) || 0), 0);
    const totalCost = allFuelLogs.reduce((acc, log) => acc + (Number(log.total_cost) || 0), 0);
    const avgPrice = totalGallons > 0 ? (totalCost / totalGallons) : 0;
    const entries = allFuelLogs.length;

    document.getElementById("stats-container").innerHTML = `
        <div class="bg-gray-800 p-4 rounded-xl border border-gray-700">
            <div class="text-sm text-gray-400">Total Fuel Added</div>
            <div class="text-2xl font-bold text-orange-500">${totalGallons.toFixed(1)} <span class="text-sm text-gray-500">gal</span></div>
        </div>
        <div class="bg-gray-800 p-4 rounded-xl border border-gray-700">
            <div class="text-sm text-gray-400">Total Expenditure</div>
            <div class="text-2xl font-bold text-green-500">$${totalCost.toFixed(2)}</div>
        </div>
        <div class="bg-gray-800 p-4 rounded-xl border border-gray-700">
            <div class="text-sm text-gray-400">Avg. Cost/Gal</div>
            <div class="text-2xl font-bold text-blue-500">$${avgPrice.toFixed(2)}</div>
        </div>
        <div class="bg-gray-800 p-4 rounded-xl border border-gray-700">
            <div class="text-sm text-gray-400">Total Entries</div>
            <div class="text-2xl font-bold text-gray-300">${entries}</div>
        </div>
    `;
}

function renderTable(data) {
    const tbody = document.getElementById("fuel-table-body");

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-gray-500">No fuel records found.</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(log => `
        <tr class="hover:bg-gray-750 transition-colors">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${new Date(log.log_date).toLocaleDateString()}</td>
            <td class="px-6 py-4 whitespace-nowrap font-mono text-orange-400">${log.planes?.tail_number || 'Unknown'}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 py-1 rounded text-xs bg-gray-700 border border-gray-600 text-gray-300">${log.fuel_type}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-white font-medium">${Number(log.amount).toFixed(1)} gal</td>
            <td class="px-6 py-4 whitespace-nowrap text-green-400">$${Number(log.total_cost).toFixed(2)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-gray-400">${log.location || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-gray-500 text-xs">ID: ${log.added_by?.substring(0, 8) || 'System'}</td>
        </tr>
    `).join('');
}

function filterData(query, type) {
    const lowerQuery = query.toLowerCase();
    const filtered = allFuelLogs.filter(log => {
        const matchesTail = (log.planes?.tail_number || "").toLowerCase().includes(lowerQuery);
        const matchesType = type === "" || log.fuel_type === type;
        return matchesTail && matchesType;
    });
    renderTable(filtered);
}