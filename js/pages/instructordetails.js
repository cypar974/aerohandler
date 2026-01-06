import { supabase } from "../supabase.js";
import { showToast } from "../components/showToast.js";
import { editInstructor } from './instructors.js';
import { FlightDetailsModal } from "../modals/FlightDetailsModal.js";
import { AddFlightLogModal } from "../modals/AddFlightLogModal.js";
import { AddBookingModal } from "../modals/AddBookingModal.js";
import { SettleDebtModal } from "../modals/SettleDebtModal.js";

let currentInstructorId = null;
let previousPageState = null;
let flightDetailsModal = new FlightDetailsModal();
let settleDebtModal = null;
let currentBookingModal = null;
let modalCleanupTimeout = null;
let cachedStudents = [];

let returnToPage = 'instructors';
export async function loadInstructorDetailsPage(instructorId = null, sourcePage = 'instructors') {
    const hash = window.location.hash;
    const instructorMatch = hash.match(/^#instructor\/([A-Za-z0-9-]+)$/);
    const instructorIdFromUrl = instructorMatch ? instructorMatch[1] : null;
    currentInstructorId = instructorId || instructorIdFromUrl;


    returnToPage = sourcePage || 'instructors';

    if (!currentInstructorId) {
        showToast('No instructor ID provided', 'error');
        return;
    }

    previousPageState = {
        page: document.getElementById('main-content').innerHTML,
        scrollPosition: window.scrollY
    };

    await renderInstructorProfile(currentInstructorId);
}

export function setupInstructorDetailsNavigation() {
    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.page === 'instructordetails') {
            if (previousPageState) {
                document.getElementById('main-content').innerHTML = previousPageState.page;
                window.scrollTo(0, previousPageState.scrollPosition);
            }
        }
    });
}

async function renderInstructorProfile(instructorId) {
    showLoading(true);

    const canEdit = true;

    try {
        if (!flightDetailsModal) flightDetailsModal = new FlightDetailsModal();

        let userId = null;
        const { data: userAccounts, error: userError } = await supabase
            .schema('api')
            .rpc('get_user_by_person_id', { target_person_id: instructorId });

        if (!userError && userAccounts && userAccounts.length > 0) {
            userId = userAccounts[0].id;
        } else {
            console.warn("No User Account found for this Instructor. Logs may be empty.");
        }


        const promises = [

            supabase.schema('api').rpc('get_instructor_by_id', { instructor_uuid: instructorId }).single(),


            supabase.schema('api').rpc('get_students'),
            supabase.schema('api').rpc('get_planes'),
            supabase.schema('api').rpc('get_plane_models')
        ];


        if (userId) {

            promises.push(supabase.schema('api').rpc('get_flight_logs').eq('instructor_uuid', userId));

            promises.push(supabase.schema('api').rpc('get_flight_logs_by_pilot', { p_pilot_uuid: userId }));

            promises.push(supabase.schema('api').rpc('get_bookings').eq('instructor_id', userId));

            promises.push(supabase.schema('api').rpc('get_bookings').eq('pilot_id', userId));
        }

        const results = await Promise.all(promises);

        const instructorResult = results[0];
        const allStudents = results[1].data || [];
        const allPlanes = results[2].data || [];
        const allModels = results[3].data || [];


        let instructorLogs = [];
        let pilotLogs = [];
        let instructorBookings = [];
        let pilotBookings = [];

        if (userId) {
            instructorLogs = results[4].data || [];
            pilotLogs = results[5].data || [];
            instructorBookings = results[6].data || [];
            pilotBookings = results[7].data || [];
        }

        if (instructorResult.error) throw instructorResult.error;





        const mergedLogs = [
            ...instructorLogs.map(l => ({ ...l, _role: 'INSTRUCTOR' })),
            ...pilotLogs.map(l => ({ ...l, _role: 'PILOT' }))
        ].sort((a, b) => new Date(b.flight_date) - new Date(a.flight_date));


        const uniqueLogs = Array.from(new Map(mergedLogs.map(item => [item.id, item])).values());


        const startDate = new Date();
        const mergedBookings = [
            ...instructorBookings.map(b => ({ ...b, _role: 'INSTRUCTOR' })),
            ...pilotBookings.map(b => ({ ...b, _role: 'PILOT' }))
        ]
            .filter(b => new Date(b.start_time) >= startDate)
            .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));


        const studentsMap = new Map(allStudents.map(s => [s.id, s]));
        const planesMap = new Map(allPlanes.map(p => [p.id, p]));
        const modelsMap = new Map(allModels.map(m => [m.id, m]));

        cachedStudents = allStudents;

        const hydratedBookings = mergedBookings.map(b => {
            const plane = planesMap.get(b.plane_id);
            return {
                ...b,
                plane_details: plane ? { ...plane, model: modelsMap.get(plane.model_id)?.model_name } : null,

                other_party: b._role === 'INSTRUCTOR' ? studentsMap.get(b.pilot_id) : null
            };
        });



        const studentsTaught = instructorLogs.map(log => studentsMap.get(log.pilot_uuid)).filter(Boolean);

        const recentStudents = studentsTaught
            .filter((s, index, self) =>
                index === self.findIndex(t => t.student_number === s.student_number)
            )
            .slice(0, 8);


        const statistics = calculateMixedStatistics(uniqueLogs, instructorLogs, mergedBookings, recentStudents);

        renderProfileHTML(instructorResult.data, statistics, uniqueLogs, hydratedBookings, recentStudents, canEdit);
        setupInstructorDetailsEventListeners(instructorId, userId, uniqueLogs);

    } catch (error) {
        console.error('Error loading instructor profile:', error);
        showToast('Error loading instructor profile: ' + error.message, 'error');
        renderErrorState(instructorId);
    } finally {
        showLoading(false);
    }
}

function calculateMixedStatistics(allLogs, instructorOnlyLogs, upcomingBookings, recentStudents) {
    const totalFlights = allLogs.length;
    const totalHours = allLogs.reduce((sum, f) => sum + (parseFloat(f.flight_duration) || 0), 0);


    const instructionHours = instructorOnlyLogs.reduce((sum, f) => sum + (parseFloat(f.flight_duration) || 0), 0);

    const hoursByType = {
        solo: allLogs.filter(f => f.type_of_flight === 'P').reduce((sum, f) => sum + (f.flight_duration || 0), 0),
        instruction: instructionHours,
        dual_received: allLogs.filter(f => f._role === 'PILOT' && (f.type_of_flight === 'EPI' || f.type_of_flight === 'PI')).reduce((sum, f) => sum + (f.flight_duration || 0), 0)
    };

    return {
        totalFlights,
        totalHours,
        instructionHours,
        hoursByType,
        upcomingBookingsCount: upcomingBookings.length,
        recentStudentsCount: recentStudents.length,
        averageFlightDuration: totalFlights > 0 ? (totalHours / totalFlights).toFixed(1) : 0
    };
}

function renderProfileHTML(instructor, stats, flightLogs, upcomingBookings, recentStudents, canEdit) {
    const i = instructor;

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
                <h1 class="text-2xl font-bold text-white">Instructor Profile</h1>
            </div>
            <div class="flex gap-3">
                ${canEdit ? `
                <button id="edit-profile-btn" class="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-500 transition-colors font-medium flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                    Edit Profile
                </button>
                ` : ''}
            </div>
        </div>

        <div class="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-lg border border-gray-700 p-6 mb-6">
            <div class="flex items-start justify-between">
                <div class="flex items-center gap-6">
                    <div class="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                        ${i.first_name?.[0]?.toUpperCase() || 'I'}${i.last_name?.[0]?.toUpperCase() || 'N'}
                    </div>
                    <div>
                        <h2 class="text-3xl font-bold text-white mb-2">${i.first_name || ''} ${i.last_name || ''}</h2>
                        <div class="flex items-center gap-4 text-gray-300">
                            <div class="flex items-center gap-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                </svg>
                                ${i.email || 'No email'}
                            </div>
                            <div class="flex items-center gap-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                Member since: ${i.created_at ? new Date(i.created_at).toLocaleDateString() : 'N/A'}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="text-right">
                    <div class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-500/20 text-green-400">
                        Certified Instructor
                    </div>
                    <div class="mt-2 text-gray-400 text-sm">
                        Total Logged Hours: ${stats.totalHours.toFixed(1)}
                    </div>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div class="bg-gradient-to-br from-purple-600 to-purple-700 p-4 rounded-xl shadow-lg">
                <div class="text-purple-200 text-sm font-medium">Instruction Given</div>
                <div class="text-2xl font-bold text-white mt-1">${stats.instructionHours.toFixed(1)}h</div>
                <div class="text-purple-200 text-xs">As Instructor</div>
            </div>
            <div class="bg-gradient-to-br from-blue-600 to-blue-700 p-4 rounded-xl shadow-lg">
                <div class="text-blue-200 text-sm font-medium">Personal/Pilot</div>
                <div class="text-2xl font-bold text-white mt-1">${(stats.totalHours - stats.instructionHours).toFixed(1)}h</div>
                <div class="text-blue-200 text-xs">As Pilot</div>
            </div>
            <div class="bg-gradient-to-br from-green-600 to-green-700 p-4 rounded-xl shadow-lg">
                <div class="text-green-200 text-sm font-medium">Recent Students</div>
                <div class="text-2xl font-bold text-white mt-1">${stats.recentStudentsCount}</div>
                <div class="text-green-200 text-xs">Last 30 days</div>
            </div>
            <div class="bg-gradient-to-br from-orange-600 to-orange-700 p-4 rounded-xl shadow-lg">
                <div class="text-orange-200 text-sm font-medium">Upcoming</div>
                <div class="text-2xl font-bold text-white mt-1">${stats.upcomingBookingsCount}</div>
                <div class="text-orange-200 text-xs">Bookings</div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="space-y-6">
                <div class="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
                    <h3 class="text-lg font-semibold text-white mb-4">Instructor Info</h3>
                    <div class="space-y-3 text-sm">
                        <div class="flex justify-between py-2 border-b border-gray-700">
                            <span class="text-gray-400">Total Flight Hours</span>
                            <span class="text-white font-mono">${i.total_hours || '0'}</span>
                        </div>
                         <div class="flex justify-between py-2 border-b border-gray-700">
                            <span class="text-gray-400">Instruction Hours</span>
                            <span class="text-white font-mono">${stats.instructionHours.toFixed(1)}</span>
                        </div>
                    </div>
                </div>

                <div class="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
                    <h3 class="text-lg font-semibold text-white mb-4">Ratings</h3>
                    <div class="text-sm">
                        ${i.ratings ? `
                            <div class="p-3 bg-gray-750 rounded-lg text-white">
                                ${i.ratings}
                            </div>
                        ` : '<div class="text-gray-500">No ratings specified</div>'}
                    </div>
                </div>
            </div>

            <div class="space-y-6">
                <div class="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold text-white">Recent Activity</h3>
                        <span class="text-gray-400 text-sm">Mixed Roles</span>
                    </div>
                    <div class="space-y-3">
                        ${flightLogs.length > 0 ?
            flightLogs.slice(0, 5).map(flight => `
                                <div class="flex justify-between items-center p-3 bg-gray-750 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors flight-item" data-flight-id="${flight.id}">
                                    <div>
                                        <div class="flex items-center gap-2 mb-1">
                                            <span class="text-xs font-bold px-1.5 py-0.5 rounded ${flight._role === 'INSTRUCTOR' ? 'bg-purple-900 text-purple-200 border border-purple-700' : 'bg-blue-900 text-blue-200 border border-blue-700'
                }">
                                                ${flight._role === 'INSTRUCTOR' ? 'INSTR' : 'PILOT'}
                                            </span>
                                            <span class="text-white font-medium">${flight.departure_icao} → ${flight.arrival_icao}</span>
                                        </div>
                                        <div class="text-gray-400 text-sm">${new Date(flight.flight_date).toLocaleDateString()} • ${flight.flight_duration}h</div>
                                    </div>
                                    <span class="text-gray-500 text-xs uppercase">${flight.type_of_flight}</span>
                                </div>
                            `).join('') :
            '<div class="text-center text-gray-500 py-4">No flight records</div>'
        }
                    </div>
                    ${flightLogs.length > 5 ? `
                        <button class="w-full mt-4 py-2 text-blue-400 hover:text-blue-300 transition-colors text-sm font-medium view-all-flights">
                            View All Flights (${flightLogs.length})
                        </button>
                    ` : ''}
                </div>
            </div>

            <div class="space-y-6">
                <div class="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
                    <h3 class="text-lg font-semibold text-white mb-4">Upcoming Schedule</h3>
                    <div class="space-y-3">
                        ${upcomingBookings.length > 0 ?
            upcomingBookings.slice(0, 5).map(booking => `
                                <div class="p-3 bg-gray-750 rounded-lg border-l-4 ${booking._role === 'INSTRUCTOR' ? 'border-purple-500' : 'border-blue-500'}">
                                    <div class="flex justify-between items-start mb-1">
                                        <div class="text-white font-medium">${booking.plane_details?.tail_number || 'Unknown'}</div>
                                        <span class="text-blue-400 text-sm">${new Date(booking.start_time).toLocaleDateString()}</span>
                                    </div>
                                    <div class="text-gray-400 text-xs mb-1">
                                        ${new Date(booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                                        ${new Date(booking.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    ${booking.other_party ? `
                                        <div class="text-gray-300 text-xs flex items-center gap-1">
                                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                                            w/ ${booking.other_party.first_name} ${booking.other_party.last_name}
                                        </div>
                                    ` : ''}
                                </div>
                            `).join('') :
            '<div class="text-center text-gray-500 py-4">No upcoming bookings</div>'
        }
                    </div>
                </div>

                <div class="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
                    <h3 class="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                    <div class="grid grid-cols-2 gap-3">
                        <button class="quick-action p-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm font-medium" data-action="add-flight">Add Log</button>
                        <button class="quick-action p-3 bg-purple-600 hover:bg-purple-500 rounded-lg text-white text-sm font-medium" data-action="schedule-booking">Schedule</button>
                        <button class="quick-action p-3 bg-green-600 hover:bg-green-500 rounded-lg text-white text-sm font-medium" data-action="update-hours">Update Hrs</button>

                        <button class="quick-action p-3 bg-yellow-600 hover:bg-yellow-500 rounded-lg text-white text-sm font-medium" data-action="settle-account">Settle Debt</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderErrorState(instructorId) {
    document.getElementById('main-content').innerHTML = `
        <div class="flex items-center mb-4">
            <button id="back-button" class="text-blue-400">← Back</button>
        </div>
        <div class="text-center text-gray-500 py-8">
            <h3 class="text-lg font-medium text-gray-300">Error Loading Profile</h3>
            <button id="retry-btn" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">Retry</button>
        </div>
    `;
    document.getElementById('back-button').addEventListener('click', goBack);
    document.getElementById('retry-btn').addEventListener('click', () => renderInstructorProfile(instructorId));
}

function setupInstructorDetailsEventListeners(instructorId, userId, allLogs) {
    document.getElementById('back-button').addEventListener('click', goBack);

    const editBtn = document.getElementById('edit-profile-btn');
    if (editBtn) {
        editBtn.addEventListener('click', () => editInstructor(instructorId));
    }

    document.addEventListener('click', (e) => {
        const flightItem = e.target.closest('.flight-item');
        if (flightItem) {
            handleFlightClick(flightItem.getAttribute('data-flight-id'));
        }
    });

    document.querySelectorAll('.quick-action').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = e.target.closest('.quick-action').getAttribute('data-action');
            handleQuickAction(action, instructorId, userId);
        });
    });

    const viewAllBtn = document.querySelector('.view-all-flights');
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', () => {
            showToast('Full flight history modal coming soon!', 'info');

        });
    }
}

async function handleQuickAction(action, instructorId, userId) {
    let currentModal = null;

    switch (action) {
        case 'add-flight':
            currentModal = new AddFlightLogModal();
            currentModal.init().then(() => {




                currentModal.show({
                    pilotId: userId,
                    peopleData: cachedStudents
                });
                currentModal.onSuccess(() => {
                    renderInstructorProfile(instructorId);
                    cleanupModal();
                });
                currentModal.onClose(() => cleanupModal());
            });
            break;

        case 'schedule-booking':
            setTimeout(() => createAddBookingModal(instructorId), 100);
            break;

        case 'update-hours':
            await updateInstructorHours(instructorId, userId);
            break;
        case 'settle-account':
            if (!settleDebtModal) {
                settleDebtModal = new SettleDebtModal();
                await settleDebtModal.init();
            }


            settleDebtModal.show(() => {

                renderInstructorProfile(instructorId);
            }, instructorId);
            break;
    }

    function cleanupModal() {
        if (currentModal && typeof currentModal.destroy === 'function') currentModal.destroy();
        currentModal = null;
    }
}

async function updateInstructorHours(instructorId, userId) {
    try {
        if (!userId) throw new Error("User ID not found for this instructor");










        const { data: pilotLogs, error } = await supabase
            .schema('api').rpc('get_flight_logs_by_pilot', { p_pilot_uuid: userId });

        if (error) throw error;


        const totalHours = pilotLogs.reduce((sum, flight) => sum + parseFloat(flight.flight_duration || 0), 0);

        const { error: updateError } = await supabase
            .schema('api').rpc('update_instructor', {
                instructor_uuid: instructorId,
                payload: { total_hours: totalHours }
            });

        if (updateError) throw updateError;
        showToast(`Hours updated to ${totalHours.toFixed(1)}`, 'success');
        await renderInstructorProfile(instructorId);

    } catch (error) {
        console.error('Error updating hours:', error);
        showToast('Error updating hours: ' + error.message, 'error');
    }
}

function createAddBookingModal(instructorId) {
    const modal = new AddBookingModal();
    modal.onSuccess(async () => {
        showToast('Booking created!', 'success');
        await renderInstructorProfile(instructorId);
        closeActiveModal();
    });
    modal.onClose(() => closeActiveModal());
    currentBookingModal = modal;




    modal.show({ personId: instructorId, preloadedPeople: cachedStudents });
}

function closeActiveModal() {
    if (window.isClosingModal) return;
    window.isClosingModal = true;
    if (modalCleanupTimeout) clearTimeout(modalCleanupTimeout);

    if (currentBookingModal) {
        if (typeof currentBookingModal.close === 'function') currentBookingModal.close();
        else if (typeof currentBookingModal.destroy === 'function') currentBookingModal.destroy();
        currentBookingModal = null;
    }
    setTimeout(() => { window.isClosingModal = false; }, 100);
}

function goBack() {
    closeActiveModal();
    window.dispatchEvent(new CustomEvent('navigate', {
        detail: { page: returnToPage }
    }));
}

export function cleanupInstructorDetailsPage() {
    closeActiveModal();
    currentInstructorId = null;
    cachedStudents = [];


    if (settleDebtModal) {
        if (typeof settleDebtModal.hide === 'function') settleDebtModal.hide();
        settleDebtModal = null;
    }
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

async function handleFlightClick(flightId) {
    try {
        const { data: flightData, error } = await supabase
            .schema('api').rpc('get_flight_log_by_id', { log_uuid: flightId }).single();
        if (error) throw error;
        if (flightDetailsModal && flightData) flightDetailsModal.show(flightData);
    } catch (error) {
        console.error('Flight details error:', error);
        showToast('Error loading flight details', 'error');
    }
}

export default {
    loadInstructorDetailsPage,
    setupInstructorDetailsNavigation,
    cleanupInstructorDetailsPage
};