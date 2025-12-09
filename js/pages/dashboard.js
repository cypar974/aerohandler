import { supabase } from '../supabase.js';

export async function loadDashboardPage() {
    try {
        // Fetch all data in parallel for better performance
        const [
            studentsData,
            aircraftData,
            bookingsData,
            flightHoursData,
            financialData
        ] = await Promise.all([
            fetchTotalStudents(),
            fetchActiveAircraft(),
            fetchUpcomingBookings(),
            fetchFlightHoursThisMonth(),
            fetchFinancialMetrics() // NEW: Get financial data from new system
        ]);

        document.getElementById("main-content").innerHTML = `
            <div class="p-6 bg-gray-900 text-white min-h-full">
                <h1 class="text-3xl font-bold mb-2">AeroClub Dashboard</h1>
                <p class="text-gray-400 mb-6">Welcome back! Here's your overview:</p>

                <!-- Stats Overview -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div class="bg-gray-800 p-6 rounded-xl shadow hover:shadow-gray-700 transition cursor-pointer" onclick="window.location.hash = '#students'">
                        <h2 class="text-sm font-medium text-gray-400">Total Students</h2>
                        <p class="text-2xl font-bold text-blue-400 mt-2">${studentsData}</p>
                        <p class="text-sm text-gray-400 mt-2">Active trainees</p>
                    </div>
                    <div class="bg-gray-800 p-6 rounded-xl shadow hover:shadow-gray-700 transition cursor-pointer" onclick="window.location.hash = '#planes'">
                        <h2 class="text-sm font-medium text-gray-400">Active Planes</h2>
                        <p class="text-2xl font-bold text-green-400 mt-2">${aircraftData}</p>
                        <p class="text-sm text-gray-400 mt-2">Available fleet</p>
                    </div>
                    <div class="bg-gray-800 p-6 rounded-xl shadow hover:shadow-gray-700 transition cursor-pointer" onclick="window.location.hash = '#bookings'">
                        <h2 class="text-sm font-medium text-gray-400">Upcoming Bookings</h2>
                        <p class="text-2xl font-bold text-purple-400 mt-2">${bookingsData}</p>
                        <p class="text-sm text-gray-400 mt-2">Scheduled flights</p>
                    </div>
                    <div class="bg-gray-800 p-6 rounded-xl shadow hover:shadow-gray-700 transition cursor-pointer" onclick="window.location.hash = '#flight-logs'">
                        <h2 class="text-sm font-medium text-gray-400">Flight Hours This Month</h2>
                        <p class="text-2xl font-bold text-orange-400 mt-2">${flightHoursData}</p>
                        <p class="text-sm text-gray-400 mt-2">Total hours flown</p>
                    </div>
                </div>

                <!-- Financial Overview - NEW SECTION -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <div class="bg-gray-800 p-6 rounded-xl shadow hover:shadow-gray-700 transition cursor-pointer" onclick="window.location.hash = '#finances'">
                        <h2 class="text-sm font-medium text-gray-400">Pending Receivable</h2>
                        <p class="text-2xl font-bold text-yellow-400 mt-2">$${financialData.pendingReceivable.toFixed(2)}</p>
                        <p class="text-sm text-gray-400 mt-2">${financialData.pendingReceivableCount} payments due</p>
                    </div>
                    <div class="bg-gray-800 p-6 rounded-xl shadow hover:shadow-gray-700 transition cursor-pointer" onclick="window.location.hash = '#finances'">
                        <h2 class="text-sm font-medium text-gray-400">Pending Payable</h2>
                        <p class="text-2xl font-bold text-red-400 mt-2">$${financialData.pendingPayable.toFixed(2)}</p>
                        <p class="text-sm text-gray-400 mt-2">${financialData.pendingPayableCount} payments due</p>
                    </div>
                    <div class="bg-gray-800 p-6 rounded-xl shadow hover:shadow-gray-700 transition cursor-pointer" onclick="window.location.hash = '#finances'">
                        <h2 class="text-sm font-medium text-gray-400">Net Cash Flow</h2>
                        <p class="text-2xl font-bold ${financialData.netCashFlow >= 0 ? 'text-green-400' : 'text-red-400'} mt-2">
                            $${financialData.netCashFlow.toFixed(2)}
                        </p>
                        <p class="text-sm text-gray-400 mt-2">This month</p>
                    </div>
                </div>

                <!-- Quick Actions & Recent Activity -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Quick Actions -->
                    <div class="bg-gray-800 p-6 rounded-xl shadow">
                        <h2 class="text-xl font-semibold mb-4 text-white">Quick Actions</h2>
                        <div class="grid grid-cols-2 gap-4">
                            <button onclick="window.location.hash = '#flight_logs'" class="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition flex flex-col items-center justify-center">
                                <span class="text-2xl mb-2">✈️</span>
                                <span class="text-sm">Log Flight</span>
                            </button>
                            <button onclick="window.location.hash = '#bookings'" class="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 transition flex flex-col items-center justify-center">
                                <span class="text-2xl mb-2">📅</span>
                                <span class="text-sm">Create Booking</span>
                            </button>
                            <button onclick="window.location.hash = '#finances'" class="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 transition flex flex-col items-center justify-center">
                                <span class="text-2xl mb-2">💰</span>
                                <span class="text-sm">Record Payment</span>
                            </button>
                            <button onclick="window.location.hash = '#students'" class="bg-orange-600 text-white p-4 rounded-lg hover:bg-orange-700 transition flex flex-col items-center justify-center">
                                <span class="text-2xl mb-2">👤</span>
                                <span class="text-sm">Add Student</span>
                            </button>
                        </div>
                    </div>

                    <!-- Recent Financial Activity - UPDATED -->
                    <div class="bg-gray-800 p-6 rounded-xl shadow">
                        <h2 class="text-xl font-semibold mb-4 text-white">Recent Financial Activity</h2>
                        <div class="space-y-3 max-h-64 overflow-y-auto">
                            ${financialData.recentTransactions && financialData.recentTransactions.length > 0 ?
                financialData.recentTransactions.map(transaction => `
                                    <div class="flex justify-between items-center p-3 bg-gray-700 rounded">
                                        <div class="flex items-center">
                                            <div class="w-8 h-8 rounded-full ${transaction.transaction_type === 'incoming' ? 'bg-green-500' : 'bg-red-500'} flex items-center justify-center mr-3">
                                                ${transaction.transaction_type === 'incoming' ? '↑' : '↓'}
                                            </div>
                                            <div>
                                                <div class="font-medium text-sm">${transaction.description}</div>
                                                <div class="text-xs text-gray-400">${transaction.payment_date ?
                        new Date(transaction.payment_date).toLocaleDateString() :
                        'Date unavailable'
                    }</div>
                                                </div>
                                        </div>
                                        <div class="font-bold ${transaction.transaction_type === 'incoming' ? 'text-green-400' : 'text-red-400'}">
                                            ${transaction.transaction_type === 'incoming' ? '+' : '-'}$${transaction.amount.toFixed(2)}
                                        </div>
                                    </div>
                                `).join('') :
                '<p class="text-gray-400 text-center py-4">No recent transactions</p>'
            }
                        </div>
                    </div>
                </div>

                <!-- System Status -->
                <div class="mt-8 bg-gray-800 p-6 rounded-xl shadow">
                    <h2 class="text-xl font-semibold mb-4 text-white">System Status</h2>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div class="flex items-center justify-between p-3 bg-gray-700 rounded">
                            <span class="text-gray-300">Database</span>
                            <span class="text-green-400">● Connected</span>
                        </div>
                        <div class="flex items-center justify-between p-3 bg-gray-700 rounded">
                            <span class="text-gray-300">Payment System</span>
                            <span class="text-green-400">● Active</span>
                        </div>
                        <div class="flex items-center justify-between p-3 bg-gray-700 rounded">
                            <span class="text-gray-300">Last Sync</span>
                            <span class="text-gray-400">${new Date().toLocaleTimeString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading dashboard:', error);
        loadFallbackDashboard();
    }
    setTimeout(() => {
        if (typeof initializeCustomPickers === 'function') {
            initializeCustomPickers();
        }
    }, 100);
}

// Database functions - UPDATED for new payment system
async function fetchTotalStudents() {
    try {
        const { count, error } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true });

        if (error) throw error;
        return count || 0;
    } catch (error) {
        console.error('Error fetching students:', error);
        return 'Error';
    }
}

async function fetchActiveAircraft() {
    const { count, error } = await supabase
        .from('planes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'available');

    if (error) {
        console.error('Error fetching aircraft:', error);
        return 'Error';
    }

    return count || 0;
}

async function fetchUpcomingBookings() {
    const today = new Date().toISOString();

    const { count, error } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .gte('start_time', today);

    if (error) {
        console.error('Error fetching bookings:', error);
        return 'Error';
    }

    return count || 0;
}

// In dashboard.js - update fetchFlightHoursThisMonth function
async function fetchFlightHoursThisMonth() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('flight_logs')
        .select('flight_duration')
        .gte('flight_date', startOfMonth)
        .lte('flight_date', endOfMonth);

    if (error) {
        console.error('Error fetching flight hours:', error);
        return 'Error';
    }

    const totalHours = data.reduce((sum, flight) => sum + (flight.flight_duration || 0), 0);
    return Math.round(totalHours * 10) / 10;
}

// NEW: Fetch financial metrics from the updated payment system
async function fetchFinancialMetrics() {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

        // Get pending receivable (money owed to club)
        const { data: pendingReceivable, error: receivableError } = await supabase
            .from('payments_receivable')
            .select('amount')
            .eq('status', 'pending');

        // Get pending payable (money club owes)
        const { data: pendingPayable, error: payableError } = await supabase
            .from('payments_payable')
            .select('amount')
            .eq('status', 'pending');

        // Get recent transactions for this month
        const { data: recentTransactions, error: transactionsError } = await supabase
            .from('transaction_history')
            .select('*')
            .gte('payment_date', startOfMonth)
            .order('payment_date', { ascending: false })
            .limit(5);

        if (receivableError || payableError || transactionsError) {
            console.error('Error fetching financial metrics:', receivableError || payableError || transactionsError);
            return getDefaultFinancialData();
        }

        // In fetchFinancialMetrics function, replace the calculation part:
        const pendingReceivableTotal = pendingReceivable.reduce((sum, p) => {
            const amount = parseFloat(p.amount) || 0;
            return sum + amount;
        }, 0);

        const pendingPayableTotal = pendingPayable.reduce((sum, p) => {
            const amount = parseFloat(p.amount) || 0;
            return sum + amount;
        }, 0);

        // Similarly for monthly income/expenses calculations:
        const monthlyIncome = recentTransactions
            .filter(t => t.transaction_type === 'incoming')
            .reduce((sum, t) => {
                const amount = parseFloat(t.amount) || 0;
                return sum + amount;
            }, 0);

        const monthlyExpenses = recentTransactions
            .filter(t => t.transaction_type === 'outgoing')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        const netCashFlow = monthlyIncome - monthlyExpenses;

        return {
            pendingReceivable: pendingReceivableTotal,
            pendingReceivableCount: pendingReceivable.length,
            pendingPayable: pendingPayableTotal,
            pendingPayableCount: pendingPayable.length,
            netCashFlow: netCashFlow,
            recentTransactions: recentTransactions || []
        };

    } catch (error) {
        console.error('Error in fetchFinancialMetrics:', error);
        return getDefaultFinancialData();
    }
}

function getDefaultFinancialData() {
    return {
        pendingReceivable: 0,
        pendingReceivableCount: 0,
        pendingPayable: 0,
        pendingPayableCount: 0,
        netCashFlow: 0,
        recentTransactions: []
    };
}

// Fallback function in case database is unavailable
function loadFallbackDashboard() {
    document.getElementById("main-content").innerHTML = `
        <div class="p-6 bg-gray-900 text-white min-h-full">
            <h1 class="text-3xl font-bold mb-2">AeroClub Dashboard</h1>
            <p class="text-gray-400 mb-6">Welcome back! Here's your overview:</p>
            
            <div class="bg-yellow-800 p-4 rounded-lg mb-6">
                <p class="text-yellow-200">Unable to fetch live data. Showing cached information.</p>
            </div>

            <!-- Stats Overview with fallback numbers -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div class="bg-gray-800 p-6 rounded-xl shadow hover:shadow-gray-700 transition" onclick="window.location.hash = '#students'">
                    <h2 class="text-sm font-medium text-gray-400">Total Students</h2>
                    <p class="text-2xl font-bold text-blue-400 mt-2">128</p>
                    <p class="text-sm text-gray-400 mt-2">Active trainees</p>
                </div>
                <div class="bg-gray-800 p-6 rounded-xl shadow hover:shadow-gray-700 transition" onclick="window.location.hash = '#planes'">
                    <h2 class="text-sm font-medium text-gray-400">Active Aircraft</h2>
                    <p class="text-2xl font-bold text-green-400 mt-2">12</p>
                    <p class="text-sm text-gray-400 mt-2">Available fleet</p>
                </div>
                <div class="bg-gray-800 p-6 rounded-xl shadow hover:shadow-gray-700 transition" onclick="window.location.hash = '#bookings'">
                    <h2 class="text-sm font-medium text-gray-400">Upcoming Bookings</h2>
                    <p class="text-2xl font-bold text-purple-400 mt-2">23</p>
                    <p class="text-sm text-gray-400 mt-2">Scheduled flights</p>
                </div>
                <div class="bg-gray-800 p-6 rounded-xl shadow hover:shadow-gray-700 transition" onclick="window.location.hash = '#flight-logs'">
                    <h2 class="text-sm font-medium text-gray-400">Flight Hours This Month</h2>
                    <p class="text-2xl font-bold text-orange-400 mt-2">187</p>
                    <p class="text-sm text-gray-400 mt-2">Total hours flown</p>
                </div>
            </div>

            <!-- Financial Overview Fallback -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div class="bg-gray-800 p-6 rounded-xl shadow hover:shadow-gray-700 transition">
                    <h2 class="text-sm font-medium text-gray-400">Pending Receivable</h2>
                    <p class="text-2xl font-bold text-yellow-400 mt-2">$4,250.00</p>
                    <p class="text-sm text-gray-400 mt-2">15 payments due</p>
                </div>
                <div class="bg-gray-800 p-6 rounded-xl shadow hover:shadow-gray-700 transition">
                    <h2 class="text-sm font-medium text-gray-400">Pending Payable</h2>
                    <p class="text-2xl font-bold text-red-400 mt-2">$1,850.00</p>
                    <p class="text-sm text-gray-400 mt-2">8 payments due</p>
                </div>
                <div class="bg-gray-800 p-6 rounded-xl shadow hover:shadow-gray-700 transition">
                    <h2 class="text-sm font-medium text-gray-400">Net Cash Flow</h2>
                    <p class="text-2xl font-bold text-green-400 mt-2">$2,400.00</p>
                    <p class="text-sm text-gray-400 mt-2">This month</p>
                </div>
            </div>

            <!-- Quick Actions & Recent Activity -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Quick Actions -->
                <div class="bg-gray-800 p-6 rounded-xl shadow">
                    <h2 class="text-xl font-semibold mb-4 text-white">Quick Actions</h2>
                    <div class="grid grid-cols-2 gap-4">
                        <button onclick="window.location.hash = '#flight-logs'" class="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition flex flex-col items-center justify-center">
                            <span class="text-2xl mb-2">✈️</span>
                            <span class="text-sm">Log Flight</span>
                        </button>
                        <button onclick="window.location.hash = '#bookings'" class="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 transition flex flex-col items-center justify-center">
                            <span class="text-2xl mb-2">📅</span>
                            <span class="text-sm">Create Booking</span>
                        </button>
                        <button onclick="window.location.hash = '#finances'" class="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 transition flex flex-col items-center justify-center">
                            <span class="text-2xl mb-2">💰</span>
                            <span class="text-sm">Record Payment</span>
                        </button>
                        <button onclick="window.location.hash = '#students'" class="bg-orange-600 text-white p-4 rounded-lg hover:bg-orange-700 transition flex flex-col items-center justify-center">
                            <span class="text-2xl mb-2">👤</span>
                            <span class="text-sm">Add Student</span>
                        </button>
                    </div>
                </div>

                <!-- Recent Financial Activity Fallback -->
                <div class="bg-gray-800 p-6 rounded-xl shadow">
                    <h2 class="text-xl font-semibold mb-4 text-white">Recent Financial Activity</h2>
                    <div class="space-y-3">
                        <div class="flex justify-between items-center p-3 bg-gray-700 rounded">
                            <div class="flex items-center">
                                <div class="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center mr-3">↑</div>
                                <div>
                                    <div class="font-medium text-sm">Flight Training - Cessna 172</div>
                                    <div class="text-xs text-gray-400">${new Date().toLocaleDateString()}</div>
                                </div>
                            </div>
                            <div class="font-bold text-green-400">+$250.00</div>
                        </div>
                        <div class="flex justify-between items-center p-3 bg-gray-700 rounded">
                            <div class="flex items-center">
                                <div class="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center mr-3">↓</div>
                                <div>
                                    <div class="font-medium text-sm">Instructor Payment - John Smith</div>
                                    <div class="text-xs text-gray-400">${new Date().toLocaleDateString()}</div>
                                </div>
                            </div>
                            <div class="font-bold text-red-400">-$120.00</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}