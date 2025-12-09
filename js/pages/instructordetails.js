// ./js/pages/instructordetails.js
import { supabase } from "../supabase.js";
import { showToast } from "../components/showToast.js";
import { editInstructor } from './instructors.js';
import { FlightDetailsModal } from "../modals/FlightDetailsModal.js";
import { AddFlightLogModal } from "../modals/AddFlightLogModal.js";
import { AddBookingModal } from "../modals/AddBookingModal.js";

let currentInstructorId = null;
let previousPageState = null;
let flightDetailsModal = new FlightDetailsModal();

// Declare missing variables
let instructorsData = [];
let currentPage = 1;
let sortState = {};
let searchState = {};
let tableStateBackup = {};

let currentInstructorEmail = null;
let currentBookingModal = null;
let modalCleanupTimeout = null;

export async function loadInstructorDetailsPage(instructorId = null) {
    // Get instructor ID from URL hash or passed parameter
    const hash = window.location.hash;
    const instructorMatch = hash.match(/^#instructor\/([A-Za-z0-9-]+)$/);
    const instructorIdFromUrl = instructorMatch ? instructorMatch[1] : null;
    currentInstructorId = instructorId || instructorIdFromUrl;

    if (!currentInstructorId) {
        showToast('No instructor ID provided', 'error');
        return;
    }

    // Store previous state for back navigation
    previousPageState = {
        page: document.getElementById('main-content').innerHTML,
        scrollPosition: window.scrollY
    };

    await renderInstructorProfile(currentInstructorId);
}

export function setupInstructorDetailsNavigation() {
    // Handle browser back button
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

    try {
        if (!flightDetailsModal) {
            flightDetailsModal = new FlightDetailsModal();
        }

        // Fetch all required data in parallel
        const [
            instructorResult,
            flightLogsResult,
            upcomingBookingsResult,
            recentStudentsResult
        ] = await Promise.all([
            // Instructor data
            supabase
                .from('instructors')
                .select('*')
                .eq('id', instructorId)
                .single(),

            // Flight logs as instructor - FIXED: using instructor_uuid instead of instructor_id
            supabase
                .from('flight_logs')
                .select('*')
                .eq('instructor_uuid', instructorId)
                .order('flight_date', { ascending: false })
                .limit(50),

            // Upcoming bookings as instructor - FIXED: specify exact relationship
            supabase
                .from('bookings')
                .select(`*, planes (tail_number, model), students!bookings_student2_id_fkey (first_name, last_name, student_number)`)
                .eq('instructor_id', instructorId)
                .gte('start_time', new Date().toISOString())
                .order('start_time', { ascending: true })
                .limit(10),

            // Recent students taught (from flight logs) - FIXED: using instructor_uuid
            supabase
                .from('flight_logs')
                .select(`pilot_uuid, students (first_name, last_name, student_number)`)
                .eq('instructor_uuid', instructorId)
                .not('pilot_uuid', 'is', null)
                .order('flight_date', { ascending: false })
                .limit(20)
        ]);

        // Handle errors
        const instructorError = instructorResult.error;
        const flightError = flightLogsResult.error;
        const bookingsError = upcomingBookingsResult.error;
        const studentsError = recentStudentsResult.error;

        if (instructorError) throw instructorError;

        // Log non-critical errors but don't throw
        if (flightError) console.error('Error fetching flight logs:', flightError);
        if (bookingsError) console.error('Error fetching bookings:', bookingsError);
        if (studentsError) console.error('Error fetching recent students:', studentsError);

        const instructor = instructorResult.data;
        const flightLogs = flightLogsResult.data || [];
        const upcomingBookings = upcomingBookingsResult.data || [];
        const recentStudentsData = recentStudentsResult.data || [];

        // Process recent students (remove duplicates)
        const recentStudents = recentStudentsData
            .filter((item, index, self) =>
                index === self.findIndex(t =>
                    t.pilot_uuid === item.pilot_uuid &&
                    t.students?.student_number === item.students?.student_number
                )
            )
            .map(item => item.students)
            .filter(student => student != null)
            .slice(0, 8);

        // Calculate statistics
        const statistics = calculateInstructorStatistics(
            instructor,
            flightLogs,
            upcomingBookings,
            recentStudents
        );

        // Render the profile
        renderProfileHTML(instructor, statistics, flightLogs, upcomingBookings, recentStudents);
        setupInstructorDetailsEventListeners(instructorId);

    } catch (error) {
        console.error('Error loading instructor profile:', error);
        showToast('Error loading instructor profile: ' + error.message, 'error');
        renderErrorState(instructorId);
    } finally {
        showLoading(false);
    }
}

function calculateInstructorStatistics(instructor, flightLogs, upcomingBookings, recentStudents) {
    const totalFlights = flightLogs.length;
    const totalHours = flightLogs.reduce((sum, flight) => sum + parseFloat(flight.flight_duration || 0), 0);

    // Calculate hours by flight type based on actual schema values
    const soloFlights = flightLogs.filter(f => f.type_of_flight === 'P');
    const trainingFlights = flightLogs.filter(f =>
        f.type_of_flight === 'EP / I' ||
        f.type_of_flight === 'EP / FE' ||
        f.type_of_flight === 'P / I'
    );
    const crossCountryFlights = flightLogs.filter(f => f.nature_of_flight === 'nav');
    const localFlights = flightLogs.filter(f => f.nature_of_flight === 'loc');
    const patternFlights = flightLogs.filter(f => f.nature_of_flight === 'pat');

    const hoursByType = {
        solo: soloFlights.reduce((sum, f) => sum + (f.flight_duration || 0), 0),
        training: trainingFlights.reduce((sum, f) => sum + (f.flight_duration || 0), 0),
        cross_country: crossCountryFlights.reduce((sum, f) => sum + (f.flight_duration || 0), 0),
        local: localFlights.reduce((sum, f) => sum + (f.flight_duration || 0), 0),
        pattern: patternFlights.reduce((sum, f) => sum + (f.flight_duration || 0), 0)
    };

    return {
        totalFlights,
        totalHours,
        hoursByType,
        upcomingBookingsCount: upcomingBookings.length,
        recentStudentsCount: recentStudents.length,
        averageFlightDuration: totalFlights > 0 ? (totalHours / totalFlights).toFixed(1) : 0
    };
}

function renderProfileHTML(instructor, stats, flightLogs, upcomingBookings, recentStudents) {
    const i = instructor;

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
                <h1 class="text-2xl font-bold text-white">Instructor Profile</h1>
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

        <!-- Instructor Header Card -->
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
                        Total Hours: ${i.total_hours || '0'}
                    </div>
                    ${i.ratings ? `
                        <div class="text-gray-400 text-sm">
                            Ratings: ${i.ratings}
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>

        <!-- Stats Overview -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div class="bg-gradient-to-br from-purple-600 to-purple-700 p-4 rounded-xl shadow-lg">
                <div class="text-purple-200 text-sm font-medium">Total Instruction Hours</div>
                <div class="text-2xl font-bold text-white mt-1">${stats.totalHours.toFixed(1)}</div>
                <div class="text-purple-200 text-xs">${stats.totalFlights} flights</div>
            </div>
            <div class="bg-gradient-to-br from-blue-600 to-blue-700 p-4 rounded-xl shadow-lg">
                <div class="text-blue-200 text-sm font-medium">Upcoming Bookings</div>
                <div class="text-2xl font-bold text-white mt-1">${stats.upcomingBookingsCount}</div>
                <div class="text-blue-200 text-xs">Scheduled</div>
            </div>
            <div class="bg-gradient-to-br from-green-600 to-green-700 p-4 rounded-xl shadow-lg">
                <div class="text-green-200 text-sm font-medium">Recent Students</div>
                <div class="text-2xl font-bold text-white mt-1">${stats.recentStudentsCount}</div>
                <div class="text-green-200 text-xs">Last 30 days</div>
            </div>
            <div class="bg-gradient-to-br from-orange-600 to-orange-700 p-4 rounded-xl shadow-lg">
                <div class="text-orange-200 text-sm font-medium">Avg Flight Duration</div>
                <div class="text-2xl font-bold text-white mt-1">${stats.averageFlightDuration}h</div>
                <div class="text-orange-200 text-xs">Per session</div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Left Column - Personal Info & Ratings -->
            <div class="space-y-6">
                <!-- Personal Information -->
                <div class="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
                    <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                        </svg>
                        Instructor Information
                    </h3>
                    <div class="space-y-3 text-sm">
                        <div class="flex justify-between py-2 border-b border-gray-700">
                            <span class="text-gray-400">Full Name</span>
                            <span class="text-white">${i.first_name || ''} ${i.last_name || ''}</span>
                        </div>
                        <div class="flex justify-between py-2 border-b border-gray-700">
                            <span class="text-gray-400">Email</span>
                            <span class="text-white">${i.email || 'Not set'}</span>
                        </div>
                        <div class="flex justify-between py-2 border-b border-gray-700">
                            <span class="text-gray-400">Total Hours</span>
                            <span class="text-white">${i.total_hours || '0'}</span>
                        </div>
                        <div class="flex justify-between py-2">
                            <span class="text-gray-400">Member Since</span>
                            <span class="text-white">${i.created_at ? new Date(i.created_at).toLocaleDateString() : 'N/A'}</span>
                        </div>
                    </div>
                </div>

                <!-- Ratings & Certifications -->
                <div class="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
                    <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                        </svg>
                        Ratings & Certifications
                    </h3>
                    <div class="space-y-3 text-sm">
                        ${i.ratings ? `
                            <div class="py-2">
                                <span class="text-gray-400">Current Ratings:</span>
                                <div class="text-white mt-1">${i.ratings}</div>
                            </div>
                        ` : `
                            <div class="text-center text-gray-500 py-4">
                                No ratings specified
                            </div>
                        `}
                    </div>
                </div>
            </div>

            <!-- Middle Column - Flight Hours & Recent Activity -->
            <div class="space-y-6">
                <!-- Flight Hours Breakdown -->
                <div class="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
                    <h3 class="text-lg font-semibold text-white mb-4">Instruction Hours Breakdown</h3>
                    <div class="space-y-3 text-sm">
                        <div class="flex justify-between items-center py-2 border-b border-gray-700">
                            <span class="text-gray-400">Total Instruction Hours</span>
                            <span class="text-white font-mono">${stats.totalHours.toFixed(1)}</span>
                        </div>
                        <div class="flex justify-between items-center py-2 border-b border-gray-700">
                            <span class="text-gray-400">Solo Supervision (P)</span>
                            <span class="text-white font-mono">${stats.hoursByType.solo.toFixed(1)}</span>
                        </div>
                        <div class="flex justify-between items-center py-2 border-b border-gray-700">
                            <span class="text-gray-400">Dual Instruction</span>
                            <span class="text-white font-mono">${stats.hoursByType.training.toFixed(1)}</span>
                        </div>
                        <div class="flex justify-between items-center py-2 border-b border-gray-700">
                            <span class="text-gray-400">Cross Country (NAV)</span>
                            <span class="text-white font-mono">${stats.hoursByType.cross_country.toFixed(1)}</span>
                        </div>
                        <div class="flex justify-between items-center py-2">
                            <span class="text-gray-400">Local/Pattern</span>
                            <span class="text-white font-mono">${(stats.hoursByType.local + stats.hoursByType.pattern).toFixed(1)}</span>
                        </div>
                    </div>
                </div>

                <!-- Recent Instruction Flights -->
                <div class="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold text-white">Recent Instruction Flights</h3>
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
                                    <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium ${flight.type_of_flight === 'P' ? 'bg-blue-500/20 text-blue-400' :
                    flight.type_of_flight === 'EP / I' ? 'bg-green-500/20 text-green-400' :
                        flight.type_of_flight === 'EP / FE' ? 'bg-purple-500/20 text-purple-400' :
                            flight.type_of_flight === 'P / I' ? 'bg-orange-500/20 text-orange-400' :
                                'bg-gray-500/20 text-gray-400'
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

            <!-- Right Column - Schedule & Recent Students -->
            <div class="space-y-6">
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
                                    ${booking.students ? `
                                    <div class="text-gray-400 text-sm mt-1">
                                        Student: ${booking.students.first_name} ${booking.students.last_name}
                                    </div>
                                    ` : ''}
                                </div>
                            `).join('') :
            '<div class="text-center text-gray-500 py-4">No upcoming bookings</div>'
        }
                    </div>
                </div>

                <!-- Recent Students -->
                <div class="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold text-white">Recent Students</h3>
                        <span class="text-gray-400 text-sm">Last 30 days</span>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        ${recentStudents.length > 0 ?
            recentStudents.map(student => `
                                <div class="p-3 bg-gray-750 rounded-lg text-center">
                                    <div class="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold mx-auto mb-2">
                                        ${student.first_name?.[0]?.toUpperCase() || 'S'}${student.last_name?.[0]?.toUpperCase() || 'T'}
                                    </div>
                                    <div class="text-white text-sm font-medium truncate">${student.first_name} ${student.last_name}</div>
                                    <div class="text-gray-400 text-xs">${student.student_number}</div>
                                </div>
                            `).join('') :
            '<div class="col-span-2 text-center text-gray-500 py-4">No recent students</div>'
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
                        <button class="quick-action p-3 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors text-white text-sm font-medium flex items-center justify-center gap-2" data-action="schedule-booking">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                            Schedule Booking
                        </button>
                        <button class="quick-action p-3 bg-green-600 hover:bg-green-500 rounded-lg transition-colors text-white text-sm font-medium flex items-center justify-center gap-2" data-action="update-hours">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            Update Hours
                        </button>
                        <button class="quick-action p-3 bg-orange-600 hover:bg-orange-500 rounded-lg transition-colors text-white text-sm font-medium flex items-center justify-center gap-2" data-action="generate-report">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            Generate Report
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderErrorState(instructorId) {
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
            <p class="text-gray-500">Unable to load instructor profile. Please try again.</p>
            <button id="retry-btn" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors">
                Retry
            </button>
        </div>
    `;

    document.getElementById('back-button').addEventListener('click', goBack);
    document.getElementById('retry-btn').addEventListener('click', () => renderInstructorProfile(instructorId));
}

function setupInstructorDetailsEventListeners(instructorId) {
    // Back button
    document.getElementById('back-button').addEventListener('click', goBack);

    // Edit profile
    document.getElementById('edit-profile-btn').addEventListener('click', () => {
        editInstructor(instructorId);
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
            handleQuickAction(action, instructorId);
        });
    });

    // View all flights
    const viewAllFlightsBtn = document.querySelector('.view-all-flights');
    if (viewAllFlightsBtn) {
        viewAllFlightsBtn.addEventListener('click', () => {
            loadFlightHistory(instructorId);
        });
    }
}

async function loadFlightHistory(instructorId) {
    try {
        const { data: flightLogs, error } = await supabase
            .from('flight_logs')
            .select('*')
            .eq('instructor_uuid', instructorId) // FIXED: using instructor_uuid
            .order('flight_date', { ascending: false });

        if (error) throw error;

        showAllFlightsModal(flightLogs);
    } catch (error) {
        console.error('Error loading flight history:', error);
        showToast('Error loading flight history', 'error');
    }
}

function showAllFlightsModal(flightLogs) {
    // Implementation for showing all flights in a modal
    showToast('All flights modal to be implemented', 'info');
}

async function handleQuickAction(action, instructorId) {
    let currentModal = null;

    switch (action) {
        case 'add-flight':
            currentModal = new AddFlightLogModal();
            currentModal.init().then(() => {
                currentModal.show({
                    instructorId: instructorId
                });

                currentModal.onSuccess(() => {
                    renderInstructorProfile(instructorId);
                    cleanupModal();
                });

                currentModal.onClose(() => {
                    cleanupModal();
                });
            });
            break;

        case 'schedule-booking':
            setTimeout(() => {
                // ✅ This now uses the updated createAddBookingModal function
                createAddBookingModal(instructorId, 'instructor');
            }, 100);
            break;

        case 'update-hours':
            await updateInstructorHours(instructorId);
            break;

        case 'generate-report':
            showToast('Report generation feature coming soon...', 'info');
            break;

        default:
            console.warn('Unknown action:', action);
    }

    function cleanupModal() {
        if (currentModal && typeof currentModal.destroy === 'function') {
            currentModal.destroy();
        }
        currentModal = null;
    }
}

async function updateInstructorHours(instructorId) {
    try {
        // Calculate total hours from flight logs - FIXED: using instructor_uuid
        const { data: flightLogs, error } = await supabase
            .from('flight_logs')
            .select('flight_duration')
            .eq('instructor_uuid', instructorId);

        if (error) throw error;

        const totalHours = flightLogs.reduce((sum, flight) => sum + parseFloat(flight.flight_duration || 0), 0);

        // Update instructor record
        const { error: updateError } = await supabase
            .from('instructors')
            .update({ total_hours: totalHours })
            .eq('id', instructorId);

        if (updateError) throw updateError;

        showToast(`Instructor hours updated to ${totalHours.toFixed(1)}`, 'success');
        await renderInstructorProfile(instructorId);
    } catch (error) {
        console.error('Error updating instructor hours:', error);
        showToast('Error updating instructor hours', 'error');
    }
}

function createAddBookingModal(instructorId, role) {
    console.log('🛠️ Creating FRESH AddBookingModal instance for instructor...');

    const modal = new AddBookingModal();

    modal.onSuccess(async (newBooking) => {
        console.log('✅ Booking created successfully:', newBooking);
        showToast('Booking created successfully!', 'success');
        await renderInstructorProfile(instructorId);
        closeActiveModal();
    });

    modal.onClose(() => {
        console.log('📝 AddBookingModal closed');
        closeActiveModal();
    });

    currentBookingModal = modal;

    // ✅ CHANGED: Use personId instead of instructorId
    modal.show({ personId: instructorId }).catch(error => {
        console.error('Failed to show AddBookingModal:', error);
        showToast('Error opening booking form: ' + error.message, 'error');
    });
}

function closeActiveModal() {
    console.log('❌ closeActiveModal called');

    if (window.isClosingModal) return;
    window.isClosingModal = true;

    if (modalCleanupTimeout) {
        clearTimeout(modalCleanupTimeout);
        modalCleanupTimeout = null;
    }

    if (currentBookingModal) {
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

    setTimeout(() => {
        window.isClosingModal = false;
    }, 100);
}

function goBack() {
    console.log('🔙 Going back, cleaning up modals...');

    closeActiveModal();

    window.history.pushState({}, '', '#instructors');

    window.dispatchEvent(new CustomEvent('navigate', {
        detail: { page: 'instructors' }
    }));
}

export function cleanupInstructorDetailsPage() {
    console.log('🧹 Cleaning up instructor details page...');

    closeActiveModal();

    if (modalCleanupTimeout) {
        clearTimeout(modalCleanupTimeout);
        modalCleanupTimeout = null;
    }

    currentInstructorId = null;
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

        const { data: flightData, error } = await supabase
            .from('flight_logs')
            .select('*')
            .eq('id', flightId)
            .single();

        if (error) throw error;

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
    loadInstructorDetailsPage,
    setupInstructorDetailsNavigation,
    cleanupInstructorDetailsPage
};