import { supabase } from "../supabase.js";

let currentSection = 'general';
let appSettings = {};
let userPreferences = {};

export async function loadSettingsPage() {
    document.getElementById("main-content").innerHTML = `
        <div class="p-6 bg-gray-900 text-white min-h-full">
            <div class="flex justify-between items-center mb-6">
                <h1 class="text-3xl font-bold">Settings</h1>
                <div class="flex space-x-4">
                    <button id="save-settings" class="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 transition-colors">
                        Save Changes
                    </button>
                    <button id="reset-settings" class="bg-gray-600 px-4 py-2 rounded hover:bg-gray-700 transition-colors">
                        Reset to Defaults
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <!-- Sidebar Navigation -->
                <div class="lg:col-span-1">
                    <div class="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-4">
                        <nav class="space-y-2">
                            <button class="settings-nav-btn w-full text-left px-4 py-3 rounded-lg transition-colors ${currentSection === 'general' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}" data-section="general">
                                <div class="flex items-center gap-3">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                    </svg>
                                    <span>General</span>
                                </div>
                            </button>
                            
                            <button class="settings-nav-btn w-full text-left px-4 py-3 rounded-lg transition-colors ${currentSection === 'appearance' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}" data-section="appearance">
                                <div class="flex items-center gap-3">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path>
                                    </svg>
                                    <span>Appearance</span>
                                </div>
                            </button>
                            
                            <button class="settings-nav-btn w-full text-left px-4 py-3 rounded-lg transition-colors ${currentSection === 'notifications' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}" data-section="notifications">
                                <div class="flex items-center gap-3">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5zM4.93 4.93l9.07 9.07-9.07 9.07L4.93 4.93z"></path>
                                    </svg>
                                    <span>Notifications</span>
                                </div>
                            </button>
                            
                            <button class="settings-nav-btn w-full text-left px-4 py-3 rounded-lg transition-colors ${currentSection === 'billing' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}" data-section="billing">
                                <div class="flex items-center gap-3">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                                    </svg>
                                    <span>Billing & Payments</span>
                                </div>
                            </button>
                            
                            <button class="settings-nav-btn w-full text-left px-4 py-3 rounded-lg transition-colors ${currentSection === 'flight' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}" data-section="flight">
                                <div class="flex items-center gap-3">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                                    </svg>
                                    <span>Flight Operations</span>
                                </div>
                            </button>
                            
                            <button class="settings-nav-btn w-full text-left px-4 py-3 rounded-lg transition-colors ${currentSection === 'integrations' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}" data-section="integrations">
                                <div class="flex items-center gap-3">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                                    </svg>
                                    <span>Integrations</span>
                                </div>
                            </button>
                            
                            <button class="settings-nav-btn w-full text-left px-4 py-3 rounded-lg transition-colors ${currentSection === 'security' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}" data-section="security">
                                <div class="flex items-center gap-3">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                                    </svg>
                                    <span>Security</span>
                                </div>
                            </button>
                            
                            <button class="settings-nav-btn w-full text-left px-4 py-3 rounded-lg transition-colors ${currentSection === 'backup' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}" data-section="backup">
                                <div class="flex items-center gap-3">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"></path>
                                    </svg>
                                    <span>Backup & Export</span>
                                </div>
                            </button>
                        </nav>
                    </div>
                </div>

                <!-- Main Content Area -->
                <div class="lg:col-span-3">
                    <div id="settings-content" class="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
                        <!-- Content will be loaded here based on section -->
                    </div>
                </div>
            </div>
        </div>
    `;

    await loadSettings();
    setupEventListeners();
    renderCurrentSection();
}

async function loadSettings() {
    try {

        const savedSettings = localStorage.getItem('aeroClubSettings');
        const savedPreferences = localStorage.getItem('aeroClubUserPreferences');

        appSettings = savedSettings ? JSON.parse(savedSettings) : getDefaultSettings();
        userPreferences = savedPreferences ? JSON.parse(savedPreferences) : getDefaultPreferences();

    } catch (error) {
        console.error('Error loading settings:', error);
        appSettings = getDefaultSettings();
        userPreferences = getDefaultPreferences();
    }
}

function getDefaultSettings() {
    return {
        general: {
            schoolName: "AeroClub Flight School",
            timezone: "Europe/Paris",
            currency: "EUR",
            dateFormat: "DD/MM/YYYY",
            timeFormat: "24h",
            language: "en"
        },
        appearance: {
            theme: "dark",
            sidebarCollapsed: false,
            compactMode: false,
            highContrast: false
        },
        notifications: {
            emailNotifications: true,
            pushNotifications: true,
            bookingReminders: true,
            paymentReminders: true,
            flightReminders: true,
            maintenanceAlerts: true
        },
        billing: {
            autoGenerateInvoices: true,
            paymentReminderDays: 7,
            lateFeePercentage: 5,
            taxRate: 20,
            currencySymbol: "€"
        },
        flight: {
            defaultFlightType: "Training",
            requireInstructorForSolo: true,
            minHoursBetweenFlights: 1,
            maxDailyFlightHours: 8,
            autoLogMaintenance: true
        },
        security: {
            sessionTimeout: 30,
            require2FA: false,
            passwordExpiry: 90,
            loginNotifications: true
        },
        integrations: {
            weatherAPI: true,
            mapsAPI: true,
            emailIntegration: true,
            calendarSync: true
        }
    };
}

function getDefaultPreferences() {
    return {
        dashboard: {
            defaultView: "overview",
            showFinancialCards: true,
            showQuickActions: true,
            showRecentActivity: true
        },
        tables: {
            defaultRowsPerPage: 10,
            autoRefresh: true,
            showAvatars: true,
            compactView: false
        }
    };
}

function setupEventListeners() {

    document.querySelectorAll('.settings-nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentSection = e.target.closest('button').getAttribute('data-section');
            renderCurrentSection();
        });
    });


    document.getElementById('save-settings').addEventListener('click', saveSettings);


    document.getElementById('reset-settings').addEventListener('click', resetSettings);
}

function renderCurrentSection() {
    const content = document.getElementById('settings-content');


    document.querySelectorAll('.settings-nav-btn').forEach(btn => {
        const section = btn.getAttribute('data-section');
        if (section === currentSection) {
            btn.classList.add('bg-blue-600', 'text-white');
            btn.classList.remove('text-gray-300', 'hover:bg-gray-700');
        } else {
            btn.classList.remove('bg-blue-600', 'text-white');
            btn.classList.add('text-gray-300', 'hover:bg-gray-700');
        }
    });

    switch (currentSection) {
        case 'general':
            renderGeneralSettings(content);
            break;
        case 'appearance':
            renderAppearanceSettings(content);
            break;
        case 'notifications':
            renderNotificationSettings(content);
            break;
        case 'billing':
            renderBillingSettings(content);
            break;
        case 'flight':
            renderFlightSettings(content);
            break;
        case 'integrations':
            renderIntegrationSettings(content);
            break;
        case 'security':
            renderSecuritySettings(content);
            break;
        case 'backup':
            renderBackupSettings(content);
            break;
    }
}

function renderGeneralSettings(container) {
    container.innerHTML = `
        <div class="space-y-6">
            <div>
                <h2 class="text-2xl font-bold text-white mb-2">General Settings</h2>
                <p class="text-gray-400">Configure basic application settings and preferences</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- School Information -->
                <div class="bg-gray-750 rounded-lg p-4">
                    <h3 class="text-lg font-semibold text-white mb-4">School Information</h3>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">School Name</label>
                            <input type="text" id="school-name" value="${appSettings.general.schoolName}" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        </div>
                    </div>
                </div>

                <!-- Regional Settings -->
                <div class="bg-gray-750 rounded-lg p-4">
                    <h3 class="text-lg font-semibold text-white mb-4">Regional Settings</h3>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Timezone</label>
                            <select id="timezone" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                <option value="Europe/Paris" ${appSettings.general.timezone === 'Europe/Paris' ? 'selected' : ''}>Europe/Paris</option>
                                <option value="UTC" ${appSettings.general.timezone === 'UTC' ? 'selected' : ''}>UTC</option>
                                <option value="America/New_York" ${appSettings.general.timezone === 'America/New_York' ? 'selected' : ''}>America/New York</option>
                                <option value="America/Los_Angeles" ${appSettings.general.timezone === 'America/Los_Angeles' ? 'selected' : ''}>America/Los Angeles</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Currency</label>
                            <select id="currency" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                <option value="EUR" ${appSettings.general.currency === 'EUR' ? 'selected' : ''}>Euro (€)</option>
                                <option value="USD" ${appSettings.general.currency === 'USD' ? 'selected' : ''}>US Dollar ($)</option>
                                <option value="GBP" ${appSettings.general.currency === 'GBP' ? 'selected' : ''}>British Pound (£)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Date & Time Format -->
                <div class="bg-gray-750 rounded-lg p-4">
                    <h3 class="text-lg font-semibold text-white mb-4">Date & Time Format</h3>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Date Format</label>
                            <select id="date-format" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                <option value="DD/MM/YYYY" ${appSettings.general.dateFormat === 'DD/MM/YYYY' ? 'selected' : ''}>DD/MM/YYYY</option>
                                <option value="MM/DD/YYYY" ${appSettings.general.dateFormat === 'MM/DD/YYYY' ? 'selected' : ''}>MM/DD/YYYY</option>
                                <option value="YYYY-MM-DD" ${appSettings.general.dateFormat === 'YYYY-MM-DD' ? 'selected' : ''}>YYYY-MM-DD</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Time Format</label>
                            <select id="time-format" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                <option value="24h" ${appSettings.general.timeFormat === '24h' ? 'selected' : ''}>24-hour</option>
                                <option value="12h" ${appSettings.general.timeFormat === '12h' ? 'selected' : ''}>12-hour</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Language -->
                <div class="bg-gray-750 rounded-lg p-4">
                    <h3 class="text-lg font-semibold text-white mb-4">Language</h3>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Application Language</label>
                            <select id="language" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                <option value="en" ${appSettings.general.language === 'en' ? 'selected' : ''}>English</option>
                                <option value="fr" ${appSettings.general.language === 'fr' ? 'selected' : ''}>French</option>
                                <option value="es" ${appSettings.general.language === 'es' ? 'selected' : ''}>Spanish</option>
                                <option value="de" ${appSettings.general.language === 'de' ? 'selected' : ''}>German</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderAppearanceSettings(container) {
    container.innerHTML = `
        <div class="space-y-6">
            <div>
                <h2 class="text-2xl font-bold text-white mb-2">Appearance</h2>
                <p class="text-gray-400">Customize the look and feel of the application</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Theme Settings -->
                <div class="bg-gray-750 rounded-lg p-4">
                    <h3 class="text-lg font-semibold text-white mb-4">Theme</h3>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Theme Mode</label>
                            <div class="grid grid-cols-2 gap-3">
                                <label class="relative">
                                    <input type="radio" name="theme" value="dark" ${appSettings.appearance.theme === 'dark' ? 'checked' : ''} class="sr-only">
                                    <div class="p-4 border-2 rounded-lg cursor-pointer transition-all ${appSettings.appearance.theme === 'dark' ? 'border-blue-500 bg-blue-500/20' : 'border-gray-600 bg-gray-700 hover:border-gray-500'}">
                                        <div class="text-center">
                                            <div class="w-6 h-6 bg-gray-800 border-2 border-gray-600 rounded mx-auto mb-2"></div>
                                            <span class="text-sm text-white">Dark</span>
                                        </div>
                                    </div>
                                </label>
                                <label class="relative">
                                    <input type="radio" name="theme" value="light" ${appSettings.appearance.theme === 'light' ? 'checked' : ''} class="sr-only">
                                    <div class="p-4 border-2 rounded-lg cursor-pointer transition-all ${appSettings.appearance.theme === 'light' ? 'border-blue-500 bg-blue-500/20' : 'border-gray-600 bg-gray-700 hover:border-gray-500'}">
                                        <div class="text-center">
                                            <div class="w-6 h-6 bg-white border-2 border-gray-300 rounded mx-auto mb-2"></div>
                                            <span class="text-sm text-white">Light</span>
                                        </div>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Layout Settings -->
                <div class="bg-gray-750 rounded-lg p-4">
                    <h3 class="text-lg font-semibold text-white mb-4">Layout</h3>
                    <div class="space-y-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <label class="block text-sm font-medium text-white">Compact Mode</label>
                                <p class="text-sm text-gray-400">Reduce padding and spacing</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="compact-mode" ${appSettings.appearance.compactMode ? 'checked' : ''} class="sr-only peer">
                                <div class="w-11 h-6 bg-gray-700 peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        <div class="flex items-center justify-between">
                            <div>
                                <label class="block text-sm font-medium text-white">High Contrast</label>
                                <p class="text-sm text-gray-400">Increase color contrast</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="high-contrast" ${appSettings.appearance.highContrast ? 'checked' : ''} class="sr-only peer">
                                <div class="w-11 h-6 bg-gray-700 peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>
                </div>

                <!-- Dashboard Preferences -->
                <div class="bg-gray-750 rounded-lg p-4 md:col-span-2">
                    <h3 class="text-lg font-semibold text-white mb-4">Dashboard Preferences</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <label class="block text-sm font-medium text-white">Show Financial Cards</label>
                                <p class="text-sm text-gray-400">Display financial overview on dashboard</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="show-financial-cards" ${userPreferences.dashboard.showFinancialCards ? 'checked' : ''} class="sr-only peer">
                                <div class="w-11 h-6 bg-gray-700 peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        <div class="flex items-center justify-between">
                            <div>
                                <label class="block text-sm font-medium text-white">Show Quick Actions</label>
                                <p class="text-sm text-gray-400">Display quick action buttons</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="show-quick-actions" ${userPreferences.dashboard.showQuickActions ? 'checked' : ''} class="sr-only peer">
                                <div class="w-11 h-6 bg-gray-700 peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}
function renderNotificationSettings(container) {
    container.innerHTML = `
        <div class="space-y-6">
            <div>
                <h2 class="text-2xl font-bold text-white mb-2">Notifications</h2>
                <p class="text-gray-400">Manage how and when you receive notifications</p>
            </div>

            <div class="grid grid-cols-1 gap-6">
                <!-- Notification Channels -->
                <div class="bg-gray-750 rounded-lg p-4">
                    <h3 class="text-lg font-semibold text-white mb-4">Notification Channels</h3>
                    <div class="space-y-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <label class="block text-sm font-medium text-white">Email Notifications</label>
                                <p class="text-sm text-gray-400">Receive notifications via email</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="email-notifications" ${appSettings.notifications.emailNotifications ? 'checked' : ''} class="sr-only peer">
                                <div class="w-11 h-6 bg-gray-700 peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        <div class="flex items-center justify-between">
                            <div>
                                <label class="block text-sm font-medium text-white">Push Notifications</label>
                                <p class="text-sm text-gray-400">Receive browser push notifications</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="push-notifications" ${appSettings.notifications.pushNotifications ? 'checked' : ''} class="sr-only peer">
                                <div class="w-11 h-6 bg-gray-700 peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>
                </div>

                <!-- Notification Types -->
                <div class="bg-gray-750 rounded-lg p-4">
                    <h3 class="text-lg font-semibold text-white mb-4">Notification Types</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <label class="block text-sm font-medium text-white">Booking Reminders</label>
                                <p class="text-sm text-gray-400">Upcoming flight bookings</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="booking-reminders" ${appSettings.notifications.bookingReminders ? 'checked' : ''} class="sr-only peer">
                                <div class="w-11 h-6 bg-gray-700 peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        <div class="flex items-center justify-between">
                            <div>
                                <label class="block text-sm font-medium text-white">Payment Reminders</label>
                                <p class="text-sm text-gray-400">Due and overdue payments</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="payment-reminders" ${appSettings.notifications.paymentReminders ? 'checked' : ''} class="sr-only peer">
                                <div class="w-11 h-6 bg-gray-700 peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        <div class="flex items-center justify-between">
                            <div>
                                <label class="block text-sm font-medium text-white">Flight Reminders</label>
                                <p class="text-sm text-gray-400">Flight schedule changes</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="flight-reminders" ${appSettings.notifications.flightReminders ? 'checked' : ''} class="sr-only peer">
                                <div class="w-11 h-6 bg-gray-700 peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        <div class="flex items-center justify-between">
                            <div>
                                <label class="block text-sm font-medium text-white">Maintenance Alerts</label>
                                <p class="text-sm text-gray-400">Aircraft maintenance updates</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="maintenance-alerts" ${appSettings.notifications.maintenanceAlerts ? 'checked' : ''} class="sr-only peer">
                                <div class="w-11 h-6 bg-gray-700 peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderBillingSettings(container) {
    container.innerHTML = `
        <div class="space-y-6">
            <div>
                <h2 class="text-2xl font-bold text-white mb-2">Billing & Payments</h2>
                <p class="text-gray-400">Configure billing preferences and payment settings</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Invoice Settings -->
                <div class="bg-gray-750 rounded-lg p-4">
                    <h3 class="text-lg font-semibold text-white mb-4">Invoice Settings</h3>
                    <div class="space-y-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <label class="block text-sm font-medium text-white">Auto-generate Invoices</label>
                                <p class="text-sm text-gray-400">Automatically create invoices for bookings</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="auto-generate-invoices" ${appSettings.billing.autoGenerateInvoices ? 'checked' : ''} class="sr-only peer">
                                <div class="w-11 h-6 bg-gray-700 peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Payment Reminder (Days)</label>
                            <input type="number" id="payment-reminder-days" value="${appSettings.billing.paymentReminderDays}" min="1" max="30" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        </div>
                    </div>
                </div>

                <!-- Fee Settings -->
                <div class="bg-gray-750 rounded-lg p-4">
                    <h3 class="text-lg font-semibold text-white mb-4">Fee Settings</h3>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Late Fee Percentage</label>
                            <div class="relative">
                                <input type="number" id="late-fee-percentage" value="${appSettings.billing.lateFeePercentage}" min="0" max="50" step="0.5" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <span class="text-gray-400">%</span>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Tax Rate</label>
                            <div class="relative">
                                <input type="number" id="tax-rate" value="${appSettings.billing.taxRate}" min="0" max="100" step="0.1" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <span class="text-gray-400">%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderFlightSettings(container) {
    container.innerHTML = `
        <div class="space-y-6">
            <div>
                <h2 class="text-2xl font-bold text-white mb-2">Flight Operations</h2>
                <p class="text-gray-400">Configure flight scheduling and operational settings</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Flight Preferences -->
                <div class="bg-gray-750 rounded-lg p-4">
                    <h3 class="text-lg font-semibold text-white mb-4">Flight Preferences</h3>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Default Flight Type</label>
                            <select id="default-flight-type" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                <option value="Training" ${appSettings.flight.defaultFlightType === 'Training' ? 'selected' : ''}>Training</option>
                                <option value="Solo" ${appSettings.flight.defaultFlightType === 'Solo' ? 'selected' : ''}>Solo</option>
                                <option value="Charter" ${appSettings.flight.defaultFlightType === 'Charter' ? 'selected' : ''}>Charter</option>
                                <option value="Maintenance" ${appSettings.flight.defaultFlightType === 'Maintenance' ? 'selected' : ''}>Maintenance</option>
                            </select>
                        </div>
                        <div class="flex items-center justify-between">
                            <div>
                                <label class="block text-sm font-medium text-white">Require Instructor for Solo</label>
                                <p class="text-sm text-gray-400">Instructor approval for solo flights</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="require-instructor-for-solo" ${appSettings.flight.requireInstructorForSolo ? 'checked' : ''} class="sr-only peer">
                                <div class="w-11 h-6 bg-gray-700 peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>
                </div>

                <!-- Safety Settings -->
                <div class="bg-gray-750 rounded-lg p-4">
                    <h3 class="text-lg font-semibold text-white mb-4">Safety Settings</h3>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Minimum Hours Between Flights</label>
                            <div class="relative">
                                <input type="number" id="min-hours-between-flights" value="${appSettings.flight.minHoursBetweenFlights}" min="0" max="24" step="0.5" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <span class="text-gray-400">hours</span>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Max Daily Flight Hours</label>
                            <div class="relative">
                                <input type="number" id="max-daily-flight-hours" value="${appSettings.flight.maxDailyFlightHours}" min="1" max="24" step="0.5" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <span class="text-gray-400">hours</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Maintenance -->
                <div class="bg-gray-750 rounded-lg p-4 md:col-span-2">
                    <h3 class="text-lg font-semibold text-white mb-4">Maintenance</h3>
                    <div class="space-y-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <label class="block text-sm font-medium text-white">Auto-log Maintenance</label>
                                <p class="text-sm text-gray-400">Automatically create maintenance entries after flights</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="auto-log-maintenance" ${appSettings.flight.autoLogMaintenance ? 'checked' : ''} class="sr-only peer">
                                <div class="w-11 h-6 bg-gray-700 peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderIntegrationSettings(container) {
    container.innerHTML = `
        <div class="space-y-6">
            <div>
                <h2 class="text-2xl font-bold text-white mb-2">Integrations</h2>
                <p class="text-gray-400">Connect with external services and APIs</p>
            </div>

            <div class="grid grid-cols-1 gap-6">
                <!-- API Integrations -->
                <div class="bg-gray-750 rounded-lg p-4">
                    <h3 class="text-lg font-semibold text-white mb-4">API Integrations</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <label class="block text-sm font-medium text-white">Weather API</label>
                                <p class="text-sm text-gray-400">Real-time weather data</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="weather-api" ${appSettings.integrations.weatherAPI ? 'checked' : ''} class="sr-only peer">
                                <div class="w-11 h-6 bg-gray-700 peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        <div class="flex items-center justify-between">
                            <div>
                                <label class="block text-sm font-medium text-white">Maps API</label>
                                <p class="text-sm text-gray-400">Flight route mapping</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="maps-api" ${appSettings.integrations.mapsAPI ? 'checked' : ''} class="sr-only peer">
                                <div class="w-11 h-6 bg-gray-700 peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>
                </div>

                <!-- Service Integrations -->
                <div class="bg-gray-750 rounded-lg p-4">
                    <h3 class="text-lg font-semibold text-white mb-4">Service Integrations</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <label class="block text-sm font-medium text-white">Email Integration</label>
                                <p class="text-sm text-gray-400">Send emails via SMTP</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="email-integration" ${appSettings.integrations.emailIntegration ? 'checked' : ''} class="sr-only peer">
                                <div class="w-11 h-6 bg-gray-700 peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        <div class="flex items-center justify-between">
                            <div>
                                <label class="block text-sm font-medium text-white">Calendar Sync</label>
                                <p class="text-sm text-gray-400">Sync with external calendars</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="calendar-sync" ${appSettings.integrations.calendarSync ? 'checked' : ''} class="sr-only peer">
                                <div class="w-11 h-6 bg-gray-700 peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderSecuritySettings(container) {
    container.innerHTML = `
        <div class="space-y-6">
            <div>
                <h2 class="text-2xl font-bold text-white mb-2">Security</h2>
                <p class="text-gray-400">Manage account security and access controls</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Session Settings -->
                <div class="bg-gray-750 rounded-lg p-4">
                    <h3 class="text-lg font-semibold text-white mb-4">Session Settings</h3>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Session Timeout</label>
                            <div class="relative">
                                <input type="number" id="session-timeout" value="${appSettings.security.sessionTimeout}" min="5" max="240" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <span class="text-gray-400">minutes</span>
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center justify-between">
                            <div>
                                <label class="block text-sm font-medium text-white">Login Notifications</label>
                                <p class="text-sm text-gray-400">Notify on new logins</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="login-notifications" ${appSettings.security.loginNotifications ? 'checked' : ''} class="sr-only peer">
                                <div class="w-11 h-6 bg-gray-700 peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>
                </div>

                <!-- Authentication -->
                <div class="bg-gray-750 rounded-lg p-4">
                    <h3 class="text-lg font-semibold text-white mb-4">Authentication</h3>
                    <div class="space-y-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <label class="block text-sm font-medium text-white">Two-Factor Authentication</label>
                                <p class="text-sm text-gray-400">Require 2FA for all users</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="require-2fa" ${appSettings.security.require2FA ? 'checked' : ''} class="sr-only peer">
                                <div class="w-11 h-6 bg-gray-700 peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Password Expiry</label>
                            <div class="relative">
                                <input type="number" id="password-expiry" value="${appSettings.security.passwordExpiry}" min="1" max="365" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <span class="text-gray-400">days</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderBackupSettings(container) {
    container.innerHTML = `
        <div class="space-y-6">
            <div>
                <h2 class="text-2xl font-bold text-white mb-2">Backup & Export</h2>
                <p class="text-gray-400">Manage data backups and exports</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Backup Actions -->
                <div class="bg-gray-750 rounded-lg p-4">
                    <h3 class="text-lg font-semibold text-white mb-4">Backup Actions</h3>
                    <div class="space-y-4">
                        <button id="create-backup" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
                            </svg>
                            Create Backup Now
                        </button>
                        <button id="export-data" class="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            Export Data
                        </button>
                    </div>
                </div>

                <!-- Backup History -->
                <div class="bg-gray-750 rounded-lg p-4">
                    <h3 class="text-lg font-semibold text-white mb-4">Recent Backups</h3>
                    <div class="space-y-3">
                        <div class="flex items-center justify-between p-3 bg-gray-700 rounded">
                            <div>
                                <p class="text-white text-sm font-medium">backup_2024_01_15.zip</p>
                                <p class="text-gray-400 text-xs">2 days ago • 45.2 MB</p>
                            </div>
                            <button class="text-blue-400 hover:text-blue-300">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                                </svg>
                            </button>
                        </div>
                        <div class="flex items-center justify-between p-3 bg-gray-700 rounded">
                            <div>
                                <p class="text-white text-sm font-medium">backup_2024_01_08.zip</p>
                                <p class="text-gray-400 text-xs">1 week ago • 44.8 MB</p>
                            </div>
                            <button class="text-blue-400 hover:text-blue-300">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Auto Backup Settings -->
            <div class="bg-gray-750 rounded-lg p-4">
                <h3 class="text-lg font-semibold text-white mb-4">Automatic Backups</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Frequency</label>
                        <select class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option>Daily</option>
                            <option>Weekly</option>
                            <option>Monthly</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Time</label>
                        <input type="time" class="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" value="02:00">
                    </div>
                    <div class="flex items-end">
                        <button class="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg transition-colors">
                            Save Schedule
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function saveSettings() {
    try {

        const settings = {
            general: {
                schoolName: document.getElementById('school-name')?.value || appSettings.general.schoolName,
                timezone: document.getElementById('timezone')?.value || appSettings.general.timezone,
                currency: document.getElementById('currency')?.value || appSettings.general.currency,
                dateFormat: document.getElementById('date-format')?.value || appSettings.general.dateFormat,
                timeFormat: document.getElementById('time-format')?.value || appSettings.general.timeFormat,
                language: document.getElementById('language')?.value || appSettings.general.language
            },
            appearance: {
                theme: document.querySelector('input[name="theme"]:checked')?.value || appSettings.appearance.theme,
                compactMode: document.getElementById('compact-mode')?.checked || false,
                highContrast: document.getElementById('high-contrast')?.checked || false
            },
            notifications: {
                emailNotifications: document.getElementById('email-notifications')?.checked || false,
                pushNotifications: document.getElementById('push-notifications')?.checked || false,
                bookingReminders: document.getElementById('booking-reminders')?.checked || false,
                paymentReminders: document.getElementById('payment-reminders')?.checked || false,
                flightReminders: document.getElementById('flight-reminders')?.checked || false,
                maintenanceAlerts: document.getElementById('maintenance-alerts')?.checked || false
            },
            billing: {
                autoGenerateInvoices: document.getElementById('auto-generate-invoices')?.checked || false,
                paymentReminderDays: parseInt(document.getElementById('payment-reminder-days')?.value) || 7,
                lateFeePercentage: parseFloat(document.getElementById('late-fee-percentage')?.value) || 5,
                taxRate: parseFloat(document.getElementById('tax-rate')?.value) || 20
            },
            flight: {
                defaultFlightType: document.getElementById('default-flight-type')?.value || 'Training',
                requireInstructorForSolo: document.getElementById('require-instructor-for-solo')?.checked || false,
                minHoursBetweenFlights: parseFloat(document.getElementById('min-hours-between-flights')?.value) || 1,
                maxDailyFlightHours: parseFloat(document.getElementById('max-daily-flight-hours')?.value) || 8,
                autoLogMaintenance: document.getElementById('auto-log-maintenance')?.checked || false
            },
            security: {
                sessionTimeout: parseInt(document.getElementById('session-timeout')?.value) || 30,
                require2FA: document.getElementById('require-2fa')?.checked || false,
                passwordExpiry: parseInt(document.getElementById('password-expiry')?.value) || 90,
                loginNotifications: document.getElementById('login-notifications')?.checked || false
            },
            integrations: {
                weatherAPI: document.getElementById('weather-api')?.checked || false,
                mapsAPI: document.getElementById('maps-api')?.checked || false,
                emailIntegration: document.getElementById('email-integration')?.checked || false,
                calendarSync: document.getElementById('calendar-sync')?.checked || false
            }
        };


        const preferences = {
            dashboard: {
                showFinancialCards: document.getElementById('show-financial-cards')?.checked || false,
                showQuickActions: document.getElementById('show-quick-actions')?.checked || false,
                showRecentActivity: userPreferences.dashboard.showRecentActivity
            },
            tables: {
                defaultRowsPerPage: userPreferences.tables.defaultRowsPerPage,
                autoRefresh: userPreferences.tables.autoRefresh,
                showAvatars: userPreferences.tables.showAvatars,
                compactView: userPreferences.tables.compactView
            }
        };


        localStorage.setItem('aeroClubSettings', JSON.stringify(settings));
        localStorage.setItem('aeroClubUserPreferences', JSON.stringify(preferences));


        appSettings = settings;
        userPreferences = preferences;


        showNotification('Settings saved successfully!', 'success');

    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('Error saving settings', 'error');
    }
}

function resetSettings() {
    if (confirm('Are you sure you want to reset all settings to default? This action cannot be undone.')) {
        appSettings = getDefaultSettings();
        userPreferences = getDefaultPreferences();

        localStorage.removeItem('aeroClubSettings');
        localStorage.removeItem('aeroClubUserPreferences');

        renderCurrentSection();
        showNotification('Settings reset to defaults', 'success');
    }
}

function showNotification(message, type = 'info') {

    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 transform transition-transform duration-300 ${type === 'success' ? 'bg-green-600' :
        type === 'error' ? 'bg-red-600' : 'bg-blue-600'
        } text-white`;
    notification.textContent = message;


    document.body.appendChild(notification);


    setTimeout(() => {
        notification.remove();
    }, 3000);
}