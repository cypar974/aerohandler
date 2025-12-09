// ./js/components/customTimePicker.js
export class CustomTimePicker {
    constructor(inputElement) {
        this.input = inputElement;
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.selectedHours = null;
        this.selectedMinutes = null;
        this.init();
    }

    init() {
        if (this.isMobile) return;

        // Hide the native picker but keep it functional
        this.input.style.opacity = '0';
        this.input.style.position = 'absolute';
        this.input.style.width = '0';
        this.input.style.height = '0';
        this.input.style.pointerEvents = 'none';

        // Create custom picker container
        this.pickerContainer = document.createElement('div');
        this.pickerContainer.className = 'custom-time-picker-container relative';

        // Create display input
        this.displayInput = document.createElement('input');
        this.displayInput.type = 'text';
        this.displayInput.className = this.input.className;
        this.displayInput.placeholder = this.input.placeholder || 'Select time';
        this.displayInput.readOnly = true;

        // Create time dropdown
        this.timePicker = document.createElement('div');
        this.timePicker.className = 'custom-time-picker hidden absolute top-full left-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 p-4 w-48';

        this.pickerContainer.appendChild(this.displayInput);
        this.pickerContainer.appendChild(this.timePicker);

        this.input.parentNode.insertBefore(this.pickerContainer, this.input.nextSibling);

        this.setupEventListeners();
        this.renderTimePicker();
        this.updateDisplay(); // Initialize display with current value
    }

    setValue(timeString) {
        console.log('CustomTimePicker setValue called with:', timeString);

        // Set the value on the original input
        this.input.value = timeString;

        // Update the display input
        this.updateDisplay();

        // Store the selected time
        if (timeString) {
            const [hours, minutes] = timeString.split(':');
            this.selectedHours = hours;
            this.selectedMinutes = minutes;

            // Pre-select in the UI if picker is open
            if (!this.timePicker.classList.contains('hidden')) {
                this.updateTimeSelection(hours, minutes);
            }
        }

        // Trigger change event on the original input for auto-calculation
        // Use a small timeout to ensure DOM is updated
        setTimeout(() => {
            const changeEvent = new Event('change', { bubbles: true });
            const inputEvent = new Event('input', { bubbles: true });

            this.input.dispatchEvent(changeEvent);
            this.input.dispatchEvent(inputEvent);

            console.log('Events dispatched for time:', timeString);
        }, 10);
    }

    preSelectTime(hours, minutes) {
        // Store the selected time for when the picker opens
        this.selectedHours = hours;
        this.selectedMinutes = minutes;

        // If the picker is currently open, update the selection immediately
        if (!this.timePicker.classList.contains('hidden')) {
            this.updateTimeSelection(hours, minutes);
        }
    }

    updateTimeSelection(hours, minutes) {
        // Clear previous selections
        this.timePicker.querySelectorAll('.hour-option, .minute-option').forEach(option => {
            option.classList.remove('bg-blue-600', 'text-white');
        });

        // Select the hour
        const hourOption = this.timePicker.querySelector(`.hour-option[data-hour="${hours}"]`);
        if (hourOption) {
            hourOption.classList.add('bg-blue-600', 'text-white');
            // Scroll to the selected hour
            hourOption.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }

        // Select the minute
        const minuteOption = this.timePicker.querySelector(`.minute-option[data-minute="${minutes}"]`);
        if (minuteOption) {
            minuteOption.classList.add('bg-blue-600', 'text-white');
            // Scroll to the selected minute
            minuteOption.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }

        // Update the selected time display
        this.updateSelectedTime(hours, minutes);
    }

    setupEventListeners() {
        // Store reference to the click handler for proper cleanup
        this.handleDocumentClick = this.handleDocumentClick.bind(this);
        this.handleDisplayClick = this.handleDisplayClick.bind(this);
        this.handleInputChange = this.handleInputChange.bind(this);
        this.handleInputInput = this.handleInputInput.bind(this);

        this.displayInput.addEventListener('click', this.handleDisplayClick);
        document.addEventListener('click', this.handleDocumentClick);
        this.input.addEventListener('change', this.handleInputChange);
        this.input.addEventListener('input', this.handleInputInput);
    }

    // Add these new handler methods
    handleDocumentClick(e) {
        if (this.pickerContainer && !this.pickerContainer.contains(e.target)) {
            this.timePicker.classList.add('hidden');
        }
    }

    handleDisplayClick() {
        this.timePicker.classList.toggle('hidden');
        this.positionTimePicker();

        // Pre-select the current time when opening
        if (!this.timePicker.classList.contains('hidden')) {
            const currentValue = this.input.value;
            if (currentValue) {
                const [hours, minutes] = currentValue.split(':');
                this.updateTimeSelection(hours, minutes);
            } else if (this.selectedHours && this.selectedMinutes) {
                this.updateTimeSelection(this.selectedHours, this.selectedMinutes);
            }
        }
    }

    handleInputChange() {
        this.updateDisplay();
    }

    handleInputInput() {
        this.updateDisplay();
    }

    renderTimePicker() {
        this.timePicker.innerHTML = `
            <div class="flex space-x-4">
                <div class="flex-1">
                    <div class="text-center font-semibold mb-2">Hours</div>
                    <div class="hours-list max-h-40 overflow-y-auto border border-gray-600 rounded">
                        ${Array.from({ length: 24 }, (_, i) =>
            `<div class="hour-option px-3 py-2 text-center cursor-pointer hover:bg-gray-700 border-b border-gray-700 last:border-b-0" data-hour="${i.toString().padStart(2, '0')}">
                                ${i.toString().padStart(2, '0')}
                            </div>`
        ).join('')}
                    </div>
                </div>
                <div class="flex-1">
                    <div class="text-center font-semibold mb-2">Minutes</div>
                    <div class="minutes-list max-h-40 overflow-y-auto border border-gray-600 rounded">
                        ${Array.from({ length: 60 }, (_, i) =>
            `<div class="minute-option px-3 py-2 text-center cursor-pointer hover:bg-gray-700 border-b border-gray-700 last:border-b-0" data-minute="${i.toString().padStart(2, '0')}">
                                ${i.toString().padStart(2, '0')}
                            </div>`
        ).join('')}
                    </div>
                </div>
            </div>
            <div class="mt-4 flex justify-between items-center">
                <div class="selected-time font-mono text-lg" id="selected-time">--:--</div>
                <button type="button" class="confirm-time px-4 py-2 bg-blue-600 rounded hover:bg-blue-700">OK</button>
            </div>
        `;

        this.setupTimePickerEvents();
    }

    setupTimePickerEvents() {
        let selectedHour = this.selectedHours;
        let selectedMinute = this.selectedMinutes;

        // If we have stored values, pre-select them
        if (selectedHour && selectedMinute) {
            this.updateTimeSelection(selectedHour, selectedMinute);
        }

        // Hour selection
        this.timePicker.querySelectorAll('.hour-option').forEach(hour => {
            hour.addEventListener('click', () => {
                this.timePicker.querySelectorAll('.hour-option').forEach(h =>
                    h.classList.remove('bg-blue-600', 'text-white'));
                hour.classList.add('bg-blue-600', 'text-white');
                selectedHour = hour.getAttribute('data-hour');
                this.selectedHours = selectedHour;

                // Clear minute selection when hour changes if no minute was previously selected
                if (!selectedMinute) {
                    this.timePicker.querySelectorAll('.minute-option').forEach(m =>
                        m.classList.remove('bg-blue-600', 'text-white'));
                    this.selectedMinutes = null;
                }

                this.updateSelectedTime(selectedHour, selectedMinute);
            });
        });

        // Minute selection
        this.timePicker.querySelectorAll('.minute-option').forEach(minute => {
            minute.addEventListener('click', () => {
                this.timePicker.querySelectorAll('.minute-option').forEach(m =>
                    m.classList.remove('bg-blue-600', 'text-white'));
                minute.classList.add('bg-blue-600', 'text-white');
                selectedMinute = minute.getAttribute('data-minute');
                this.selectedMinutes = selectedMinute;
                this.updateSelectedTime(selectedHour, selectedMinute);
            });
        });

        // Confirm selection
        // Confirm selection
        this.timePicker.querySelector('.confirm-time').addEventListener('click', () => {
            if (selectedHour && selectedMinute) {
                const timeString = `${selectedHour}:${selectedMinute}`;
                this.setValue(timeString);
                this.timePicker.classList.add('hidden');
            } else {
                // Show visual feedback that both are required
                if (!selectedHour) {
                    this.timePicker.querySelector('.hours-list').classList.add('border-red-500');
                    setTimeout(() => {
                        this.timePicker.querySelector('.hours-list').classList.remove('border-red-500');
                    }, 1000);
                }
                if (!selectedMinute) {
                    this.timePicker.querySelector('.minutes-list').classList.add('border-red-500');
                    setTimeout(() => {
                        this.timePicker.querySelector('.minutes-list').classList.remove('border-red-500');
                    }, 1000);
                }
            }
        });

        // Also allow clicking the selected time display to confirm
        this.timePicker.querySelector('.selected-time').addEventListener('click', () => {
            if (selectedHour && selectedMinute) {
                const timeString = `${selectedHour}:${selectedMinute}`;
                this.setValue(timeString);
                this.timePicker.classList.add('hidden');
            }
            // Don't do anything if selection is incomplete
        });
    }

    updateSelectedTime(hour, minute) {
        const selectedTimeElement = this.timePicker.querySelector('#selected-time');
        if (hour && minute) {
            selectedTimeElement.textContent = `${hour}:${minute}`;
            selectedTimeElement.classList.remove('text-gray-400', 'text-yellow-400');
            selectedTimeElement.classList.add('text-white');
        } else {
            // Show partial selection state
            const partialTime = hour ? `${hour}:--` : minute ? `--:${minute}` : '--:--';
            selectedTimeElement.textContent = partialTime;

            if (hour || minute) {
                // Yellow color for partial selection
                selectedTimeElement.classList.remove('text-gray-400', 'text-white');
                selectedTimeElement.classList.add('text-yellow-400');
            } else {
                // Gray color for no selection
                selectedTimeElement.classList.remove('text-yellow-400', 'text-white');
                selectedTimeElement.classList.add('text-gray-400');
            }
        }
    }

    updateDisplay() {
        if (this.input.value) {
            this.displayInput.value = this.input.value;
            // Also update our internal state
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
        this.timePicker.style.left = '0';
        this.timePicker.style.top = '100%';

        // Ensure the picker stays within viewport
        const rect = this.pickerContainer.getBoundingClientRect();
        const pickerRect = this.timePicker.getBoundingClientRect();

        if (rect.bottom + pickerRect.height > window.innerHeight) {
            this.timePicker.style.top = 'auto';
            this.timePicker.style.bottom = '100%';
        }
    }

    destroy() {
        console.log('🧹 Destroying CustomTimePicker...');

        // Remove event listeners
        if (this.displayInput && this.handleDisplayClick) {
            this.displayInput.removeEventListener('click', this.handleDisplayClick);
        }

        if (this.handleDocumentClick) {
            document.removeEventListener('click', this.handleDocumentClick);
        }

        if (this.input && this.handleInputChange) {
            this.input.removeEventListener('change', this.handleInputChange);
        }

        if (this.input && this.handleInputInput) {
            this.input.removeEventListener('input', this.handleInputInput);
        }

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
            this.input.style.pointerEvents = '';
        }

        // Clean up all references
        this.displayInput = null;
        this.timePicker = null;
        this.pickerContainer = null;
        this.handleDocumentClick = null;
        this.handleDisplayClick = null;
        this.handleInputChange = null;
        this.handleInputInput = null;

        console.log('✅ CustomTimePicker destroyed');
    }

    // Helper method to get current value
    getValue() {
        return this.input.value;
    }

    // Helper method to check if value is set
    hasValue() {
        return !!this.input.value;
    }
}