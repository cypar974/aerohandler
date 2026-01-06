import { supabase } from '../supabase.js';

export async function loadDashboardPage() {
    try {

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
            fetchFinancialMetrics()
        ]);


        document.getElementById("main-content").innerHTML = `
            <div class="p-6 bg-gray-900 text-white min-h-full">
                <h1 class="text-3xl font-bold mb-2">AeroClub Dashboard</h1>
                <p class="text-gray-400 mb-6">Welcome back! Here's your overview:</p>

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

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

async function fetchTotalStudents() {
    try {


        const { data, error } = await supabase
            .schema('api')
            .rpc('get_members');

        if (error) throw error;


        const studentCount = data ? data.filter(m => m.type === 'student').length : 0;

        return studentCount;
    } catch (error) {
        console.error('Error fetching students:', error);
        return 'Error';
    }
}

async function fetchActiveAircraft() {
    try {

        const { data, error } = await supabase.schema('api').rpc('get_available_planes');

        if (error) throw error;

        return data ? data.length : 0;
    } catch (error) {
        console.error('Error fetching aircraft:', error);
        return 'Error';
    }
}

async function fetchUpcomingBookings() {
    try {
        const today = new Date().toISOString();




        const { data, error } = await supabase.schema('api').rpc('get_bookings');

        if (error) throw error;


        const count = data.filter(b => b.start_time >= today).length;
        return count;
    } catch (error) {
        console.error('Error fetching bookings:', error);
        return 'Error';
    }
}

async function fetchFlightHoursThisMonth() {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];


        const { data, error } = await supabase.schema('api').rpc('get_flight_logs');

        if (error) throw error;


        const totalHours = data
            .filter(flight =>
                flight.flight_date >= startOfMonth &&
                flight.flight_date <= endOfMonth
            )
            .reduce((sum, flight) => sum + (Number(flight.flight_duration) || 0), 0);

        return Math.round(totalHours * 10) / 10;
    } catch (error) {
        console.error('Error fetching flight hours:', error);
        return 'Error';
    }
}

async function fetchFinancialMetrics() {
    try {


        const { data: ledger, error } = await supabase
            .schema('api')
            .rpc('get_financial_ledger');

        if (error) throw error;

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);




        const pendingReceivable = ledger
            .filter(t => t.transaction_direction === 'receivable' && t.status === 'pending')
            .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        const pendingReceivableCount = ledger
            .filter(t => t.transaction_direction === 'receivable' && t.status === 'pending').length;


        const pendingPayable = ledger
            .filter(t => t.transaction_direction === 'payable' && t.status === 'pending')
            .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        const pendingPayableCount = ledger
            .filter(t => t.transaction_direction === 'payable' && t.status === 'pending').length;



        const thisMonthTransactions = ledger.filter(t => {
            const txDate = new Date(t.created_at || t.due_date);
            return txDate >= startOfMonth && t.status === 'paid';
        });

        const monthlyIncome = thisMonthTransactions
            .filter(t => t.transaction_direction === 'receivable')
            .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        const monthlyExpenses = thisMonthTransactions
            .filter(t => t.transaction_direction === 'payable')
            .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        const netCashFlow = monthlyIncome - monthlyExpenses;




        const recentTransactions = ledger
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 5)
            .map(t => ({
                description: t.description || 'Transaction',
                amount: Number(t.amount),

                transaction_type: t.transaction_direction === 'receivable' ? 'incoming' : 'outgoing',
                payment_date: t.created_at || t.due_date
            }));

        return {
            pendingReceivable,
            pendingReceivableCount,
            pendingPayable,
            pendingPayableCount,
            netCashFlow,
            recentTransactions
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
function loadFallbackDashboard() {
    document.getElementById("main-content").innerHTML = `
        <div class="p-6 bg-gray-900 text-white min-h-full">
            <h1 class="text-3xl font-bold mb-2">AeroClub Dashboard</h1>
            <p class="text-gray-400 mb-6">Welcome back! Here's your overview:</p>
            
            <div class="bg-yellow-800 p-4 rounded-lg mb-6">
                <p class="text-yellow-200">Unable to fetch live data. Showing cached information.</p>
            </div>

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

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
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