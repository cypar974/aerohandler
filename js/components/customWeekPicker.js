// ./js/components/customWeekPicker.js
export class CustomWeekPicker {
    constructor(inputElement) {
        this.input = inputElement;
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.init();
    }

    init() {
        if (this.isMobile) return;

        // Hide the native picker
        this.input.style.opacity = '0';
        this.input.style.position = 'absolute';
        this.input.style.width = '0';
        this.input.style.height = '0';

        // Create custom picker container
        this.pickerContainer = document.createElement('div');
        this.pickerContainer.className = 'custom-week-picker-container relative';

        // Create display input
        this.displayInput = document.createElement('input');
        this.displayInput.type = 'text';
        this.displayInput.className = this.input.className;
        this.displayInput.placeholder = this.input.placeholder || 'Select week';
        this.displayInput.readOnly = true;

        // Create calendar dropdown
        this.calendar = document.createElement('div');
        this.calendar.className = 'custom-calendar hidden absolute top-full left-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 p-4 w-80';

        this.pickerContainer.appendChild(this.displayInput);
        this.pickerContainer.appendChild(this.calendar);

        // Insert after the original input
        this.input.parentNode.insertBefore(this.pickerContainer, this.input.nextSibling);

        this.setupEventListeners();
        this.renderCalendar();
        this.updateDisplay(); // Initialize display with current value
    }

    setValue(dateString) {
        // Set the value on the original input
        this.input.value = dateString;

        // Update the display input
        this.updateDisplay();

        // Update the calendar to show and highlight the selected date
        if (dateString) {
            const [year, month, day] = dateString.split('-').map(Number);
            this.currentMonth = month - 1;
            this.currentYear = year;

            // Update the calendar display
            this.updateCalendarDays();

            // Highlight the selected week in the calendar
            this.highlightSelectedWeek(day);
        }
    }

    highlightSelectedWeek(day) {
        const daysContainer = this.calendar.querySelector('#calendar-days');
        if (!daysContainer) return;

        // Remove any existing selection highlights
        daysContainer.querySelectorAll('[data-full-date]').forEach(dayEl => {
            dayEl.classList.remove('bg-blue-700', 'text-white', 'bg-blue-600', 'bg-blue-500', 'bg-blue-400');
            // Restore appropriate base styles
            if (dayEl.classList.contains('text-gray-500')) {
                dayEl.classList.remove('text-white');
                dayEl.classList.add('text-gray-500');
            } else {
                dayEl.classList.add('hover:bg-gray-700');
            }
        });

        // Find and highlight the entire week containing the selected day
        const selectedDayEl = daysContainer.querySelector(`[data-day="${day}"]`);
        if (selectedDayEl) {
            const fullDate = selectedDayEl.getAttribute('data-full-date');
            const weekElements = this.getWeekElements(fullDate);

            weekElements.forEach(weekDayEl => {
                if (weekDayEl) {
                    weekDayEl.classList.remove('hover:bg-gray-700');

                    // Different styling based on whether it's current month or adjacent month
                    if (weekDayEl.classList.contains('text-gray-500')) {
                        // Previous/next month days - lighter background
                        weekDayEl.classList.remove('text-gray-500');
                        weekDayEl.classList.add('bg-blue-400', 'text-white');
                    } else {
                        // Current month days - normal highlighting
                        weekDayEl.classList.add('bg-blue-600', 'text-white');
                    }
                }
            });

            // Highlight the selected day with darker shade
            selectedDayEl.classList.remove('bg-blue-600');
            selectedDayEl.classList.add('bg-blue-700');
        }
    }

    getWeekElements(dateString) {
        const date = this.parseDateFromInput(dateString);
        const weekStart = new Date(date);
        // Start of week (Monday) - adjust to get Monday instead of Sunday
        const dayOfWeek = date.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days; otherwise adjust to Monday
        weekStart.setDate(date.getDate() + diffToMonday);

        const weekElements = [];
        const daysContainer = this.calendar.querySelector('#calendar-days');

        for (let i = 0; i < 7; i++) {
            const weekDate = new Date(weekStart);
            weekDate.setDate(weekStart.getDate() + i);

            // Look for the day element regardless of which month it's displayed in
            const dayElement = daysContainer.querySelector(`[data-full-date="${this.formatDateForInput(weekDate)}"]`);
            if (dayElement) {
                weekElements.push(dayElement);
            }
        }

        return weekElements;
    }

    setupEventListeners() {
        this.displayInput.addEventListener('click', () => {
            this.calendar.classList.toggle('hidden');
            this.positionCalendar();
        });

        document.addEventListener('click', (e) => {
            if (!this.pickerContainer.contains(e.target)) {
                this.calendar.classList.add('hidden');
            }
        });

        // Sync with original input
        this.input.addEventListener('change', () => {
            this.updateDisplay();
        });
    }

    renderCalendar() {
        const now = new Date();
        this.currentMonth = now.getMonth();
        this.currentYear = now.getFullYear();

        // If input already has a value, use that month/year
        if (this.input.value) {
            const [year, month] = this.input.value.split('-').map(Number);
            this.currentMonth = month - 1;
            this.currentYear = year;
        }

        this.calendar.innerHTML = `
            <div class="flex justify-between items-center mb-4">
                <button type="button" class="prev-month px-3 py-1 bg-gray-700 rounded hover:bg-gray-600">&lt;</button>
                <div class="font-semibold" id="current-month">${this.getMonthName(this.currentMonth)} ${this.currentYear}</div>
                <button type="button" class="next-month px-3 py-1 bg-gray-700 rounded hover:bg-gray-600">&gt;</button>
            </div>
            <div class="grid grid-cols-7 gap-1 mb-2">
                ${['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day =>
            `<div class="text-center text-sm text-gray-400 py-1">${day}</div>`
        ).join('')}
            </div>
            <div class="grid grid-cols-7 gap-1" id="calendar-days"></div>
        `;

        this.updateCalendarDays();
        this.setupCalendarEvents();
    }

    updateCalendarDays() {
        const daysContainer = this.calendar.querySelector('#calendar-days');
        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);

        // Get the day of the week for the first day (0 = Sunday, 1 = Monday, etc.)
        const startingDay = firstDay.getDay();
        const totalDays = lastDay.getDate();

        let daysHtml = '';

        // Previous month days - adjust for Monday-first week
        const prevMonthLastDay = new Date(this.currentYear, this.currentMonth, 0).getDate();

        // Calculate how many days from previous month to show
        // If first day is Monday (1), show 0 previous days
        // If first day is Tuesday (2), show 1 previous day, etc.
        // If first day is Sunday (0), show 6 previous days
        const daysFromPrevMonth = startingDay === 0 ? 6 : startingDay - 1;

        for (let i = 0; i < daysFromPrevMonth; i++) {
            const dayNumber = prevMonthLastDay - daysFromPrevMonth + i + 1;
            const prevMonthDate = new Date(this.currentYear, this.currentMonth - 1, dayNumber);
            daysHtml += `<div class="text-center py-2 text-gray-500 cursor-default" data-full-date="${this.formatDateForInput(prevMonthDate)}">${dayNumber}</div>`;
        }

        // Current month days - FIXED: Proper priority for styling
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize to start of day

        // Handle selected date with proper timezone handling
        let selectedDate = null;
        if (this.input.value) {
            selectedDate = this.parseDateFromInput(this.input.value);
        }

        for (let day = 1; day <= totalDays; day++) {
            const cellDate = new Date(this.currentYear, this.currentMonth, day);
            cellDate.setHours(0, 0, 0, 0); // Normalize to start of day

            const isToday = this.isSameDay(cellDate, today);
            const isSelected = selectedDate && this.isSameDay(cellDate, selectedDate);

            // FIXED: Clear priority - selected date overrides today
            let dayClass = 'text-center py-2 rounded cursor-pointer transition-colors';

            if (isSelected) {
                dayClass += ' bg-blue-700 text-white'; // Selected date - dark blue
            } else if (isToday) {
                dayClass += ' bg-blue-500 text-white'; // Today - bright blue
            } else {
                dayClass += ' hover:bg-gray-700'; // Normal day - hover only
            }

            daysHtml += `<div class="${dayClass}" data-day="${day}" data-full-date="${this.formatDateForInput(cellDate)}">${day}</div>`;
        }

        // Next month days - fill remaining cells to complete the grid
        const totalCells = 42; // 6 weeks * 7 days
        const daysSoFar = daysFromPrevMonth + totalDays;
        const remainingCells = totalCells - daysSoFar;

        for (let day = 1; day <= remainingCells; day++) {
            const nextMonthDate = new Date(this.currentYear, this.currentMonth + 1, day);
            daysHtml += `<div class="text-center py-2 text-gray-500 cursor-default" data-full-date="${this.formatDateForInput(nextMonthDate)}">${day}</div>`;
        }

        daysContainer.innerHTML = daysHtml;
        this.calendar.querySelector('#current-month').textContent =
            `${this.getMonthName(this.currentMonth)} ${this.currentYear}`;

        // Re-apply week highlighting if there's a selected date
        if (this.input.value && selectedDate) {
            this.highlightSelectedWeek(selectedDate.getDate());
        }
    }

    setupCalendarEvents() {
        // Month navigation
        this.calendar.querySelector('.prev-month').addEventListener('click', () => {
            this.currentMonth--;
            if (this.currentMonth < 0) {
                this.currentMonth = 11;
                this.currentYear--;
            }
            this.updateCalendarDays();
        });

        this.calendar.querySelector('.next-month').addEventListener('click', () => {
            this.currentMonth++;
            if (this.currentMonth > 11) {
                this.currentMonth = 0;
                this.currentYear++;
            }
            this.updateCalendarDays();
        });

        // Day selection - FIXED: Use data-full-date attribute
        this.calendar.addEventListener('click', (e) => {
            const dayElement = e.target.closest('[data-full-date]');
            // Only allow selection if it's not a grayed-out day (previous/next month)
            if (dayElement && !dayElement.classList.contains('text-gray-500')) {
                const fullDate = dayElement.getAttribute('data-full-date');
                this.selectDate(fullDate);
            }
        });
    }

    selectDate(fullDate) {
        // Use the parse method to handle timezone correctly
        const parsedDate = this.parseDateFromInput(fullDate);
        const formattedDate = this.formatDateForInput(parsedDate);

        this.input.value = formattedDate;
        this.updateDisplay();
        this.calendar.classList.add('hidden');

        // Update calendar to show selected date
        this.currentMonth = parsedDate.getMonth();
        this.currentYear = parsedDate.getFullYear();
        this.updateCalendarDays();

        // Trigger change event
        this.input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    updateDisplay() {
        if (this.input.value) {
            const selectedDate = this.parseDateFromInput(this.input.value);

            // Calculate Monday (start of week)
            const monday = new Date(selectedDate);
            const dayOfWeek = selectedDate.getDay();
            const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days; otherwise adjust to Monday
            monday.setDate(selectedDate.getDate() + diffToMonday);

            // Calculate Sunday (end of week)
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);

            // Format as "Jan 1 - Jan 7, 2024" or similar
            const sameYear = monday.getFullYear() === sunday.getFullYear();
            const sameMonth = monday.getMonth() === sunday.getMonth();

            if (sameYear && sameMonth) {
                // Same month: "Jan 1-7, 2024"
                this.displayInput.value = `${monday.toLocaleDateString('en-US', { month: 'short' })} ${monday.getDate()}-${sunday.getDate()}, ${monday.getFullYear()}`;
            } else if (sameYear) {
                // Same year, different months: "Jan 31 - Feb 6, 2024"
                this.displayInput.value = `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${monday.getFullYear()}`;
            } else {
                // Different years: "Dec 29, 2024 - Jan 4, 2025"
                this.displayInput.value = `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
            }
        } else {
            this.displayInput.value = '';
        }
    }

    parseDateFromInput(dateString) {
        if (!dateString) return null;

        // Split the YYYY-MM-DD format and create date in local timezone
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        date.setHours(0, 0, 0, 0); // Normalize to start of day
        return date;
    }

    positionCalendar() {
        const rect = this.displayInput.getBoundingClientRect();
        this.calendar.style.left = '0';
        this.calendar.style.top = '100%';
    }

    getMonthName(month) {
        return ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'][month];
    }

    isSameDay(date1, date2) {
        if (!date1 || !date2) return false;
        return date1.getFullYear() === date2.getFullYear() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getDate() === date2.getDate();
    }

    formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    destroy() {
        // Remove the custom picker elements
        if (this.pickerContainer && this.pickerContainer.parentNode) {
            this.pickerContainer.parentNode.removeChild(this.pickerContainer);
        }

        // Restore the original input
        if (this.input) {
            this.input.style.opacity = '';
            this.input.style.position = '';
            this.input.style.width = '';
            this.input.style.height = '';
        }
    }
}