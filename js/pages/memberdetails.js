import { supabase } from "../supabase.js";
import { showToast } from "../components/showToast.js";
import { FlightDetailsModal } from "../modals/FlightDetailsModal.js";
import { SettleDebtModal } from "../modals/SettleDebtModal.js";
import { AddFlightLogModal } from "../modals/AddFlightLogModal.js";
import { AddBookingModal } from "../modals/AddBookingModal.js";

let currentMemberId = null;
let currentMemberType = null;
let previousPageState = null;
let returnToPage = 'members';
let flightDetailsModal = new FlightDetailsModal();
let settleDebtModal = null;
let addFlightModal = null;
let addBookingModal = null;

const MEMBER_CONFIG = {
    'regular_pilot': {
        label: 'Regular Pilot',
        color: 'blue',
        icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        fetchRpc: 'get_regular_pilot_by_id',
        canFly: true
    },
    'maintenance_technician': {
        label: 'Maintenance Tech',
        color: 'slate',
        icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
        fetchRpc: 'get_maintenance_technician_by_id',
        canFly: false
    },
    'other_person': {
        label: 'Member',
        color: 'teal',
        icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
        fetchRpc: 'get_other_person_by_id',
        canFly: false
    }
};
export async function loadMemberDetailsPage(arg1 = null, arg2 = null, arg3 = 'members') {
    let targetId = arg1;
    let targetType = arg2;
    let returnPage = arg3;



    if (typeof arg1 === 'object' && arg1 !== null && arg1.memberId) {
        targetId = arg1.memberId;
        targetType = arg1.type;
        returnPage = arg1.backPage || 'members';
    }



    const hash = window.location.hash;
    const parts = hash.replace('#member/', '').split('/');

    if (!targetId && parts.length === 2) {
        targetType = parts[0];
        targetId = parts[1];
    }


    if (!targetId || !targetType || !MEMBER_CONFIG[targetType]) {
        console.error("Member Details Load Error:", { targetId, targetType });
        showToast('Invalid member identifier or type', 'error');
        return;
    }

    currentMemberId = targetId;
    currentMemberType = targetType;
    returnToPage = returnPage;


    previousPageState = {
        page: document.getElementById('main-content').innerHTML,
        scrollPosition: window.scrollY
    };


    await renderMemberProfile();
}

export function setupMemberDetailsNavigation() {
    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.page === 'memberdetails') {
            if (previousPageState) {
                document.getElementById('main-content').innerHTML = previousPageState.page;
                window.scrollTo(0, previousPageState.scrollPosition);
            }
        }
    });
}

async function renderMemberProfile() {
    showLoading(true);
    const config = MEMBER_CONFIG[currentMemberType];

    try {
        if (!flightDetailsModal) flightDetailsModal = new FlightDetailsModal();



        let userId = null;
        const { data: userAccounts, error: userError } = await supabase
            .schema('api')
            .rpc('get_user_by_person_id', { target_person_id: currentMemberId });

        if (!userError && userAccounts && userAccounts.length > 0) {
            userId = userAccounts[0].id;
        }



        const promises = [

            supabase.schema('api').rpc(config.fetchRpc, {
                [currentMemberType === 'regular_pilot' ? 'pilot_uuid' :
                    currentMemberType === 'maintenance_technician' ? 'technician_uuid' : 'person_uuid']: currentMemberId
            }).single(),


            userId ? supabase.schema('api').rpc('get_transactions_by_person', { person_uuid: userId }) : { data: [] }
        ];


        if (config.canFly && userId) {
            promises.push(supabase.schema('api').rpc('get_flight_logs_by_pilot', { p_pilot_uuid: userId }));
        }

        const results = await Promise.all(promises);

        const personResult = results[0];
        const transactions = results[1].data || [];

        const flightLogs = (results.length > 2) ? (results[2].data || []) : [];

        if (personResult.error) throw personResult.error;


        const member = personResult.data;
        const stats = calculateStats(member, transactions, flightLogs);

        renderProfileHTML(member, stats, flightLogs, transactions, config, userId);
        setupEventListeners(userId);

    } catch (error) {
        console.error('Error loading profile:', error);
        showToast(`Error loading ${config.label}: ` + error.message, 'error');
        renderErrorState();
    } finally {
        showLoading(false);
    }
}

function calculateStats(member, transactions, flightLogs) {
    const pending = transactions
        .filter(t => t.status === 'pending' && t.transaction_direction === 'receivable')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const paid = transactions
        .filter(t => t.status === 'paid' && t.transaction_direction === 'receivable')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);


    const totalHours = member.total_hours ? parseFloat(member.total_hours) : 0;

    return {
        totalPending: pending,
        totalPaid: paid,
        totalHours: totalHours,
        flightCount: flightLogs.length,
        lastFlight: flightLogs.length > 0 ? flightLogs[0].flight_date : 'N/A'
    };
}

function renderProfileHTML(member, stats, flightLogs, transactions, config, userId) {

    const initials = (member.first_name?.[0] || '') + (member.last_name?.[0] || '');


    const showFlightStats = config.canFly || member.total_hours > 0;


    const bgGradient = `from-${config.color}-500 to-${config.color}-600`;
    const textLight = `text-${config.color}-200`;
    const bgSoft = `bg-${config.color}-500/20`;
    const textDark = `text-${config.color}-400`;

    document.getElementById('main-content').innerHTML = `
        <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-4">
                <button id="back-button" class="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors cursor-pointer group">
                    <svg class="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                    </svg>
                    Back
                </button>
                <div class="w-px h-6 bg-gray-600"></div>
                <h1 class="text-2xl font-bold text-white">${config.label} Profile</h1>
            </div>
            </div>

        <div class="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-lg border border-gray-700 p-6 mb-6">
            <div class="flex items-start justify-between">
                <div class="flex items-center gap-6">
                    <div class="w-20 h-20 bg-gradient-to-br ${bgGradient} rounded-full flex items-center justify-center text-white text-2xl font-bold ring-4 ring-gray-800">
                        ${initials}
                    </div>
                    <div>
                        <h2 class="text-3xl font-bold text-white mb-2">${member.first_name} ${member.last_name}</h2>
                        <div class="flex items-center gap-4 text-gray-300">
                            <div class="flex items-center gap-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                ${member.email || 'No email'}
                            </div>
                            <div class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${bgSoft} ${textDark} border border-${config.color}-500/30">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${config.icon}"></path></svg>
                                ${config.label}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-gray-400 text-sm">Joined</div>
                    <div class="text-white font-medium">${member.created_at ? new Date(member.created_at).toLocaleDateString() : 'N/A'}</div>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            ${showFlightStats ? `
            <div class="bg-gradient-to-br from-blue-600 to-blue-700 p-4 rounded-xl shadow-lg">
                <div class="text-blue-200 text-sm font-medium">Total Hours</div>
                <div class="text-2xl font-bold text-white mt-1">${stats.totalHours.toFixed(1)}</div>
                <div class="text-blue-200 text-xs">Lifetime</div>
            </div>` : ''}

            <div class="bg-gradient-to-br from-red-600 to-red-700 p-4 rounded-xl shadow-lg">
                <div class="text-red-200 text-sm font-medium">Pending Debt</div>
                <div class="text-2xl font-bold text-white mt-1">€${stats.totalPending.toFixed(2)}</div>
                <div class="text-red-200 text-xs">Action Required</div>
            </div>
            
            <div class="bg-gradient-to-br from-green-600 to-green-700 p-4 rounded-xl shadow-lg">
                <div class="text-green-200 text-sm font-medium">Total Settled</div>
                <div class="text-2xl font-bold text-white mt-1">€${stats.totalPaid.toFixed(2)}</div>
                <div class="text-green-200 text-xs">Lifetime Paid</div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div class="space-y-6">
                <div class="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
                    <h3 class="text-lg font-semibold text-white mb-4">Member Details</h3>
                    <div class="space-y-3 text-sm">
                        ${member.person_role ? `
                        <div class="flex justify-between py-2 border-b border-gray-700">
                            <span class="text-gray-400">Role Description</span>
                            <span class="text-white">${member.person_role}</span>
                        </div>` : ''}
                        ${member.ratings ? `
                        <div class="flex justify-between py-2 border-b border-gray-700">
                            <span class="text-gray-400">Ratings</span>
                            <span class="text-white text-right">${member.ratings}</span>
                        </div>` : ''}
                         <div class="flex justify-between py-2 border-b border-gray-700">
                            <span class="text-gray-400">System ID</span>
                            <span class="text-gray-500 font-mono text-xs">${member.id.substring(0, 8)}...</span>
                        </div>
                    </div>
                </div>

                <div class="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
                    <h3 class="text-lg font-semibold text-white mb-4">Actions</h3>
                    <div class="space-y-3">
                        <button class="w-full py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2" id="btn-settle-debt">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                            Settle Account
                        </button>

                        ${config.canFly ? `
                        <button class="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2" id="btn-book-flight">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                            Book Flight
                        </button>
                        <button class="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2" id="btn-add-log">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                            Add Flight Log
                        </button>` : ''}
                    </div>
                </div>
            </div>

            <div class="lg:col-span-2 space-y-6">
                
                <div class="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold text-white">Recent Transactions</h3>
                        <span class="text-xs text-gray-500 uppercase tracking-wider">Financials</span>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead class="text-xs text-gray-400 uppercase bg-gray-750">
                                <tr>
                                    <th class="p-3">Date</th>
                                    <th class="p-3">Description</th>
                                    <th class="p-3 text-right">Amount</th>
                                    <th class="p-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody class="text-sm divide-y divide-gray-700">
                                ${transactions.length > 0 ? transactions.slice(0, 5).map(t => `
                                    <tr class="hover:bg-gray-750 transition-colors">
                                        <td class="p-3 text-gray-300">${new Date(t.created_at).toLocaleDateString()}</td>
                                        <td class="p-3 text-white">${t.description}</td>
                                        <td class="p-3 text-right font-mono text-gray-300">€${parseFloat(t.amount).toFixed(2)}</td>
                                        <td class="p-3 text-center">
                                            <span class="px-2 py-1 rounded text-xs font-medium ${t.status === 'paid' ? 'bg-green-500/20 text-green-400' :
            t.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
        }">
                                                ${t.status}
                                            </span>
                                        </td>
                                    </tr>
                                `).join('') : '<tr><td colspan="4" class="p-4 text-center text-gray-500">No transactions found</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>

                ${config.canFly ? `
                <div class="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold text-white">Flight Log</h3>
                        <span class="text-xs text-gray-500 uppercase tracking-wider">Pilot Activity</span>
                    </div>
                    <div class="space-y-3">
                        ${flightLogs.length > 0 ? flightLogs.slice(0, 5).map(flight => `
                            <div class="flex justify-between items-center p-3 bg-gray-750 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors flight-item" data-flight-id="${flight.id}">
                                <div>
                                    <div class="text-white font-medium">${flight.departure_icao} → ${flight.arrival_icao}</div>
                                    <div class="text-gray-400 text-sm">${new Date(flight.flight_date).toLocaleDateString()} • ${flight.flight_duration}h</div>
                                </div>
                                <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
                                    ${flight.type_of_flight}
                                </span>
                            </div>
                        `).join('') : '<div class="text-center text-gray-500 py-4">No flights recorded</div>'}
                    </div>
                </div>` : ''}

            </div>
        </div>
    `;
}

function setupEventListeners(userId) {
    document.getElementById('back-button').addEventListener('click', goBack);


    const settleBtn = document.getElementById('btn-settle-debt');
    if (settleBtn) {
        settleBtn.addEventListener('click', async () => {
            if (!settleDebtModal) {
                settleDebtModal = new SettleDebtModal();
                await settleDebtModal.init();
            }

            settleDebtModal.show(() => {

                renderMemberProfile();
            }, currentMemberId);
        });
    }

    const bookBtn = document.getElementById('btn-book-flight');
    if (bookBtn) {
        bookBtn.addEventListener('click', () => {
            if (!addBookingModal) {
                addBookingModal = new AddBookingModal();
            }

            addBookingModal.show({ personId: currentMemberId });
        });
    }


    const logBtn = document.getElementById('btn-add-log');
    if (logBtn) {
        logBtn.addEventListener('click', () => {
            if (!addFlightModal) {
                addFlightModal = new AddFlightLogModal();
            }
            addFlightModal.init().then(() => {
                addFlightModal.show({ pilotId: userId });
                addFlightModal.onSuccess(() => renderMemberProfile());
            });
        });
    }


    document.addEventListener('click', (e) => {
        const flightItem = e.target.closest('.flight-item');
        if (flightItem) {
            handleFlightClick(flightItem.getAttribute('data-flight-id'));
        }
    });
}

async function handleFlightClick(flightId) {
    try {
        const { data: flightData, error } = await supabase
            .schema('api').rpc('get_flight_log_by_id', { log_uuid: flightId })
            .single();

        if (error) throw error;
        if (flightDetailsModal && flightData) {
            flightDetailsModal.show(flightData);
        }
    } catch (error) {
        console.error('Flight details error:', error);
        showToast('Error loading flight details', 'error');
    }
}

function renderErrorState() {
    document.getElementById('main-content').innerHTML = `
        <div class="flex items-center mb-4">
            <button id="back-button" class="text-blue-400 hover:text-blue-300">← Back</button>
        </div>
        <div class="text-center text-gray-500 py-8">
            <h3 class="text-lg font-medium text-gray-300">Error Loading Member Profile</h3>
            <p class="mt-2 text-sm">We couldn't find the requested information.</p>
            <button id="retry-btn" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">Retry</button>
        </div>
    `;
    document.getElementById('back-button').addEventListener('click', goBack);
    document.getElementById('retry-btn').addEventListener('click', () => renderMemberProfile());
}

function goBack() {

    cleanupMemberDetailsPage();

    window.dispatchEvent(new CustomEvent('navigate', { detail: { page: returnToPage } }));
}

function showLoading(show) {
    const existingLoader = document.getElementById('loading-overlay');
    if (show && !existingLoader) {
        const loader = document.createElement('div');
        loader.id = 'loading-overlay';
        loader.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
        loader.innerHTML = `<div class="bg-gray-800 rounded-xl p-6 text-white">Loading...</div>`;
        document.body.appendChild(loader);
    } else if (!show && existingLoader) {
        existingLoader.remove();
    }
}

export function cleanupMemberDetailsPage() {
    currentMemberId = null;
    currentMemberType = null;

    if (settleDebtModal) {
        if (typeof settleDebtModal.hide === 'function') settleDebtModal.hide();
        settleDebtModal = null;
    }

    if (addFlightModal) {
        if (typeof addFlightModal.destroy === 'function') addFlightModal.destroy();
        addFlightModal = null;
    }


    if (addBookingModal) {

        if (typeof addBookingModal.close === 'function') addBookingModal.close();
        addBookingModal = null;
    }

}