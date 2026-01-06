// ./js/main.js
import { loadDashboardPage } from "./pages/dashboard.js";
import { loadStudentsPage } from "./pages/students.js";
import { loadPlanesPage } from "./pages/planes.js";
import { loadBookingsPage, cleanupBookingsPage } from "./pages/bookings.js";
import { loadFlightLogsPage, cleanupFlightLogsPage } from "./pages/flight_logs.js";
import { loadInstructorsPage } from "./pages/instructors.js";
import { loadFinancePage, cleanupFinancePage } from "./pages/finances.js";
import { loadSubmitFlightPage, cleanupSubmitFlightPage } from "./pages/submit_flight.js";
import { loadSettingsPage } from "./pages/settings.js";
import { loadStudentDetailsPage, cleanupStudentDetailsPage } from "./pages/studentdetails.js";
import { loadInstructorDetailsPage, cleanupInstructorDetailsPage } from "./pages/instructordetails.js";
import { loadMembersPage } from "./pages/members.js";
import { loadMaintenancePage, cleanupMaintenancePage } from "./pages/maintenance.js";
import { loadStaffPage, cleanupStaffPage } from "./pages/staff.js";
import { loadMemberDetailsPage, cleanupMemberDetailsPage } from "./pages/memberdetails.js";

const routes = {
    "": loadDashboardPage,
    "#dashboard": loadDashboardPage,
    "#students": loadStudentsPage,
    "#planes": loadPlanesPage,
    "#bookings": loadBookingsPage,
    "#flight_logs": loadFlightLogsPage,
    "#instructors": loadInstructorsPage,
    "#finances": loadFinancePage,
    "#submit_flight": loadSubmitFlightPage,
    "#settings": loadSettingsPage,
    "#members": loadMembersPage,
    "#maintenance": loadMaintenancePage,
    "#staff": loadStaffPage,
    "#memberdetails": loadMemberDetailsPage,
};

// Track current page and cleanup functions
let currentPage = '';
let currentCleanup = null;

const cleanupFunctions = {
    '#bookings': cleanupBookingsPage,
    '#flight_logs': cleanupFlightLogsPage,
    '#studentdetails': cleanupStudentDetailsPage,
    '#instructordetails': cleanupInstructorDetailsPage,
    '#submit_flight': cleanupSubmitFlightPage,
    '#finances': cleanupFinancePage,
    '#maintenance': cleanupMaintenancePage,
    '#staff': cleanupStaffPage,
    '#memberdetails': cleanupMemberDetailsPage,

};

async function cleanupCurrentPage() {
    console.log('🧹 Cleaning up current page:', currentPage);


    if (currentCleanup && typeof currentCleanup === 'function') {
        try {
            await currentCleanup();
            console.log('✅ Page-specific cleanup completed');
        } catch (error) {
            console.error('❌ Error during page-specific cleanup:', error);
        }
        currentCleanup = null;
    }


    try {

        if (currentPage && currentPage.startsWith('#student/')) {
            const routeCleanup = cleanupFunctions['#studentdetails'];
            if (routeCleanup && typeof routeCleanup === 'function') {
                await routeCleanup();
                console.log('✅ Student details cleanup completed');
            }
        }

        else if (currentPage && currentPage.startsWith('#instructor/')) {
            const routeCleanup = cleanupFunctions['#instructordetails'];
            if (routeCleanup && typeof routeCleanup === 'function') {
                await routeCleanup();
                console.log('✅ Instructor details cleanup completed');
            }
        } else {

            const routeCleanup = cleanupFunctions[currentPage];
            if (routeCleanup && typeof routeCleanup === 'function') {
                await routeCleanup();
                console.log(`✅ Route cleanup completed for: ${currentPage}`);
            }
        }
    } catch (error) {
        console.error('❌ Error during route-specific cleanup:', error);
    }


    const mainContent = document.getElementById("main-content");
    if (mainContent) {
        mainContent.innerHTML = '';
        console.log('✅ Main content cleared');
    }

    console.log('✅ Page cleanup completed');
}

function initializeCustomPickers() {

    document.querySelectorAll('input[type="date"]').forEach(input => {

        if (typeof CustomDatePicker !== 'undefined') {
            new CustomDatePicker(input);
        }
    });


    document.querySelectorAll('input[type="time"]').forEach(input => {

        if (typeof CustomTimePicker !== 'undefined') {
            new CustomTimePicker(input);
        }
    });
}

// Enhanced menu item click handler
function setupMenuEventListeners() {
    document.querySelectorAll('a[href^="#"]').forEach(menuItem => {
        menuItem.addEventListener('click', function (e) {
            const targetHash = this.getAttribute('href');


            if (window.location.hash === targetHash) {
                e.preventDefault();
                console.log('🔄 Force reloading current page:', targetHash);


                window.forceReload = true;
                window.location.hash = targetHash;
            }
        });
    });
}

// Enhanced navigate event listener for programmatic navigation
window.addEventListener('navigate', async (event) => {
    const page = event.detail.page;
    console.log('🧭 Programmatic navigation to:', page);
    const backPage = event.detail.backPage || null;


    await cleanupCurrentPage();

    try {
        switch (page) {
            case 'students':
                window.history.pushState({}, '', '#students');
                await loadStudentsPage();
                currentPage = '#students';
                currentCleanup = null;
                break;
            case 'studentdetails':

                const studentId = event.detail.studentId || event.detail.studentNumber;

                const studentBackPage = event.detail.backPage;

                if (studentId) {
                    window.history.pushState({}, '', `#student/${studentId}`);

                    await loadStudentDetailsPage(studentId, studentBackPage);
                    currentPage = `#student/${studentId}`;
                    currentCleanup = () => cleanupStudentDetailsPage();
                }
                break;
            case 'instructors':
                window.history.pushState({}, '', '#instructors');
                await loadInstructorsPage();
                currentPage = '#instructors';
                currentCleanup = null;
                break;
            case 'instructordetails':

                const instructorId = event.detail.instructorId;



                if (instructorId) {
                    window.history.pushState({}, '', `#instructor/${instructorId}`);

                    await loadInstructorDetailsPage(instructorId, backPage);
                    currentPage = `#instructor/${instructorId}`;
                    currentCleanup = () => cleanupInstructorDetailsPage();
                }
                break;
            case 'finances':
                window.history.pushState({}, '', '#finances');
                await loadFinancePage();
                currentPage = '#finances';
                currentCleanup = () => cleanupFinancePage();
                break;
            case 'bookings':
                window.history.pushState({}, '', '#bookings');
                await loadBookingsPage();
                currentPage = '#bookings';
                currentCleanup = () => cleanupBookingsPage();
                break;
            case 'flight_logs':
                window.history.pushState({}, '', '#flight_logs');
                await loadFlightLogsPage();
                currentPage = '#flight_logs';
                currentCleanup = () => cleanupFlightLogsPage();
                break;
            case 'submit_flight':
                window.history.pushState({}, '', '#submit_flight');
                await loadSubmitFlightPage();
                currentPage = '#submit_flight';
                currentCleanup = () => cleanupSubmitFlightPage();
                break;
            case 'maintenance':
                window.history.pushState({}, '', '#maintenance');
                await loadMaintenancePage();
                currentPage = '#maintenance';
                currentCleanup = () => cleanupMaintenancePage();
                break;
            case 'memberdetails':


                const { memberId, type, backPage: memberBackPage } = event.detail;


                window.history.pushState({}, '', `#member/${type}/${memberId}`);


                await loadMemberDetailsPage({ memberId, type, backPage: memberBackPage });

                currentPage = `#member/${type}/${memberId}`;
                currentCleanup = () => cleanupMemberDetailsPage();
                break;
            default:
                window.history.pushState({}, '', `#${page}`);
                await loadPage(`#${page}`);
                currentPage = `#${page}`;

                currentCleanup = cleanupFunctions[`#${page}`] || null;
        }

        console.log('✅ Navigation completed to:', currentPage);
    } catch (error) {
        console.error('❌ Navigation error:', error);

        await loadDashboardPage();
        currentPage = '#dashboard';
        currentCleanup = null;
    }
});

async function loadPage(hash) {
    const pageLoader = routes[hash] || loadDashboardPage;
    try {
        await pageLoader();
        console.log('✅ Page loaded:', hash);


        currentCleanup = cleanupFunctions[hash] || null;


        if (typeof CustomDatePicker !== 'undefined' || typeof CustomTimePicker !== 'undefined') {
            setTimeout(initializeCustomPickers, 100);
        }
    } catch (error) {
        console.error('❌ Error loading page:', hash, error);

        await loadDashboardPage();
        currentPage = '#dashboard';
        currentCleanup = null;
    }
}

async function router() {
    let hash = window.location.hash;


    if (!hash || hash === '') {
        hash = '#dashboard';
        window.history.replaceState({}, '', hash);
    }


    if (hash === currentPage && !window.forceReload) {
        console.log('ℹ️ Already on page:', hash);
        return;
    }

    console.log('🔄 Router navigating to:', hash);

    await cleanupCurrentPage();



    const studentMatch = hash.match(/^#student\/([A-Za-z0-9-]+)$/);
    if (studentMatch) {
        const studentId = studentMatch[1];
        try {
            await loadStudentDetailsPage(studentId);
            currentPage = hash;
            currentCleanup = () => cleanupStudentDetailsPage();
            window.forceReload = false;
            console.log('✅ Student details page loaded with ID:', studentId);
        } catch (error) {
            console.error('❌ Error loading student details:', error);
            await loadDashboardPage();
            currentPage = '#dashboard';
            currentCleanup = null;
        }
        return;
    }

    const memberMatch = hash.match(/^#member\/([a-z_]+)\/([A-Za-z0-9-]+)$/);
    if (memberMatch) {
        const [_, type, memberId] = memberMatch;
        try {

            await loadMemberDetailsPage({ memberId, type });
            currentPage = hash;
            currentCleanup = () => cleanupMemberDetailsPage();
            window.forceReload = false;
            console.log(`✅ Member details loaded for ${type}: ${memberId}`);
        } catch (error) {
            console.error('❌ Error loading member details:', error);
            await loadDashboardPage();
            currentPage = '#dashboard';
            currentCleanup = null;
        }
        return;
    }


    const instructorMatch = hash.match(/^#instructor\/([A-Za-z0-9-]+)$/);
    if (instructorMatch) {
        const instructorId = instructorMatch[1];
        try {
            await loadInstructorDetailsPage(instructorId);
            currentPage = hash;
            currentCleanup = () => cleanupInstructorDetailsPage();
            window.forceReload = false;
            console.log('✅ Instructor details page loaded with ID:', instructorId);
        } catch (error) {
            console.error('❌ Error loading instructor details:', error);
            await loadDashboardPage();
            currentPage = '#dashboard';
            currentCleanup = null;
        }
        return;
    }


    try {
        await loadPage(hash);
        currentPage = hash;
        window.forceReload = false;
        console.log('✅ Regular page loaded:', hash);
    } catch (error) {
        console.error('❌ Error loading regular page:', error);
        await loadDashboardPage();
        currentPage = '#dashboard';
        currentCleanup = null;
    }
}

// Enhanced popstate handler (browser back/forward)
window.addEventListener('popstate', async (event) => {
    console.log('⬅️ Popstate event, navigating to:', window.location.hash);
    await router();
});

// Enhanced hashchange handler
window.addEventListener("hashchange", async () => {
    console.log('#️⃣ Hashchange event, navigating to:', window.location.hash);
    await router();
});

// Global function for custom pickers
window.initializeCustomPickers = initializeCustomPickers;

// Cleanup before page unload
window.addEventListener('beforeunload', async () => {
    console.log('🚪 Page unloading, performing final cleanup');
    await cleanupCurrentPage();
});

// Initialize the application
document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 Application initializing...');


    setupMenuEventListeners();


    router().then(() => {
        console.log('✅ Application initialized successfully');
    }).catch(error => {
        console.error('❌ Application initialization failed:', error);
    });
});

// Export for potential use in other modules
export { router, cleanupCurrentPage };