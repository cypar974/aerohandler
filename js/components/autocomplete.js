// ./js/components/autocomplete.js

export class Autocomplete {
    constructor(config) {
        this.config = {
            inputElement: null,
            dataSource: [],

            allowedTypes: null,
            maxSuggestions: 10,
            displayField: 'name',
            valueField: 'id',
            additionalFields: ['email'],
            placeholder: 'Start typing...',
            noResultsText: 'No matches found',
            onSelect: null,
            onInput: null,
            customFilter: null,
            ...config
        };

        this.inputElement = this.config.inputElement;
        this.isOpen = false;
        this.selectedItem = null;

        this.init();
    }

    init() {
        if (!this.inputElement) {
            console.error('Autocomplete: inputElement is required');
            return;
        }

        this.createSuggestionsContainer();
        this.setupEventListeners();
        this.applyStyles();
    }

    createSuggestionsContainer() {

        this.suggestionsContainer = document.createElement('ul');
        this.suggestionsContainer.className = 'autocomplete-suggestions';
        this.suggestionsContainer.style.cssText = `
            position: absolute;
            left: 0;
            right: 0;
            top: 100%;
            margin-top: 0.25rem;
            background: #1f2937;
            border: 1px solid #374151;
            border-radius: 0.75rem;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
            max-height: 240px;
            overflow-y: auto;
            z-index: 50;
            display: none;
            backdrop-filter: blur(8px);
        `;


        this.inputElement.parentNode.insertBefore(this.suggestionsContainer, this.inputElement.nextSibling);
    }

    setupEventListeners() {

        this.inputElement.addEventListener('input', (e) => {
            this.handleInput(e.target.value);
            this.config.onInput?.(e.target.value);
        });

        this.inputElement.addEventListener('focus', () => {
            if (this.inputElement.value) {
                this.handleInput(this.inputElement.value);
            }
        });

        this.inputElement.addEventListener('blur', () => {

            setTimeout(() => this.hideSuggestions(), 150);
        });

        this.inputElement.addEventListener('keydown', (e) => {
            this.handleKeydown(e);
        });


        document.addEventListener('click', (e) => {
            if (!this.inputElement.contains(e.target) && !this.suggestionsContainer.contains(e.target)) {
                this.hideSuggestions();
            }
        });
    }

    handleInput(query) {
        if (!query.trim()) {
            this.hideSuggestions();
            return;
        }

        const filteredItems = this.filterItems(query);
        this.displaySuggestions(filteredItems);
    }

    filterItems(query) {
        if (this.config.customFilter) {
            return this.config.customFilter(query, this.config.dataSource);
        }

        const lowercaseQuery = query.toLowerCase();

        return this.config.dataSource.filter(item => {

            if (this.config.allowedTypes && this.config.allowedTypes.length > 0) {

                if (item.type && !this.config.allowedTypes.includes(item.type)) {
                    return false;
                }
            }



            const displayValue = String(item[this.config.displayField] || '').toLowerCase();
            const matchesDisplay = displayValue.includes(lowercaseQuery);


            const matchesAdditional = this.config.additionalFields.some(field => {
                const fieldValue = String(item[field] || '').toLowerCase();
                return fieldValue.includes(lowercaseQuery);
            });

            return matchesDisplay || matchesAdditional;
        }).slice(0, this.config.maxSuggestions);
    }

    displaySuggestions(items) {
        if (items.length === 0) {
            this.suggestionsContainer.innerHTML = `
                <li class="autocomplete-no-results" style="padding: 0.75rem; color: #9ca3af; text-align: center;">
                    ${this.config.noResultsText}
                </li>
            `;
        } else {
            this.suggestionsContainer.innerHTML = items.map(item => this.createSuggestionItem(item)).join('');
        }

        this.showSuggestions();
        this.setupSuggestionEvents();
    }

    createSuggestionItem(item) {
        const displayValue = item[this.config.displayField];
        const additionalInfo = this.config.additionalFields.map(field => {
            const value = item[field];
            return value ? `• ${value}` : '';
        }).filter(Boolean).join(' ');

        const itemType = this.getItemType(item);

        return `
            <li class="autocomplete-item" 
                data-id="${item[this.config.valueField]}" 
                data-value="${displayValue}"
                style="padding: 0.75rem; border-bottom: 1px solid #374151; cursor: pointer; transition: background-color 0.2s;"
                onmouseover="this.style.backgroundColor='#374151'"
                onmouseout="this.style.backgroundColor='transparent'">
                <div style="font-weight: 500; color: white;">${displayValue}</div>
                ${additionalInfo ? `<div style="font-size: 0.75rem; color: #9ca3af; margin-top: 0.25rem;">${itemType} ${additionalInfo}</div>` : ''}
            </li>
        `;
    }

    getItemType(item) {

        if (!item.type) {

            if (item.first_name && item.last_name) return 'User';
            return '';
        }


        switch (item.type) {
            case 'student': return 'Student';
            case 'instructor': return 'Instructor';
            case 'regular_pilot': return 'Pilot';
            case 'maintenance_technician': return 'Technician';
            case 'other_person': return 'Guest';
            default: return 'User';
        }
    }

    setupSuggestionEvents() {
        this.suggestionsContainer.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectItem({
                    id: item.getAttribute('data-id'),
                    value: item.getAttribute('data-value'),
                    rawItem: this.config.dataSource.find(i => i[this.config.valueField] === item.getAttribute('data-id'))
                });
            });
        });
    }

    handleKeydown(e) {
        const items = this.suggestionsContainer.querySelectorAll('.autocomplete-item');
        const currentFocus = this.suggestionsContainer.querySelector('.autocomplete-item-focused');

        let index = Array.from(items).indexOf(currentFocus);

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                index = (index + 1) % items.length;
                this.setFocus(items[index]);
                break;

            case 'ArrowUp':
                e.preventDefault();
                index = index <= 0 ? items.length - 1 : index - 1;
                this.setFocus(items[index]);
                break;

            case 'Enter':
                e.preventDefault();
                if (currentFocus) {
                    currentFocus.click();
                }
                break;

            case 'Escape':
                this.hideSuggestions();
                break;
        }
    }

    setFocus(item) {
        this.suggestionsContainer.querySelectorAll('.autocomplete-item').forEach(i => {
            i.style.backgroundColor = 'transparent';
            i.classList.remove('autocomplete-item-focused');
        });

        if (item) {
            item.style.backgroundColor = '#374151';
            item.classList.add('autocomplete-item-focused');
        }
    }

    selectItem(selected) {
        this.selectedItem = selected;
        this.inputElement.value = selected.value;
        this.hideSuggestions();


        this.config.onSelect?.(selected);
    }

    showSuggestions() {
        this.suggestionsContainer.style.display = 'block';
        this.isOpen = true;
    }

    hideSuggestions() {
        this.suggestionsContainer.style.display = 'none';
        this.isOpen = false;
    }

    applyStyles() {

        if (getComputedStyle(this.inputElement.parentNode).position === 'static') {
            this.inputElement.parentNode.style.position = 'relative';
        }
    }


    updateData(newData) {
        this.config.dataSource = newData;
    }

    getSelectedItem() {
        return this.selectedItem;
    }

    clear() {
        this.inputElement.value = '';
        this.selectedItem = null;
        this.hideSuggestions();
    }

    destroy() {
        this.suggestionsContainer.remove();


    }
}

// =============================================================================
// GLOBAL HELPER: STANDARD PERSON AUTOCOMPLETE SETUP
// Use this in all modals to ensure consistent behavior
// =============================================================================

/**
 * Standardizes the setup of an autocomplete field for selecting people.
 * Handles binding the input, updating the hidden ID field, and filtering by role.
 * * @param {Object} config Configuration object
 * @param {string} config.inputId - ID of the text input element
 * @param {string} config.hiddenId - ID of the hidden input element for the UUID
 * @param {Array} config.peopleData - Array of person objects (from )
 * @param {string} config.roleFilter - 'pilots', 'instructors', 'students', 'technicians' or 'all'
 * @param {Function} [config.onSelect] - Optional callback when an item is selected
 * @returns {Autocomplete|null} The created instance or null if input missing
 */
export function setupPersonAutocomplete({ inputId, hiddenId, peopleData, roleFilter, onSelect }) {
    const inputElement = document.getElementById(inputId);
    const hiddenElement = document.getElementById(hiddenId);

    if (!inputElement) {
        console.warn(`Autocomplete input not found: ${inputId}`);
        return null;
    }



    const dataSource = peopleData.map(p => ({
        id: p.id,
        name: p.name || `${p.first_name} ${p.last_name}`,
        first_name: p.first_name,
        last_name: p.last_name,
        email: p.email,
        type: p.type
    }));


    let allowedTypes = null;

    switch (roleFilter) {
        case 'pilots':


            allowedTypes = ['student', 'regular_pilot', 'instructor'];
            break;
        case 'instructors':
            allowedTypes = ['instructor'];
            break;
        case 'students':
            allowedTypes = ['student'];
            break;
        case 'technicians':
            allowedTypes = ['maintenance_technician'];
            break;
        case 'all':
        default:
            allowedTypes = null;
            break;
    }


    return new Autocomplete({
        inputElement: inputElement,
        dataSource: dataSource,
        allowedTypes: allowedTypes,
        displayField: 'name',
        valueField: 'id',
        additionalFields: ['email'],
        placeholder: inputElement.placeholder || 'Start typing...',
        onSelect: (selected) => {

            if (hiddenElement) {
                hiddenElement.value = selected.id;
            }

            if (onSelect) {
                onSelect(selected);
            }
        },
        onInput: (query) => {

            if (!query.trim() && hiddenElement) {
                hiddenElement.value = "";
            }
        }
    });
}

// Backward compatibility default export
export function createAutocomplete(config) {
    return new Autocomplete(config);
}