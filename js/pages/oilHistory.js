import { supabase } from "../supabase.js";
import { showToast } from "../components/showToast.js";
import { loadPlanesPage } from "./planes.js";
import { Autocomplete } from "../components/autocomplete.js";

let allOilLogs = [];

export async function loadOilHistoryPage() {
    document.getElementById("main-content").innerHTML = `
        <div class="flex flex-col space-y-6">
            <div class="flex items-center justify-between">
                <div>
                    <button id="back-to-planes" class="text-blue-400 hover:text-blue-300 flex items-center mb-2 transition-colors">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                        Back to Planes
                    </button>
                    <h1 class="text-3xl font-bold text-white">Oil Consumption History</h1>
                    <p class="text-gray-400">Track oil top-ups and maintenance consumption</p>
                </div>
                <div class="flex gap-2">
                    <button id="refresh-data" class="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 text-white transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4" id="stats-container">
                </div>

            <div class="bg-gray-800 p-4 rounded-xl border border-gray-700">
                <label class="block text-xs text-gray-400 mb-1">Search Aircraft</label>
                <input type="text" id="search-tail" placeholder="Search Tail Number..." class="w-full md:w-1/3 bg-gray-900 border border-gray-600 rounded p-2 text-white focus:ring-2 focus:ring-yellow-500 outline-none">
            </div>

            <div class="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-gray-300">
                        <thead class="bg-gray-750 text-xs uppercase text-gray-400 bg-gray-900">
                            <tr>
                                <th class="px-6 py-4">Date</th>
                                <th class="px-6 py-4">Aircraft</th>
                                <th class="px-6 py-4">Amount Added</th>
                                <th class="px-6 py-4">Cost</th>
                                <th class="px-6 py-4">Location</th>
                                <th class="px-6 py-4">Notes</th>
                            </tr>
                        </thead>
                        <tbody id="oil-table-body" class="divide-y divide-gray-700">
                            <tr><td colspan="6" class="p-8 text-center">Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    document.getElementById("back-to-planes").addEventListener("click", loadPlanesPage);
    document.getElementById("refresh-data").addEventListener("click", fetchData);

    await fetchData();
}

async function fetchData() {
    try {
        const { data, error } = await supabase
            .from('fuel_oil_logs')
            .select(`
                *,
                planes (tail_number)
            `)
            .eq('fuel_type', 'Oil')
            .order('log_date', { ascending: false });

        if (error) throw error;

        allOilLogs = data;
        renderStats();
        renderTable(allOilLogs);

        // --- NEW AUTOCOMPLETE LOGIC START ---
        // 1. Extract unique aircraft
        const uniquePlanesMap = new Map();

        allOilLogs.forEach(log => {
            const tail = log.planes?.tail_number;
            if (tail && !uniquePlanesMap.has(tail)) {
                uniquePlanesMap.set(tail, {
                    id: tail,
                    name: tail,
                    type: null
                });
            }
        });

        const planeDataSource = Array.from(uniquePlanesMap.values());

        // 2. Initialize Autocomplete
        const inputElement = document.getElementById("search-tail");

        // Clone to clear previous event listeners
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
                filterData(selected.value);
            },
            onInput: (query) => {
                filterData(query);
            }
        });
        // --- NEW AUTOCOMPLETE LOGIC END ---

    } catch (err) {
        console.error("Error fetching oil logs:", err);
        showToast("Failed to load oil history", "error");
    }
}

function renderStats() {
    const totalQuarts = allOilLogs.reduce((acc, log) => acc + (Number(log.amount) || 0), 0);
    const totalCost = allOilLogs.reduce((acc, log) => acc + (Number(log.total_cost) || 0), 0);
    const entries = allOilLogs.length;

    document.getElementById("stats-container").innerHTML = `
        <div class="bg-gray-800 p-4 rounded-xl border border-gray-700 border-l-4 border-l-yellow-500">
            <div class="text-sm text-gray-400">Total Oil Added</div>
            <div class="text-2xl font-bold text-white">${totalQuarts.toFixed(1)} <span class="text-sm text-gray-500">qts</span></div>
        </div>
        <div class="bg-gray-800 p-4 rounded-xl border border-gray-700">
            <div class="text-sm text-gray-400">Total Cost</div>
            <div class="text-2xl font-bold text-green-500">$${totalCost.toFixed(2)}</div>
        </div>
        <div class="bg-gray-800 p-4 rounded-xl border border-gray-700">
            <div class="text-sm text-gray-400">Total Top-ups</div>
            <div class="text-2xl font-bold text-gray-300">${entries}</div>
        </div>
    `;
}

function renderTable(data) {
    const tbody = document.getElementById("oil-table-body");

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-gray-500">No oil records found.</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(log => `
        <tr class="hover:bg-gray-750 transition-colors">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${new Date(log.log_date).toLocaleDateString()}</td>
            <td class="px-6 py-4 whitespace-nowrap font-mono text-yellow-400">${log.planes?.tail_number || 'Unknown'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-white font-bold">${Number(log.amount).toFixed(1)} qts</td>
            <td class="px-6 py-4 whitespace-nowrap text-green-400">$${Number(log.total_cost).toFixed(2)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-gray-400">${log.location || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-gray-500 text-sm truncate max-w-xs">
                 ${log.added_by ? 'Logged by User' : 'System Entry'}
            </td>
        </tr>
    `).join('');
}

function filterData(query) {
    const lowerQuery = query.toLowerCase();
    const filtered = allOilLogs.filter(log => {
        return (log.planes?.tail_number || "").toLowerCase().includes(lowerQuery);
    });
    renderTable(filtered);
}