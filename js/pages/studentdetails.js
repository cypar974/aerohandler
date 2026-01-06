import { supabase } from "../supabase.js";
import { showToast } from "../components/showToast.js";
import { editStudent } from './students.js';
import { FlightDetailsModal } from "../modals/FlightDetailsModal.js";
import { AddFlightLogModal } from "../modals/AddFlightLogModal.js";
import { AddBookingModal } from "../modals/AddBookingModal.js";
import { CreateInvoiceModal } from "../modals/CreateInvoiceModal.js";
import { SettleDebtModal } from "../modals/SettleDebtModal.js";

let currentStudentId = null;
let previousPageState = null;
let flightDetailsModal = new FlightDetailsModal();
let createInvoiceModal = null;
let currentStudentNumber = null;
let currentBookingModal = null;
let modalCleanupTimeout = null;
let settleDebtModal = null;

let returnToPage = 'students';

export async function loadStudentDetailsPage(studentId = null, sourcePage = 'students') {
    const hash = window.location.hash;


    returnToPage = sourcePage || 'students';


    let identifier = studentId;

    if (!identifier) {

        identifier = hash.replace('#student/', '');
    }


    if (studentId && typeof studentId === 'object') {
        identifier = studentId.studentId || studentId.id;
        if (studentId.backPage) returnToPage = studentId.backPage;
    }

    if (!identifier || identifier === '#student') {
        showToast('No student identifier provided', 'error');
        return;
    }


    previousPageState = {
        page: document.getElementById('main-content').innerHTML,
        scrollPosition: window.scrollY
    };


    await renderStudentProfile(identifier);
}

async function renderStudentProfileByNumber(studentNumber) {
    showLoading(true);
    try {


        const { data: allStudents, error } = await supabase
            .schema('api')
            .rpc('get_students');

        if (error) throw error;

        const studentData = allStudents.find(s => s.student_number === studentNumber);

        if (!studentData) {
            showToast('Student not found', 'error');
            goBack();
            return;
        }

        await renderStudentProfile(studentData.id);
    } catch (error) {
        console.error('Error resolving student number:', error);
        showToast('Error loading profile: ' + error.message, 'error');
        goBack();
    } finally {
        showLoading(false);
    }
}

export function setupStudentDetailsNavigation() {
    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.page === 'studentdetails') {
            if (previousPageState) {
                document.getElementById('main-content').innerHTML = previousPageState.page;
                window.scrollTo(0, previousPageState.scrollPosition);
            }
        }
    });
}

async function renderStudentProfile(studentId) {
    showLoading(true);
    currentStudentId = studentId;

    try {
        if (!flightDetailsModal) flightDetailsModal = new FlightDetailsModal();
        if (!createInvoiceModal) {
            createInvoiceModal = new CreateInvoiceModal();
            await createInvoiceModal.init();
        }


        const startDate = new Date().toISOString();
        const endDate = new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString();



        let userId = null;


        const { data: userAccounts, error: userError } = await supabase
            .schema('api')
            .rpc('get_user_by_person_id', { target_person_id: studentId });

        if (!userError && userAccounts && userAccounts.length > 0) {
            userId = userAccounts[0].id;
        } else {
            console.warn("No User Account found for this Student. Logs may be empty.");
        }


        const [
            studentResult,
            flightLogsResult,
            transactionsResult,
            bookingsResult,
            planesResult
        ] = await Promise.all([

            supabase.schema('api').rpc('get_student_by_id', { student_uuid: studentId }).single(),


            userId ? supabase.schema('api').rpc('get_flight_logs_by_pilot', { p_pilot_uuid: userId }) : { data: [] },


            userId ? supabase.schema('api').rpc('get_transactions_by_person', { person_uuid: userId }) : { data: [] },


            supabase.schema('api').rpc('get_bookings_by_date_range', {
                start_date: startDate,
                end_date: endDate
            }),


            supabase.schema('api').rpc('get_planes')
        ]);

        if (studentResult.error) throw studentResult.error;


        if (flightLogsResult.error) console.error('Error fetching logs:', flightLogsResult.error);
        if (transactionsResult.error) console.error('Error fetching transactions:', transactionsResult.error);

        const student = studentResult.data;
        const flightLogs = flightLogsResult.data || [];
        const allTransactions = transactionsResult.data || [];
        const allPlanes = planesResult.data || [];
        const rawBookings = bookingsResult.data || [];




        const pendingPayments = allTransactions.filter(t =>
            t.transaction_direction === 'receivable' &&
            (t.status === 'pending' || t.status === 'overdue')
        );
        const paymentHistory = allTransactions.filter(t => t.status === 'paid');


        const studentBookings = rawBookings.filter(b =>
            (userId && b.pilot_id === userId) ||
            (userId && b.student2_id === userId) ||
            (userId && b.student3_id === userId)
        );

        const upcomingBookings = studentBookings.map(b => {
            const plane = allPlanes.find(p => p.id === b.plane_id);
            return {
                ...b,
                planes: {
                    tail_number: plane ? plane.tail_number : 'Unknown Plane',
                    model: 'Aircraft'
                },
                instructors: {
                    first_name: "Instructor",
                    last_name: "(Assigned)"
                }
            };
        });


        const statistics = calculateStudentStatistics(
            student,
            flightLogs,
            pendingPayments,
            paymentHistory,
            upcomingBookings
        );

        renderProfileHTML(student, statistics, flightLogs, pendingPayments, upcomingBookings);
        setupStudentDetailsEventListeners(studentId);

    } catch (error) {
        console.error('Error loading student profile:', error);
        showToast('Error loading student profile: ' + error.message, 'error');
        renderErrorState(studentId);
    } finally {
        showLoading(false);
    }
}

function calculateStudentStatistics(student, flightLogs, pendingPayments, paymentHistory, upcomingBookings) {
    const totalPending = pendingPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const totalPaid = paymentHistory.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const totalFlights = flightLogs.length;

    const hoursByType = {
        solo: flightLogs.filter(f => f.type_of_flight === 'P').reduce((sum, f) => sum + (f.flight_duration || 0), 0),
        training: flightLogs.filter(f => f.type_of_flight === 'PI' || f.type_of_flight === 'EPI').reduce((sum, f) => sum + (f.flight_duration || 0), 0),
        cross_country: flightLogs.filter(f => f.nature_of_flight === 'nav').reduce((sum, f) => sum + (f.flight_duration || 0), 0),
        night: flightLogs.filter(f => f.nature_of_flight === 'night').reduce((sum, f) => sum + (f.flight_duration || 0), 0)
    };

    return {
        totalPending,
        totalPaid,
        totalFlights,
        hoursByType,
        upcomingBookingsCount: upcomingBookings.length,
        pendingPaymentsCount: pendingPayments.length
    };
}

function renderProfileHTML(student, stats, flightLogs, pendingPayments, upcomingBookings) {
    const s = student;
    const canEdit = true;


    const displayStatus = 'Active';

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
                <h1 class="text-2xl font-bold text-white">Student Profile</h1>
            </div>
            <div class="flex gap-3">
                ${canEdit ? `
                <button id="edit-profile-btn" class="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-500 transition-colors font-medium flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                    Edit Profile
                </button>` : ''}
            </div>
        </div>

        <div class="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-lg border border-gray-700 p-6 mb-6">
            <div class="flex items-start justify-between">
                <div class="flex items-center gap-6">
                    <div class="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                        ${s.first_name?.[0]?.toUpperCase() || 'S'}${s.last_name?.[0]?.toUpperCase() || 'T'}
                    </div>
                    <div>
                        <h2 class="text-3xl font-bold text-white mb-2">${s.first_name || ''} ${s.last_name || ''}</h2>
                        <div class="flex items-center gap-4 text-gray-300">
                            <div class="flex items-center gap-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                </svg>
                                ${s.email || 'No email'}
                            </div>
                            ${s.phone ? `
                                <div class="flex items-center gap-2">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                                    </svg>
                                    ${s.phone}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
                <div class="text-right">
                    <div class="mt-2 text-gray-400 text-sm">
                        Student #: ${s.student_number || 'N/A'}
                    </div>
                    <div class="text-gray-400 text-sm">
                        Joined: ${s.join_date ? new Date(s.join_date).toLocaleDateString() : 'N/A'}
                    </div>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div class="bg-gradient-to-br from-blue-600 to-blue-700 p-4 rounded-xl shadow-lg">
                <div class="text-blue-200 text-sm font-medium">Total Flight Hours</div>
                <div class="text-2xl font-bold text-white mt-1">${s.total_hours || '0'}</div>
                <div class="text-blue-200 text-xs">${stats.totalFlights} flights</div>
            </div>
            <div class="bg-gradient-to-br from-green-600 to-green-700 p-4 rounded-xl shadow-lg">
                <div class="text-green-200 text-sm font-medium">Pending Payments</div>
                <div class="text-2xl font-bold text-white mt-1">$${stats.totalPending.toFixed(2)}</div>
                <div class="text-green-200 text-xs">${stats.pendingPaymentsCount} invoices</div>
            </div>
            <div class="bg-gradient-to-br from-purple-600 to-purple-700 p-4 rounded-xl shadow-lg">
                <div class="text-purple-200 text-sm font-medium">Total Paid</div>
                <div class="text-2xl font-bold text-white mt-1">$${stats.totalPaid.toFixed(2)}</div>
                <div class="text-purple-200 text-xs">Lifetime</div>
            </div>
            <div class="bg-gradient-to-br from-orange-600 to-orange-700 p-4 rounded-xl shadow-lg">
                <div class="text-orange-200 text-sm font-medium">Upcoming Bookings</div>
                <div class="text-2xl font-bold text-white mt-1">${stats.upcomingBookingsCount}</div>
                <div class="text-orange-200 text-xs">Scheduled</div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="space-y-6">
                <div class="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
                    <h3 class="text-lg font-semibold text-white mb-4">Personal Information</h3>
                    <div class="space-y-3 text-sm">
                        <div class="flex justify-between py-2 border-b border-gray-700">
                            <span class="text-gray-400">Date of Birth</span>
                            <span class="text-white">${s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString() : 'Not set'}</span>
                        </div>
                        <div class="flex justify-between py-2 border-b border-gray-700">
                            <span class="text-gray-400">Address</span>
                            <span class="text-white text-right">${s.address || 'Not set'}</span>
                        </div>
                    </div>
                </div>

                <div class="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
                    <h3 class="text-lg font-semibold text-white mb-4">License & Medical</h3>
                    <div class="space-y-3 text-sm">
                        <div class="flex justify-between py-2 border-b border-gray-700">
                            <span class="text-gray-400">License Type</span>
                            <span class="text-white">${s.license_type || 'Not set'}</span>
                        </div>
                        <div class="flex justify-between py-2 border-b border-gray-700">
                            <span class="text-gray-400">License Expiry</span>
                            <span class="text-white ${s.license_expiry && new Date(s.license_expiry) < new Date() ? 'text-red-400' : ''}">
                                ${s.license_expiry ? new Date(s.license_expiry).toLocaleDateString() : 'Not set'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="space-y-6">
                <div class="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
                    <h3 class="text-lg font-semibold text-white mb-4">Flight Hours Breakdown</h3>
                    <div class="space-y-3 text-sm">
                        <div class="flex justify-between items-center py-2 border-b border-gray-700">
                            <span class="text-gray-400">Total Hours</span>
                            <span class="text-white font-mono">${s.total_hours || '0'}</span>
                        </div>
                        <div class="flex justify-between items-center py-2 border-b border-gray-700">
                            <span class="text-gray-400">Solo Hours</span>
                            <span class="text-white font-mono">${stats.hoursByType.solo.toFixed(1)}</span>
                        </div>
                        <div class="flex justify-between items-center py-2 border-b border-gray-700">
                            <span class="text-gray-400">Dual Hours</span>
                            <span class="text-white font-mono">${stats.hoursByType.training.toFixed(1)}</span>
                        </div>
                    </div>
                </div>

                <div class="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold text-white">Recent Flights</h3>
                    </div>
                    <div class="space-y-3">
                        ${flightLogs.length > 0 ?
            flightLogs.slice(0, 5).map(flight => `
                                <div class="flex justify-between items-center p-3 bg-gray-750 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors flight-item" data-flight-id="${flight.id}">
                                    <div>
                                        <div class="text-white font-medium">${flight.departure_icao} → ${flight.arrival_icao}</div>
                                        <div class="text-gray-400 text-sm">${new Date(flight.flight_date).toLocaleDateString()} • ${flight.flight_duration}h</div>
                                    </div>
                                    <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
                                        ${flight.type_of_flight}
                                    </span>
                                </div>
                            `).join('') :
            '<div class="text-center text-gray-500 py-4">No flight records</div>'
        }
                    </div>
                </div>
            </div>

            <div class="space-y-6">
                <div class="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold text-white">Pending Payments</h3>
                    </div>
                    <div class="space-y-3">
                        ${pendingPayments.length > 0 ?
            pendingPayments.map(payment => `
                                <div class="flex justify-between items-center p-3 bg-gray-750 rounded-lg">
                                    <div>
                                        <div class="text-white font-medium">$${parseFloat(payment.amount).toFixed(2)}</div>
                                        <div class="text-gray-400 text-sm">Due ${new Date(payment.due_date).toLocaleDateString()}</div>
                                    </div>
                                    ${canEdit ? `
                                    <button class="ml-2 text-xs bg-green-600 px-2 py-1 rounded text-white process-payment" data-payment-id="${payment.id}">
                                        Pay
                                    </button>` : ''}
                                </div>
                            `).join('') :
            '<div class="text-center text-gray-500 py-4">No pending payments</div>'
        }
                    </div>
                </div>

                <div class="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold text-white">Upcoming Bookings</h3>
                    </div>
                    <div class="space-y-3">
                        ${upcomingBookings.length > 0 ?
            upcomingBookings.map(booking => `
                                <div class="p-3 bg-gray-750 rounded-lg">
                                    <div class="flex justify-between items-start mb-2">
                                        <div class="text-white font-medium">${booking.planes.tail_number}</div>
                                        <span class="text-blue-400 text-sm">${new Date(booking.start_time).toLocaleDateString()}</span>
                                    </div>
                                    <div class="text-gray-400 text-sm">
                                        ${new Date(booking.start_time).toLocaleTimeString()} - ${new Date(booking.end_time).toLocaleTimeString()}
                                    </div>
                                </div>
                            `).join('') :
            '<div class="text-center text-gray-500 py-4">No upcoming bookings</div>'
        }
                    </div>
                </div>

                <div class="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
                    <h3 class="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                    <div class="grid grid-cols-2 gap-3">
                        <button class="quick-action p-3 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors text-white text-sm font-medium flex items-center justify-center gap-2" data-action="add-flight">
                            Add Flight Log
                        </button>
                        <button class="quick-action p-3 bg-green-600 hover:bg-green-500 rounded-lg transition-colors text-white text-sm font-medium flex items-center justify-center gap-2" data-action="create-invoice">
                            Create Invoice
                        </button>
                        <button class="quick-action p-3 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors text-white text-sm font-medium flex items-center justify-center gap-2" data-action="schedule-booking">
                            Schedule Booking
                        </button>
                        <button class="quick-action p-3 bg-yellow-600 hover:bg-yellow-500 rounded-lg transition-colors text-white text-sm font-medium flex items-center justify-center gap-2" data-action="settle-account">
                            Settle Debt
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderErrorState(studentId) {
    document.getElementById('main-content').innerHTML = `
        <div class="flex items-center mb-4">
            <button id="back-button" class="text-blue-400 hover:text-blue-300">← Back</button>
        </div>
        <div class="text-center text-gray-500 py-8">
            <h3 class="text-lg font-medium text-gray-300">Error Loading Profile</h3>
            <button id="retry-btn" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">Retry</button>
        </div>
    `;
    document.getElementById('back-button').addEventListener('click', goBack);
    document.getElementById('retry-btn').addEventListener('click', () => renderStudentProfile(studentId));
}

function setupStudentDetailsEventListeners(studentId) {
    document.getElementById('back-button').addEventListener('click', goBack);

    const editBtn = document.getElementById('edit-profile-btn');
    if (editBtn) {
        editBtn.addEventListener('click', async () => {

            editStudent(studentId);
        });
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
            handleQuickAction(action, studentId);
        });
    });

    document.querySelectorAll('.process-payment').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            await processPayment(e.target.getAttribute('data-payment-id'), studentId);
        });
    });
}

async function processPayment(paymentId, studentId) {
    try {
        showToast('Processing payment...', 'info');
        const payload = {
            status: 'paid',
            paid_at: new Date().toISOString(),
            payment_method: 'card'
        };
        const { error } = await supabase
            .schema('api').rpc('update_financial_transaction', {
                transaction_uuid: paymentId,
                payload: payload
            });

        if (error) throw error;
        showToast('Payment processed!', 'success');
        await renderStudentProfile(studentId);
    } catch (error) {
        console.error('Payment error:', error);
        showToast('Error processing payment', 'error');
    }
}

async function handleQuickAction(action, studentId) {
    let currentModal = null;

    switch (action) {
        case 'add-flight':
            currentModal = new AddFlightLogModal();
            currentModal.init().then(() => {
                currentModal.show({ pilotId: studentId });
                currentModal.onSuccess(() => {
                    renderStudentProfile(studentId);
                    cleanupModal();
                });
                currentModal.onClose(() => cleanupModal());
            });
            break;

        case 'create-invoice':
            if (createInvoiceModal) {
                createInvoiceModal.show({ studentId: studentId });
                const invoiceSuccessHandler = () => {
                    renderStudentProfile(studentId);
                    document.removeEventListener('invoiceCreated', invoiceSuccessHandler);
                };
                document.addEventListener('invoiceCreated', invoiceSuccessHandler);
            }
            break;

        case 'schedule-booking':
            setTimeout(() => {
                createAddBookingModal(studentId);
            }, 100);
            break;
        case 'settle-account':
            if (!settleDebtModal) {
                settleDebtModal = new SettleDebtModal();
                await settleDebtModal.init();
            }


            settleDebtModal.show(() => {

                renderStudentProfile(studentId);
            }, studentId);
            break;
    }

    function cleanupModal() {
        if (currentModal && typeof currentModal.destroy === 'function') {
            currentModal.destroy();
        }
        currentModal = null;
    }
}

function createAddBookingModal(studentId) {

    const modal = new AddBookingModal();
    modal.onSuccess(async () => {
        showToast('Booking created!', 'success');
        await renderStudentProfile(currentStudentId);
        closeActiveModal();
    });
    modal.onClose(() => closeActiveModal());
    currentBookingModal = modal;


    modal.show({ personId: studentId }).catch(err => {
        console.error('Booking modal error:', err);
        showToast('Error opening booking form', 'error');
    });
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
    window.dispatchEvent(new CustomEvent('navigate', { detail: { page: returnToPage } }));
}

export function cleanupStudentDetailsPage() {
    closeActiveModal();
    currentStudentId = null;

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

export default {
    loadStudentDetailsPage,
    setupStudentDetailsNavigation,
    cleanupStudentDetailsPage
};