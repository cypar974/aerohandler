export class CustomTimePicker {
    constructor(inputElement) {

        if (inputElement._customTimePicker) {
            inputElement._customTimePicker.destroy();
        }

        this.input = inputElement;
        this.input._customTimePicker = this;

        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        this.selectedHours = null;
        this.selectedMinutes = null;
        this.tempHours = null;
        this.tempMinutes = null;

        this.init();
    }

    init() {
        if (this.isMobile) return;


        this.input.style.opacity = '0';
        this.input.style.position = 'absolute';
        this.input.style.width = '0';
        this.input.style.height = '0';
        this.input.style.pointerEvents = 'none';


        this.pickerContainer = document.createElement('div');
        this.pickerContainer.className = 'custom-time-picker-container relative';


        this.displayInput = document.createElement('input');
        this.displayInput.type = 'text';
        this.displayInput.className = this.input.className;
        this.displayInput.placeholder = this.input.placeholder || 'Select time';
        this.displayInput.readOnly = true;



        this.timePicker = document.createElement('div');
        this.timePicker.className = 'custom-time-picker hidden absolute left-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-4 w-56';


        this.timePicker.style.zIndex = '9999';
        this.timePicker.style.backgroundColor = '#1f2937';

        this.pickerContainer.appendChild(this.displayInput);
        this.pickerContainer.appendChild(this.timePicker);

        this.input.parentNode.insertBefore(this.pickerContainer, this.input.nextSibling);

        this.setupEventListeners();
        this.renderTimePicker();
        this.updateDisplay();
    }

    setValue(timeString) {
        this.input.value = timeString;
        this.updateDisplay();

        if (timeString) {
            const [hours, minutes] = timeString.split(':');
            this.selectedHours = hours;
            this.selectedMinutes = minutes;
        }

        setTimeout(() => {
            const changeEvent = new Event('change', { bubbles: true });
            const inputEvent = new Event('input', { bubbles: true });
            this.input.dispatchEvent(changeEvent);
            this.input.dispatchEvent(inputEvent);
        }, 10);
    }

    initializeTempState() {
        const currentValue = this.input.value;
        if (currentValue) {
            const [hours, minutes] = currentValue.split(':');
            this.tempHours = hours;
            this.tempMinutes = minutes;
        } else {
            this.tempHours = null;
            this.tempMinutes = null;
        }
        this.updatePickerVisuals();
    }

    updatePickerVisuals() {
        this.timePicker.querySelectorAll('.hour-option, .minute-option').forEach(option => {
            option.classList.remove('bg-blue-600', 'text-white');
            option.classList.add('text-gray-200');
        });

        if (this.tempHours) {
            const hourOption = this.timePicker.querySelector(`.hour-option[data-hour="${this.tempHours}"]`);
            if (hourOption) {
                hourOption.classList.remove('text-gray-200');
                hourOption.classList.add('bg-blue-600', 'text-white');
            }
        }

        if (this.tempMinutes) {
            const minuteOption = this.timePicker.querySelector(`.minute-option[data-minute="${this.tempMinutes}"]`);
            if (minuteOption) {
                minuteOption.classList.remove('text-gray-200');
                minuteOption.classList.add('bg-blue-600', 'text-white');
            }
        }
    }

    scrollToSelection() {
        if (this.tempHours) {
            const el = this.timePicker.querySelector(`.hour-option[data-hour="${this.tempHours}"]`);
            if (el) el.scrollIntoView({ block: 'nearest' });
        }
        if (this.tempMinutes) {
            const el = this.timePicker.querySelector(`.minute-option[data-minute="${this.tempMinutes}"]`);
            if (el) el.scrollIntoView({ block: 'nearest' });
        }
    }

    setupEventListeners() {
        this.handleDocumentClick = this.handleDocumentClick.bind(this);
        this.handleDisplayClick = this.handleDisplayClick.bind(this);
        this.handleInputChange = this.handleInputChange.bind(this);

        this.displayInput.addEventListener('click', this.handleDisplayClick);
        document.addEventListener('click', this.handleDocumentClick);
        this.input.addEventListener('change', this.handleInputChange);
    }

    handleDocumentClick(e) {
        if (this.pickerContainer && !this.pickerContainer.contains(e.target)) {
            this.timePicker.classList.add('hidden');
        }
    }

    handleDisplayClick() {
        this.timePicker.classList.toggle('hidden');


        if (!this.timePicker.classList.contains('hidden')) {
            this.positionTimePicker();
            this.initializeTempState();
            this.scrollToSelection();
        }
    }

    handleInputChange() {
        this.updateDisplay();
    }

    renderTimePicker() {

        const noScrollStyle = `
            <style>
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;  
                    scrollbar-width: none;  
                }
            </style>
        `;

        this.timePicker.innerHTML = `
            ${noScrollStyle}
            <div class="flex space-x-4">
                <div class="flex-1">
                    <div class="text-center font-semibold mb-2 text-gray-300">Hours</div>
                    <div class="hours-list max-h-40 overflow-y-auto border border-gray-600 rounded no-scrollbar">
                        ${Array.from({ length: 24 }, (_, i) =>
            `<div class="hour-option px-3 py-2 text-center cursor-pointer hover:bg-gray-700 border-b border-gray-700 last:border-b-0 text-gray-200" data-hour="${i.toString().padStart(2, '0')}">
                                ${i.toString().padStart(2, '0')}
                            </div>`
        ).join('')}
                    </div>
                </div>
                <div class="flex-1">
                    <div class="text-center font-semibold mb-2 text-gray-300">Minutes</div>
                    <div class="minutes-list max-h-40 overflow-y-auto border border-gray-600 rounded no-scrollbar">
                        ${Array.from({ length: 60 }, (_, i) =>
            `<div class="minute-option px-3 py-2 text-center cursor-pointer hover:bg-gray-700 border-b border-gray-700 last:border-b-0 text-gray-200" data-minute="${i.toString().padStart(2, '0')}">
                                ${i.toString().padStart(2, '0')}
                            </div>`
        ).join('')}
                    </div>
                </div>
            </div>
            <div class="mt-4 flex justify-between items-center pt-3 border-t border-gray-700">
                <button type="button" class="cancel-time px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors">Cancel</button>
                <button type="button" class="confirm-time px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium">OK</button>
            </div>
        `;

        this.setupTimePickerEvents();
    }

    setupTimePickerEvents() {
        this.timePicker.querySelectorAll('.hour-option').forEach(hour => {
            hour.addEventListener('click', (e) => {
                e.stopPropagation();
                this.tempHours = hour.getAttribute('data-hour');
                this.updatePickerVisuals();
            });
        });

        this.timePicker.querySelectorAll('.minute-option').forEach(minute => {
            minute.addEventListener('click', (e) => {
                e.stopPropagation();
                this.tempMinutes = minute.getAttribute('data-minute');
                this.updatePickerVisuals();
            });
        });

        this.timePicker.querySelector('.confirm-time').addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.tempHours && this.tempMinutes) {
                const timeString = `${this.tempHours}:${this.tempMinutes}`;
                this.setValue(timeString);
                this.timePicker.classList.add('hidden');
            } else {
                if (!this.tempHours) this.highlightError('.hours-list');
                if (!this.tempMinutes) this.highlightError('.minutes-list');
            }
        });

        this.timePicker.querySelector('.cancel-time').addEventListener('click', (e) => {
            e.stopPropagation();
            this.timePicker.classList.add('hidden');
        });
    }

    highlightError(selector) {
        const el = this.timePicker.querySelector(selector);
        el.classList.add('border-red-500');
        setTimeout(() => el.classList.remove('border-red-500'), 1000);
    }

    updateDisplay() {
        if (this.input.value) {
            this.displayInput.value = this.input.value;
            const [hours, minutes] = this.input.value.split(':');
            this.selectedHours = hours;
            this.selectedMinutes = minutes;
        } else {
            this.displayInput.value = '';
            this.selectedHours = null;
            this.selectedMinutes = null;
        }
    }

    positionTimePicker() {



        this.timePicker.style.top = '100%';
        this.timePicker.style.bottom = 'auto';
        this.timePicker.style.left = '0';


        const rect = this.pickerContainer.getBoundingClientRect();
        const pickerRect = this.timePicker.getBoundingClientRect();





        if (rect.bottom + pickerRect.height > window.innerHeight) {

            this.timePicker.style.top = 'auto';
            this.timePicker.style.bottom = '100%';
        }
    }

    destroy() {
        if (this.displayInput && this.handleDisplayClick) {
            this.displayInput.removeEventListener('click', this.handleDisplayClick);
        }
        if (this.handleDocumentClick) {
            document.removeEventListener('click', this.handleDocumentClick);
        }
        if (this.input && this.handleInputChange) {
            this.input.removeEventListener('change', this.handleInputChange);
        }
        if (this.pickerContainer && this.pickerContainer.parentNode) {
            this.pickerContainer.parentNode.removeChild(this.pickerContainer);
        }
        if (this.input) {
            this.input.style.opacity = '';
            this.input.style.position = '';
            this.input.style.width = '';
            this.input.style.height = '';
            this.input.style.pointerEvents = '';
            delete this.input._customTimePicker;
        }
        this.displayInput = null;
        this.timePicker = null;
        this.pickerContainer = null;
    }
}