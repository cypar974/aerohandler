export class CustomWeekPicker {
    constructor(inputElement) {
        this.input = inputElement;
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.init();
    }

    init() {
        if (this.isMobile) return;


        this.input.style.opacity = '0';
        this.input.style.position = 'absolute';
        this.input.style.width = '0';
        this.input.style.height = '0';


        this.pickerContainer = document.createElement('div');
        this.pickerContainer.className = 'custom-week-picker-container relative';


        this.displayInput = document.createElement('input');
        this.displayInput.type = 'text';
        this.displayInput.className = this.input.className;
        this.displayInput.placeholder = this.input.placeholder || 'Select week';
        this.displayInput.readOnly = true;


        this.calendar = document.createElement('div');
        this.calendar.className = 'custom-calendar hidden absolute top-full left-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 p-4 w-80';

        this.pickerContainer.appendChild(this.displayInput);
        this.pickerContainer.appendChild(this.calendar);


        this.input.parentNode.insertBefore(this.pickerContainer, this.input.nextSibling);

        this.setupEventListeners();
        this.renderCalendar();
        this.updateDisplay();
    }

    setValue(dateString) {

        this.input.value = dateString;


        this.updateDisplay();


        if (dateString) {
            const [year, month, day] = dateString.split('-').map(Number);
            this.currentMonth = month - 1;
            this.currentYear = year;


            this.updateCalendarDays();


            this.highlightSelectedWeek(day);
        }
    }

    highlightSelectedWeek(day) {
        const daysContainer = this.calendar.querySelector('#calendar-days');
        if (!daysContainer) return;


        daysContainer.querySelectorAll('[data-full-date]').forEach(dayEl => {
            dayEl.classList.remove('bg-blue-700', 'text-white', 'bg-blue-600', 'bg-blue-500', 'bg-blue-400');

            if (dayEl.classList.contains('text-gray-500')) {
                dayEl.classList.remove('text-white');
                dayEl.classList.add('text-gray-500');
            } else {
                dayEl.classList.add('hover:bg-gray-700');
            }
        });


        const selectedDayEl = daysContainer.querySelector(`[data-day="${day}"]`);
        if (selectedDayEl) {
            const fullDate = selectedDayEl.getAttribute('data-full-date');
            const weekElements = this.getWeekElements(fullDate);

            weekElements.forEach(weekDayEl => {
                if (weekDayEl) {
                    weekDayEl.classList.remove('hover:bg-gray-700');


                    if (weekDayEl.classList.contains('text-gray-500')) {

                        weekDayEl.classList.remove('text-gray-500');
                        weekDayEl.classList.add('bg-blue-400', 'text-white');
                    } else {

                        weekDayEl.classList.add('bg-blue-600', 'text-white');
                    }
                }
            });


            selectedDayEl.classList.remove('bg-blue-600');
            selectedDayEl.classList.add('bg-blue-700');
        }
    }

    getWeekElements(dateString) {
        const date = this.parseDateFromInput(dateString);
        const weekStart = new Date(date);

        const dayOfWeek = date.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        weekStart.setDate(date.getDate() + diffToMonday);

        const weekElements = [];
        const daysContainer = this.calendar.querySelector('#calendar-days');

        for (let i = 0; i < 7; i++) {
            const weekDate = new Date(weekStart);
            weekDate.setDate(weekStart.getDate() + i);


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


        this.input.addEventListener('change', () => {
            this.updateDisplay();
        });
    }

    renderCalendar() {
        const now = new Date();
        this.currentMonth = now.getMonth();
        this.currentYear = now.getFullYear();


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


        const startingDay = firstDay.getDay();
        const totalDays = lastDay.getDate();

        let daysHtml = '';


        const prevMonthLastDay = new Date(this.currentYear, this.currentMonth, 0).getDate();





        const daysFromPrevMonth = startingDay === 0 ? 6 : startingDay - 1;

        for (let i = 0; i < daysFromPrevMonth; i++) {
            const dayNumber = prevMonthLastDay - daysFromPrevMonth + i + 1;
            const prevMonthDate = new Date(this.currentYear, this.currentMonth - 1, dayNumber);
            daysHtml += `<div class="text-center py-2 text-gray-500 cursor-default" data-full-date="${this.formatDateForInput(prevMonthDate)}">${dayNumber}</div>`;
        }


        const today = new Date();
        today.setHours(0, 0, 0, 0);


        let selectedDate = null;
        if (this.input.value) {
            selectedDate = this.parseDateFromInput(this.input.value);
        }

        for (let day = 1; day <= totalDays; day++) {
            const cellDate = new Date(this.currentYear, this.currentMonth, day);
            cellDate.setHours(0, 0, 0, 0);

            const isToday = this.isSameDay(cellDate, today);
            const isSelected = selectedDate && this.isSameDay(cellDate, selectedDate);


            let dayClass = 'text-center py-2 rounded cursor-pointer transition-colors';

            if (isSelected) {
                dayClass += ' bg-blue-700 text-white';
            } else if (isToday) {
                dayClass += ' bg-blue-500 text-white';
            } else {
                dayClass += ' hover:bg-gray-700';
            }

            daysHtml += `<div class="${dayClass}" data-day="${day}" data-full-date="${this.formatDateForInput(cellDate)}">${day}</div>`;
        }


        const totalCells = 42;
        const daysSoFar = daysFromPrevMonth + totalDays;
        const remainingCells = totalCells - daysSoFar;

        for (let day = 1; day <= remainingCells; day++) {
            const nextMonthDate = new Date(this.currentYear, this.currentMonth + 1, day);
            daysHtml += `<div class="text-center py-2 text-gray-500 cursor-default" data-full-date="${this.formatDateForInput(nextMonthDate)}">${day}</div>`;
        }

        daysContainer.innerHTML = daysHtml;
        this.calendar.querySelector('#current-month').textContent =
            `${this.getMonthName(this.currentMonth)} ${this.currentYear}`;


        if (this.input.value && selectedDate) {
            this.highlightSelectedWeek(selectedDate.getDate());
        }
    }

    setupCalendarEvents() {

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


        this.calendar.addEventListener('click', (e) => {
            const dayElement = e.target.closest('[data-full-date]');

            if (dayElement && !dayElement.classList.contains('text-gray-500')) {
                const fullDate = dayElement.getAttribute('data-full-date');
                this.selectDate(fullDate);
            }
        });
    }

    selectDate(fullDate) {

        const parsedDate = this.parseDateFromInput(fullDate);
        const formattedDate = this.formatDateForInput(parsedDate);

        this.input.value = formattedDate;
        this.updateDisplay();
        this.calendar.classList.add('hidden');


        this.currentMonth = parsedDate.getMonth();
        this.currentYear = parsedDate.getFullYear();
        this.updateCalendarDays();


        this.input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    updateDisplay() {
        if (this.input.value) {
            const selectedDate = this.parseDateFromInput(this.input.value);


            const monday = new Date(selectedDate);
            const dayOfWeek = selectedDate.getDay();
            const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            monday.setDate(selectedDate.getDate() + diffToMonday);


            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);


            const sameYear = monday.getFullYear() === sunday.getFullYear();
            const sameMonth = monday.getMonth() === sunday.getMonth();

            if (sameYear && sameMonth) {

                this.displayInput.value = `${monday.toLocaleDateString('en-US', { month: 'short' })} ${monday.getDate()}-${sunday.getDate()}, ${monday.getFullYear()}`;
            } else if (sameYear) {

                this.displayInput.value = `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${monday.getFullYear()}`;
            } else {

                this.displayInput.value = `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
            }
        } else {
            this.displayInput.value = '';
        }
    }

    parseDateFromInput(dateString) {
        if (!dateString) return null;


        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        date.setHours(0, 0, 0, 0);
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

        if (this.pickerContainer && this.pickerContainer.parentNode) {
            this.pickerContainer.parentNode.removeChild(this.pickerContainer);
        }


        if (this.input) {
            this.input.style.opacity = '';
            this.input.style.position = '';
            this.input.style.width = '';
            this.input.style.height = '';
        }
    }
}