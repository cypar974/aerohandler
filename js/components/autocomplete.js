// ./js/components/components/autocomplete.js

export class Autocomplete {
    constructor(config) {
        this.config = {
            inputElement: null,
            dataSource: [], // Array of objects with at least { id, name }
            searchTypes: ['students', 'instructors'], // ['students', 'instructors'] or either
            maxSuggestions: 10,
            displayField: 'name',
            valueField: 'id',
            additionalFields: ['email'], // Fields to display in suggestions
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

        // Insert after input element
        this.inputElement.parentNode.insertBefore(this.suggestionsContainer, this.inputElement.nextSibling);
    }

    setupEventListeners() {
        // Input events
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
            // Delay hiding to allow for item selection
            setTimeout(() => this.hideSuggestions(), 150);
        });

        this.inputElement.addEventListener('keydown', (e) => {
            this.handleKeydown(e);
        });

        // Click outside to close
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
            // Search in display field
            const displayValue = String(item[this.config.displayField] || '').toLowerCase();
            const matchesDisplay = displayValue.includes(lowercaseQuery);

            // Search in additional fields
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
        // CHANGED: Use the 'type' field that's already included in the data from DataSources
        if (item.type === 'student') return 'Student';
        if (item.type === 'instructor') return 'Instructor';

        // Fallback: check available fields (both students and instructors now have first_name/last_name)
        if (item.first_name && item.last_name) {
            return 'User'; // Generic fallback since both types have same fields now
        }
        return '';
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

        // Trigger callback
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
        // Ensure input has relative positioning for absolute positioning of suggestions
        if (getComputedStyle(this.inputElement.parentNode).position === 'static') {
            this.inputElement.parentNode.style.position = 'relative';
        }
    }

    // Public methods
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
        // Remove event listeners (simplified - in production you'd want proper cleanup)
        this.inputElement.removeEventListener('input', this.handleInput);
        this.inputElement.removeEventListener('focus', this.handleFocus);
        this.inputElement.removeEventListener('blur', this.handleBlur);
        this.inputElement.removeEventListener('keydown', this.handleKeydown);
    }
}

// Helper function to create autocomplete easily
export function createAutocomplete(config) {
    return new Autocomplete(config);
}