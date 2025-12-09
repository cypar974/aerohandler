// ./js/pages/studentdetails.js
import { supabase } from "../supabase.js";
import { showToast } from "../components/showToast.js";
import { editStudent } from './students.js';
import { FlightDetailsModal } from "../modals/FlightDetailsModal.js";
import { AddFlightLogModal } from "../modals/AddFlightLogModal.js";
import { AddBookingModal } from "../modals/AddBookingModal.js";
import { CreateInvoiceModal } from "../modals/CreateInvoiceModal.js";


let currentStudentId = null;
let previousPageState = null;
let flightDetailsModal = new FlightDetailsModal();
let createInvoiceModal = null;

// Declare missing variables (adjust as needed for your app)
let studentsData = [];
let currentPage = 1;
let sortState = {};
let searchState = {};
let tableStateBackup = {};

let currentStudentNumber = null;

let currentBookingModal = null;
let modalCleanupTimeout = null;

export async function loadStudentDetailsPage(studentNumber = null) {
    // Get student number from URL hash or passed parameter
    const hash = window.location.hash;
    const studentMatch = hash.match(/^#student\/([A-Za-z0-9-]+)$/);
    const studentNumberFromUrl = studentMatch ? studentMatch[1] : null;
    currentStudentNumber = studentNumber || studentNumberFromUrl;

    if (!currentStudentNumber) {
        showToast('No student number provided', 'error');
        return;
    }

    // Store previous state for back navigation
    previousPageState = {
        page: document.getElementById('main-content').innerHTML,
        scrollPosition: window.scrollY
    };

    await renderStudentProfileByNumber(currentStudentNumber);
}

async function renderStudentProfileByNumber(studentNumber) {
    showLoading(true);

    try {
        // First, get the student by student_number to find their UUID
        const { data: studentData, error: studentError } = await supabase
            .from('students')
            .select('id, student_number')
            .eq('student_number', studentNumber)
            .single();

        if (studentError || !studentData) {
            showToast('Student not found', 'error');
            goBack();
            return;
        }

        // Now use the UUID to load the full profile
        await renderStudentProfile(studentData.id);

    } catch (error) {
        console.error('Error loading student profile:', error);
        showToast('Error loading student profile: ' + error.message, 'error');
        renderErrorState(null);
    } finally {
        showLoading(false);
    }
}

export function setupStudentDetailsNavigation() {
    // Handle browser back button
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

    try {

        if (!flightDetailsModal) {
            flightDetailsModal = new FlightDetailsModal();
        }

        if (!createInvoiceModal) {
            createInvoiceModal = new CreateInvoiceModal();
            await createInvoiceModal.init(); // Wait for initialization
        }

        // Fetch all required data in parallel
        const [
            studentResult,
            flightLogsResult,
            pendingPaymentsResult,
            paymentHistoryResult,
            upcomingBookingsResult
        ] = await Promise.all([
            // Student data
            supabase
                .from('students')
                .select('*')
                .eq('id', studentId)
                .single(),

            // Flight logs
            supabase
                .from('flight_logs')
                .select('*')
                .eq('pilot_uuid', studentId)
                .order('flight_date', { ascending: false })
                .limit(50),

            // Pending payments
            supabase
                .from('payments_receivable')
                .select('*')
                .eq('student_id', studentId)
                .eq('status', 'pending')
                .order('due_date', { ascending: true }),

            // Payment history
            supabase
                .from('transaction_history')
                .select('*')
                .eq('source_id', studentId)
                .order('payment_date', { ascending: false })
                .limit(20),

            // Upcoming bookings
            supabase
                .from('bookings')
                .select(`*, planes (tail_number, model), instructors (first_name, last_name)`)
                .or(`pilot_id.eq.${studentId},student2_id.eq.${studentId},student3_id.eq.${studentId}`)
                .gte('start_time', new Date().toISOString())
                .order('start_time', { ascending: true })
        ]);

        // Handle errors
        const studentError = studentResult.error;
        const flightError = flightLogsResult.error;
        const paymentsError = pendingPaymentsResult.error;
        const historyError = paymentHistoryResult.error;
        const bookingsError = upcomingBookingsResult.error;

        if (studentError) throw studentError;

        // Log non-critical errors but don't throw
        if (flightError) console.error('Error fetching flight logs:', flightError);
        if (paymentsError) console.error('Error fetching payments:', paymentsError);
        if (historyError) console.error('Error fetching payment history:', historyError);
        if (bookingsError) console.error('Error fetching bookings:', bookingsError);

        const student = studentResult.data;
        const flightLogs = flightLogsResult.data || [];
        const pendingPayments = pendingPaymentsResult.data || [];
        const paymentHistory = paymentHistoryResult.data || [];
        const upcomingBookings = upcomingBookingsResult.data || [];

        // Calculate statistics
        const statistics = calculateStudentStatistics(
            student,
            flightLogs,
            pendingPayments,
            paymentHistory,
            upcomingBookings
        );

        // Render the profile
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

    // Calculate hours by flight type
    const hoursByType = {
        solo: flightLogs.filter(f => f.type_of_flight === 'Solo').reduce((sum, f) => sum + (f.flight_duration || 0), 0),
        training: flightLogs.filter(f => f.type_of_flight === 'Training').reduce((sum, f) => sum + (f.flight_duration || 0), 0),
        cross_country: flightLogs.filter(f => f.type_of_flight === 'Cross Country').reduce((sum, f) => sum + (f.flight_duration || 0), 0),
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

    document.getElementById('main-content').innerHTML = /* html */ `
        <!-- Header with Back Button -->
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
                <button id="edit-profile-btn" class="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-500 transition-colors font-medium flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                    Edit Profile
                </button>
            </div>
        </div>

        <!-- Student Header Card -->
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
                            <div class="flex items-center gap-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                </svg>
                                ${s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString() : 'No DOB'}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="text-right">
                    <div class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${s.membership_status === 'active' ? 'bg-green-500/20 text-green-400' :
            s.membership_status === 'inactive' ? 'bg-gray-500/20 text-gray-400' :
                'bg-yellow-500/20 text-yellow-400'
        }">
                        ${s.membership_status || 'inactive'}
                    </div>
                    <div class="mt-2 text-gray-400 text-sm">
                        Student #: ${s.student_number || 'N/A'}
                    </div>
                    <div class="text-gray-400 text-sm">
                        Member since: ${s.join_date ? new Date(s.join_date).toLocaleDateString() : 'N/A'}
                    </div>
                </div>
            </div>
        </div>

        <!-- Stats Overview -->
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
            <!-- Left Column - Personal Info & Documents -->
            <div class="space-y-6">
                <!-- Personal Information -->
                <div class="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
                    <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                        </svg>
                        Personal Information
                    </h3>
                    <div class="space-y-3 text-sm">
                        <div class="flex justify-between py-2 border-b border-gray-700">
                            <span class="text-gray-400">Date of Birth</span>
                            <span class="text-white">${s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString() : 'Not set'}</span>
                        </div>
                        <div class="flex justify-between py-2 border-b border-gray-700">
                            <span class="text-gray-400">Nationality</span>
                            <span class="text-white">${s.nationality || 'Not set'}</span>
                        </div>
                        <div class="flex justify-between py-2 border-b border-gray-700">
                            <span class="text-gray-400">Address</span>
                            <span class="text-white text-right">${s.address || 'Not set'}</span>
                        </div>
                        <div class="flex justify-between py-2 border-b border-gray-700">
                            <span class="text-gray-400">Emergency Contact</span>
                            <span class="text-white">${s.emergency_contact_name || 'Not set'}</span>
                        </div>
                        ${s.emergency_contact_phone ? `
                            <div class="flex justify-between py-2 border-b border-gray-700">
                                <span class="text-gray-400">Emergency Phone</span>
                                <span class="text-white">${s.emergency_contact_phone}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <!-- License & Medical Information -->
                <div class="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
                    <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                        </svg>
                        License & Medical
                    </h3>
                    <div class="space-y-3 text-sm">
                        <div class="flex justify-between py-2 border-b border-gray-700">
                            <span class="text-gray-400">License Number</span>
                            <span class="text-white">${s.license_number || 'Not set'}</span>
                        </div>
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
                        <div class="flex justify-between py-2 border-b border-gray-700">
                            <span class="text-gray-400">Medical Class</span>
                            <span class="text-white">${s.medical_class || 'Not set'}</span>
                        </div>
                        <div class="flex justify-between py-2">
                            <span class="text-gray-400">Medical Expiry</span>
                            <span class="text-white ${s.medical_expiry && new Date(s.medical_expiry) < new Date() ? 'text-red-400' : ''}">
                                ${s.medical_expiry ? new Date(s.medical_expiry).toLocaleDateString() : 'Not set'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Middle Column - Flight Hours & Recent Activity -->
            <div class="space-y-6">
                <!-- Flight Hours Breakdown -->
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
                        <div class="flex justify-between items-center py-2 border-b border-gray-700">
                            <span class="text-gray-400">Cross Country</span>
                            <span class="text-white font-mono">${stats.hoursByType.cross_country.toFixed(1)}</span>
                        </div>
                        <div class="flex justify-between items-center py-2 border-b border-gray-700">
                            <span class="text-gray-400">Night Hours</span>
                            <span class="text-white font-mono">${stats.hoursByType.night.toFixed(1)}</span>
                        </div>
                        <div class="flex justify-between items-center py-2">
                            <span class="text-gray-400">Simulator Hours</span>
                            <span class="text-white font-mono">${s.simulator_hours || '0'}</span>
                        </div>
                    </div>
                </div>

                <!-- Recent Flights -->
                <div class="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold text-white">Recent Flights</h3>
                        <span class="text-gray-400 text-sm">Last 5 flights</span>
                    </div>
                    <div class="space-y-3">
                        ${flightLogs.length > 0 ?
            flightLogs.slice(0, 5).map(flight => `
                                <div class="flex justify-between items-center p-3 bg-gray-750 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors flight-item" data-flight-id="${flight.id}">
                                    <div>
                                        <div class="text-white font-medium">${flight.departure_iata} → ${flight.arrival_iata}</div>
                                        <div class="text-gray-400 text-sm">${new Date(flight.flight_date).toLocaleDateString()} • ${flight.flight_duration}h</div>
                                    </div>
                                    <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium ${flight.type_of_flight === 'Solo' ? 'bg-blue-500/20 text-blue-400' :
                    flight.type_of_flight === 'Training' ? 'bg-green-500/20 text-green-400' :
                        'bg-purple-500/20 text-purple-400'
                }">
                                        ${flight.type_of_flight}
                                    </span>
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

            <!-- Right Column - Financial & Upcoming -->
            <div class="space-y-6">
                <!-- Pending Payments -->
                <div class="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold text-white">Pending Payments</h3>
                        <span class="text-gray-400 text-sm">${pendingPayments.length} invoices</span>
                    </div>
                    <div class="space-y-3">
                        ${pendingPayments.length > 0 ?
            pendingPayments.map(payment => `
                                <div class="flex justify-between items-center p-3 bg-gray-750 rounded-lg">
                                    <div>
                                        <div class="text-white font-medium">$${parseFloat(payment.amount).toFixed(2)}</div>
                                        <div class="text-gray-400 text-sm">Due ${new Date(payment.due_date).toLocaleDateString()}</div>
                                    </div>
                                    <div class="text-right">
                                        <div class="text-yellow-400 text-sm font-medium">Pending</div>
                                        <div class="text-gray-400 text-xs">${payment.description}</div>
                                    </div>
                                </div>
                            `).join('') :
            '<div class="text-center text-gray-500 py-4">No pending payments</div>'
        }
                    </div>
        </div>

                <!-- Upcoming Bookings -->
                <div class="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold text-white">Upcoming Bookings</h3>
                        <span class="text-gray-400 text-sm">Next 7 days</span>
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
                                    ${booking.instructors ? `
                                    <div class="text-gray-400 text-sm mt-1">
                                        Instructor: ${booking.instructors.first_name} ${booking.instructors.last_name}
                                    </div>
                                ` : ''}
                                </div>
                            `).join('') :
            '<div class="text-center text-gray-500 py-4">No upcoming bookings</div>'
        }
                    </div>
                </div>

                <!-- Quick Actions -->
                <div class="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
                    <h3 class="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                    <div class="grid grid-cols-2 gap-3">
                        <button class="quick-action p-3 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors text-white text-sm font-medium flex items-center justify-center gap-2" data-action="add-flight">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                            </svg>
                            Add Flight Log
                        </button>
                        <button class="quick-action p-3 bg-green-600 hover:bg-green-500 rounded-lg transition-colors text-white text-sm font-medium flex items-center justify-center gap-2" data-action="create-invoice">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                            </svg>
                            Create Invoice
                        </button>
                        <button class="quick-action p-3 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors text-white text-sm font-medium flex items-center justify-center gap-2" data-action="schedule-booking">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                            Schedule Booking
                        </button>
                        <button class="quick-action p-3 bg-orange-600 hover:bg-orange-500 rounded-lg transition-colors text-white text-sm font-medium flex items-center justify-center gap-2" data-action="generate-report">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            See report
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
            <button id="back-button" class="text-blue-400 hover:text-blue-300 transition-colors cursor-pointer">
                ← Back
            </button>
        </div>
        <div class="text-center text-gray-500 py-8">
            <svg class="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
            <h3 class="text-lg font-medium text-gray-300 mb-2">Error Loading Profile</h3>
            <p class="text-gray-500">Unable to load student profile. Please try again.</p>
            <button id="retry-btn" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors">
                Retry
            </button>
        </div>
    `;

    document.getElementById('back-button').addEventListener('click', goBack);
    document.getElementById('retry-btn').addEventListener('click', () => renderStudentProfile(studentId));
}

function setupStudentDetailsEventListeners(studentId) {
    // Back button
    document.getElementById('back-button').addEventListener('click', goBack);

    // Edit profile
    document.getElementById('edit-profile-btn').addEventListener('click', async () => {
        // We need to get the student UUID first since editStudent expects UUID
        const { data: student, error } = await supabase
            .from('students')
            .select('id')
            .eq('student_number', currentStudentNumber) // Use currentStudentNumber
            .single();

        if (student && !error) {
            editStudent(student.id);
        } else {
            showToast('Error loading student for editing', 'error');
        }
    });

    // Flight item clicks
    document.addEventListener('click', (e) => {
        const flightItem = e.target.closest('.flight-item');
        if (flightItem) {
            const flightId = flightItem.getAttribute('data-flight-id');
            handleFlightClick(flightId);
        }
    });

    // Quick actions
    document.querySelectorAll('.quick-action').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = e.target.closest('.quick-action').getAttribute('data-action');
            handleQuickAction(action, currentStudentNumber); // Use currentStudentNumber instead of studentId
        });
    });

    // Process payment
    document.querySelectorAll('.process-payment').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const paymentId = e.target.getAttribute('data-payment-id');
            await processPayment(paymentId, studentId);
        });
    });

    // View all flights
    const viewAllFlightsBtn = document.querySelector('.view-all-flights');
    if (viewAllFlightsBtn) {
        viewAllFlightsBtn.addEventListener('click', () => {
            loadFlightHistory(studentId);
        });
    }
}

async function loadFlightHistory(studentId) {
    try {
        const { data: flightLogs, error } = await supabase
            .from('flight_logs')
            .select('*')
            .eq('pilot_uuid', studentId)
            .order('flight_date', { ascending: false });

        if (error) throw error;

        // Create a modal or page showing all flights with click functionality
        showAllFlightsModal(flightLogs);
    } catch (error) {
        console.error('Error loading flight history:', error);
        showToast('Error loading flight history', 'error');
    }
}

async function processPayment(paymentId, studentId) {
    try {
        showToast('Processing payment...', 'info');

        const { error } = await supabase
            .from('payments_receivable')
            .update({
                status: 'paid',
                paid_at: new Date().toISOString(),
                payment_method: 'card'
            })
            .eq('id', paymentId);

        if (error) throw error;

        showToast('Payment processed successfully!', 'success');
        // Refresh the profile to update the UI
        await renderStudentProfile(studentId);
    } catch (error) {
        console.error('Error processing payment:', error);
        showToast('Error processing payment', 'error');
    }
}

async function sendPaymentReminder(paymentId) {
    try {
        showToast('to be implemented', 'info');
        // Implementation to send payment reminder
    } catch (error) {
        console.error('Error sending reminder:', error);
        showToast('Error sending reminder', 'error');
    }
}

function calculateMonthlyProgress(flights) {
    // Implementation to calculate monthly progress
    return flights.reduce((acc, flight) => {
        const month = new Date(flight.flight_date).toLocaleDateString('en', { month: 'short', year: 'numeric' });
        acc[month] = (acc[month] || 0) + (flight.flight_duration || 0);
        return acc;
    }, {});
}

async function updateStudentStatus(studentId, newStatus) {
    try {
        const { error } = await supabase
            .from('students')
            .update({ membership_status: newStatus })
            .eq('id', studentId);

        if (error) throw error;

        showToast(`Student status updated to ${newStatus}`, 'success');
        await renderStudentProfile(studentId);
    } catch (error) {
        console.error('Error updating student status:', error);
        showToast('Error updating student status', 'error');
    }
}

async function handleQuickAction(action, studentNumber) {
    let currentModal = null;

    switch (action) {
        case 'add-flight':
            // Get UUID from student number
            const { data: student, error } = await supabase
                .from('students')
                .select('id')
                .eq('student_number', studentNumber) // Use the parameter
                .single();

            if (student && !error) {
                currentModal = new AddFlightLogModal();
                currentModal.init().then(() => {
                    currentModal.show({
                        pilotId: student.id
                    });

                    // Handle successful submission
                    currentModal.onSuccess(() => {
                        // Refresh student profile after successful flight log submission
                        renderStudentProfileByNumber(studentNumber); // Use studentNumber here
                        cleanupModal();
                    });

                    // Handle modal close (cancel, ESC, or backdrop click)
                    currentModal.onClose(() => {
                        cleanupModal();
                    });
                });
            } else {
                showToast('Error loading student data', 'error');
            }
            break;


        case 'create-invoice':
            // Get UUID from student number
            const { data: invoiceStudent, error: invoiceError } = await supabase
                .from('students')
                .select('id')
                .eq('student_number', studentNumber)
                .single();

            if (invoiceStudent && !invoiceError && createInvoiceModal) {
                createInvoiceModal.show({
                    studentId: invoiceStudent.id
                });

                const invoiceSuccessHandler = () => {
                    renderStudentProfileByNumber(studentNumber);
                    document.removeEventListener('invoiceCreated', invoiceSuccessHandler);
                };

                document.addEventListener('invoiceCreated', invoiceSuccessHandler);
            }
            break;

        case 'schedule-booking':
            // Get UUID from student number
            const { data: bookingStudent, error: bookingError } = await supabase
                .from('students')
                .select('id')
                .eq('student_number', studentNumber)
                .single();

            if (bookingStudent && !bookingError) {
                // Wait a bit for cleanup to complete
                setTimeout(() => {
                    createAddBookingModal(bookingStudent.id); // This now uses the updated function
                }, 100);
            } else {
                showToast('Error loading student data', 'error');
            }
            break;

        case 'generate-report':
            showToast('Report generation feature coming soon...', 'info');
            // Future implementation for report generation
            break;

        default:
            console.warn('Unknown action:', action);
    }

    function cleanupModal() {
        // Remove event listeners
        if (action === 'create-invoice') {
            document.removeEventListener('invoiceCreated', invoiceSuccessHandler);
        }

        // Destroy modal instance if it has a destroy method
        if (currentModal && typeof currentModal.destroy === 'function') {
            currentModal.destroy();
        }

        // Clear reference for garbage collection
        currentModal = null;
    }
}

function createAddBookingModal(studentId) {
    console.log('🛠️ Creating FRESH AddBookingModal instance...');

    // ✅ ALWAYS CREATE A NEW INSTANCE
    const modal = new AddBookingModal();

    // Set up success callback
    modal.onSuccess(async (newBooking) => {
        console.log('✅ Booking created successfully:', newBooking);
        showToast('Booking created successfully!', 'success');
        // Refresh the student profile to show updated bookings
        await renderStudentProfileByNumber(currentStudentNumber);
        closeActiveModal();
    });

    // Set up close callback
    modal.onClose(() => {
        console.log('📝 AddBookingModal closed');
        closeActiveModal();
    });

    currentBookingModal = modal;

    // ✅ CHANGED: Use personId instead of studentId
    modal.show({ personId: studentId }).catch(error => {
        console.error('Failed to show AddBookingModal:', error);
        showToast('Error opening booking form: ' + error.message, 'error');
    });
}

function closeActiveModal() {
    console.log('❌ closeActiveModal called');

    // Prevent multiple calls
    if (window.isClosingModal) return;
    window.isClosingModal = true;

    // Clear any pending timeouts
    if (modalCleanupTimeout) {
        clearTimeout(modalCleanupTimeout);
        modalCleanupTimeout = null;
    }

    // Clean up booking modal
    if (currentBookingModal) {
        // Store reference and clear immediately to prevent recursion
        const modalToClose = currentBookingModal;
        currentBookingModal = null;

        if (typeof modalToClose.close === 'function') {
            modalToClose.close();
        } else if (typeof modalToClose.hide === 'function') {
            modalToClose.hide();
        } else if (typeof modalToClose.destroy === 'function') {
            modalToClose.destroy();
        } else if (typeof modalToClose.cleanup === 'function') {
            modalToClose.cleanup();
        }
    }

    // Reset the flag after a short delay
    setTimeout(() => {
        window.isClosingModal = false;
    }, 100);
}

function goBack() {
    console.log('🔙 Going back, cleaning up modals...');

    // Clean up any active modal instances
    closeActiveModal();

    // Navigate back to students list using hash routing
    window.history.pushState({}, '', '#students');

    // Navigate back to students list using the event system
    window.dispatchEvent(new CustomEvent('navigate', {
        detail: { page: 'students' }
    }));
}

export function cleanupStudentDetailsPage() {
    console.log('🧹 Cleaning up student details page...');

    closeActiveModal();

    // Clear any remaining timeouts
    if (modalCleanupTimeout) {
        clearTimeout(modalCleanupTimeout);
        modalCleanupTimeout = null;
    }

    // Reset student number
    currentStudentNumber = null;
}

function showLoading(show) {
    const existingLoader = document.getElementById('loading-overlay');
    if (show) {
        if (!existingLoader) {
            const loader = document.createElement('div');
            loader.id = 'loading-overlay';
            loader.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
            loader.innerHTML = `
                <div class="bg-gray-800 rounded-xl p-6 flex items-center gap-3">
                    <div class="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span class="text-white">Loading...</span>
                </div>
            `;
            document.body.appendChild(loader);
        }
    } else {
        if (existingLoader) {
            existingLoader.remove();
        }
    }
}

async function handleFlightClick(flightId) {
    try {
        showToast('Loading flight details...', 'info');

        // Fetch the complete flight data
        const { data: flightData, error } = await supabase
            .from('flight_logs')
            .select('*')
            .eq('id', flightId)
            .single();

        if (error) throw error;

        // Show the flight details modal
        if (flightDetailsModal && flightData) {
            flightDetailsModal.show(flightData);
        } else {
            showToast('Error loading flight details', 'error');
        }
    } catch (error) {
        console.error('Error loading flight details:', error);
        showToast('Error loading flight details', 'error');
    }
}

// Export the main function
export default {
    loadStudentDetailsPage,
    setupStudentDetailsNavigation,
    cleanupStudentDetailsPage
};