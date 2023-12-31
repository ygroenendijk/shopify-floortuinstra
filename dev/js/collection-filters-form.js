if (!customElements.get('collection-filters-form')) {
  class CollectionFiltersForm extends HTMLElement {

    constructor() {
      super();
      this.ww = window.innerWidth;
      this.filterData = [];

      this.loader = document.querySelector('.collection-wrapper [data-loader]');

      // Get the template - Collection or Search
      this.currentTemplate = 'collection';
      this.productGrid = document.querySelector('[data-collection-product-grid]');
      if ((document.body.classList.contains('template-search'))) {
        this.currentTemplate = 'search';
        this.productGrid = document.getElementById('SearchProductGrid');
      }

      this.onActiveFilterClick = this.onActiveFilterClick.bind(this);

      this.displayFilters();

      // Event listeners
      this.debouncedOnSubmit = debounce((event) => {
        this.onSubmitHandler(event);
      }, 500);
      this.querySelector('form').addEventListener('input', this.debouncedOnSubmit.bind(this));

      // remove the 'show filters' class from the body when we go from large to small screen
      this.debouncedOnResize = debounce(() => {
        const windowWidth = window.innerWidth;

        // check if there's an actual change in window width, because the resize is triggered on mobile when the viewport changes with the header
        if (windowWidth === this.ww) return;
        this.ww = windowWidth;

        if (this.ww < 768) document.body.classList.remove(window.drawerToggleClasses.filters);
      }, 100);
      window.addEventListener('resize', this.debouncedOnResize.bind(this));

      window.addEventListener('popstate', this.onHistoryChange.bind(this));

      // Extra events for collapsibles (when filter is displayed as flex)
      this.collapsibleComponent = this.querySelector('collapsible-component');
      if (this.collapsibleComponent) this.collapsibles = Array.from(this.collapsibleComponent.querySelectorAll('[data-collapsible-group]'));

      this.onBodyClick = this.handleBodyClick.bind(this);
      this.onKeyUp = this.handleOnKeyUp.bind(this);

      // listen for keyup when there are collapsibles so we can close opened collapsibles
      if (this.collapsibleComponent) document.addEventListener('keyup', this.onKeyUp);
      if (this.collapsibleComponent) document.body.addEventListener('click', this.onBodyClick);
    }

    handleOnKeyUp(event) {
      const openedCollapsible = this.collapsibles.filter(collapsible => collapsible.classList.contains('collapsible-is-open'))[0];
      if (event?.code.toUpperCase() === 'ESCAPE') this.collapsibleComponent.close(openedCollapsible);
    }

    /**
     * handleBodyClick
     * @param {Object} event
     */
    handleBodyClick(event) {
      const target = event.target;
      const openedCollapsible = this.collapsibles.filter(collapsible => collapsible.classList.contains('collapsible-is-open'))[0];
      if (target !== this.collapsibleComponent && !target.closest('collapsible-component')) this.collapsibleComponent.close(openedCollapsible);
    }

    /**
   * onSubmitHandler
   * @param {Object} event
   */
    onSubmitHandler(event) {
      event.preventDefault();

      // show the loader
      this.loader.classList.remove('hidden');

      const type = event.target.id === 'sort-options' ? 'sort' : 'filter';
      const isPriceRange = event.target.type === 'range';
      const hasPriceRange = new URLSearchParams(document.location.search).get('filter.v.price.lte');

      // when the price was changed, check that the inputs have correct min-max values, because you can drag the max input over the min one and vice versa
      if (isPriceRange) {
        const priceRange = document.querySelector('price-range');
        const minVal = +priceRange.minInput.value;
        const maxVal = +priceRange.maxInput.value;

        if (minVal && maxVal) {
          if (+priceRange.minInput.value > +priceRange.maxInput.value || +priceRange.maxInput.value < +priceRange.minInput.value) {
            priceRange.maxInput.value = minVal;
            priceRange.minInput.value = maxVal;

            // update the legend
            priceRange.minLabel.innerHTML = Shopify.formatMoney(+priceRange.minInput.value * 100);
            priceRange.maxLabel.innerHTML = Shopify.formatMoney(+priceRange.maxInput.value * 100);
          }
        }
      }

      const formData = new FormData(event.target.closest('form'));
      let searchParams = new URLSearchParams(formData);

      // Handle submit in the Collection page
      if (this.currentTemplate == 'collection') {
        const sortOption = new URLSearchParams(document.location.search).get('sort_by');
        const sortOptionString = `sort_by=${sortOption}`;

        if (type === 'sort') {
          searchParams = searchParams.toString();
          let filterOptions = document.location.search;

          // If there's already a sort option available, remove it from the options
          if (sortOption && filterOptions) {
            filterOptions = filterOptions.split(sortOptionString)[1].replaceAll('?','');
          }
          else if (filterOptions !== '') {
            filterOptions = filterOptions.replaceAll('?','');
          }

          // remove the first '&'
          if (filterOptions.charAt(0) === '&') {
            filterOptions = filterOptions.slice(1);
          }

          // if the filter options are not empty after we filtered out the sort option, then add it to the new sort option
          searchParams = `${searchParams}${(filterOptions) ? `&${filterOptions}` : ''}`;
        }
        // type is 'filter'
        else {
        // Filter the form parameters for empty values
          for (const [key, value] of new URLSearchParams(formData).entries()) {
            if (value === '') searchParams.delete(key);
          }
          // remove the price range from the params if the filter wasn't active yet and the price range wasn't changed
          if (!isPriceRange && !hasPriceRange) {
            searchParams.delete('filter.v.price.lte');
            searchParams.delete('filter.v.price.gte');
          }

          // stringify the params
          searchParams = searchParams.toString();

          // if there is a sort option, add it to the filters
          if (sortOption) {
            searchParams = (searchParams !== '') ? `${sortOptionString}&${searchParams}` : sortOptionString;
          }
        }

        // Render the page with the new params
        this.renderPage(searchParams, event);
      }
      // Handle submit in the Search page
      else {
        const currentParams = new URLSearchParams(document.location.search);

        // type is 'sort'
        if (type === 'sort') {
          if (currentParams.has('sort_by')) {
            currentParams.delete('sort_by');
          }
          if (currentParams !== '') {
            searchParams = (searchParams !== '') ? `${searchParams}&${currentParams}` : currentParams;
          }
        }
        // type is 'filter'
        else if (type === 'filter') {
        // Filter the form parameters for empty values
          for (const [key, value] of new URLSearchParams(formData).entries()) {
            if (value === '') {
              searchParams.delete(key);
            }
          }

          // reset the sort by option
          if (currentParams.has('sort_by') && type !== 'sort') {
            searchParams.append('sort_by', currentParams.get('sort_by'));
          }
          // set back all the pre-existent parameters (searched query, searched type & options)
          const preExistentSearchParams = ['q','type','options[prefix]'];
          preExistentSearchParams.forEach((param) => {
            if (currentParams.has(param)) {
              searchParams.append(param, currentParams.get(param));
            }
          });
        }

        // Render the page with the new params
        this.renderPage(searchParams.toString(), event);
      }

      // Scroll to page top
      window.scrollTo({ top: this.productGrid.offsetParent.offsetTop - 84,
        behavior: 'smooth' });
    }

    /**
   * onActiveFilterClick
   * @param {Object} event
   */
    onActiveFilterClick(event) {
      event.preventDefault();
      this.renderPage(new URL(event.currentTarget.href).searchParams.toString(), null);
    }

    /**
   * onHistoryChange
   * @param {Object} event
   */
    onHistoryChange(event) {
      const searchParams = event.state?.searchParams || '';
      this.renderPage(searchParams, null, false);
    }

    /**
     * toggleActiveFilters
     * @param {Boolean} disable
     */
    toggleActiveFilters(disable = true) {
      document.querySelectorAll('[data-filter-remove]').forEach((element) => {
        element.classList.toggle('disabled', disable);
      });

      this.displayFilters();
    }

    /**
   * renderPage
   * @param {String} searchParams
   * @param {Object} event
   * @param {Boolean} updateURLHash
   */
    renderPage(searchParams, event, updateURLHash = true) {
      let sectionName = 'theme-collection-filters-content';

      // do fetch
      const url = `${window.location.pathname}?section_id=${sectionName}&${searchParams}`;

      const filterDataUrl = element => element.url === url;

      this.filterData.some(filterDataUrl) ?
        this.renderSectionFromCache(filterDataUrl, event, searchParams) :
        this.renderSectionFromFetch(url, event, searchParams);

      if (updateURLHash) this.updateURLHash(searchParams);
    }

    /**
   * renderSectionFromFetch
   * @param {String} url
   * @param {Object} event
   * @param {String} searchParams
   */
    renderSectionFromFetch(url, event, searchParams) {
      fetch(url)
        .then(response => response.text())
        .then((responseText) => {
          const html = responseText;
          this.filterData = [...this.filterData, {
            html,
            url,
          } ];
          setTimeout(() => {
            this.renderProductGrid(html, event, searchParams);
            this.renderFilters(html, event);
          }, 50);
        })
        .then(() => {
          this.loadMore = document.querySelector('load-more');
          this.loadMore?.initLoadMoreButtons();
        });
    }

    /**
   * renderSectionFromCache
   * @param {String} filterDataUrl
   * @param {Object} event
   * @param {String} searchParams
   */
    renderSectionFromCache(filterDataUrl, event, searchParams) {
      const html = this.filterData.find(filterDataUrl).html;

      this.renderProductGrid(html, event, searchParams);
      this.renderFilters(html, event);
    }

    /**
   * renderProductGrid
   * @param {Node} html
   * @param {Object} event
   * @param {String} searchParams
   */
    renderProductGrid(html, event) {
      const parsedHTML = new DOMParser().parseFromString(html, 'text/html');

      this.productGrid.innerHTML = parsedHTML.getElementById('products').innerHTML;

      // update result size, only on filter, not on sorting
      if (event?.target.id !== 'sort-options') {
        const results = parsedHTML.getElementById('products').dataset.resultsSize;
        if (this.querySelector('[data-filter-results-count]')) {
          this.querySelector('[data-filter-results-count]').textContent = results;
        }
      }

      // update the text
      const totalProducts = parsedHTML.querySelector('[data-collection-totals-text]')?.innerHTML;
      if (totalProducts) document.querySelectorAll('[data-collection-totals-text]').forEach(elem => elem.innerHTML = totalProducts);

      // hide the loader
      this.loader.classList.add('hidden');
    }

    /**
     * renderFilters
     * @param {Node} html
     * @param {Object} event
     */
    renderFilters(html, event) {
      const parsedHTML = new DOMParser().parseFromString(html, 'text/html');
      const filterOptionElements = parsedHTML.querySelectorAll(
        '[data-collection-filters-form] [data-filter-option]',
      );
      const matchesIndex = element =>
        element.dataset.index === event?.target.closest('[data-filter-option]')?.dataset.index;
      const filterOptionsToRender = Array.from(filterOptionElements).filter(
        element => !matchesIndex(element),
      );

      filterOptionsToRender.forEach((element) => {
        document.querySelector(
          `[data-filter-option][data-index="${element.dataset.index}"]`,
        ).innerHTML = element.innerHTML;
      });

      this.renderActiveFilters(parsedHTML);

      // rebind the event listeners for the collapsibles
      if (this.collapsibleComponent) this.collapsibleComponent.construct();
    }

    /**
     * renderActiveFilters
     * @param {*} html
     * @returns
     */
    renderActiveFilters(html) {
      // Select filter active group
      const activeFilterOptions = html.querySelector('[data-filter-active-options]');

      // Check if it here
      if (!activeFilterOptions) return;

      // Hide it
      activeFilterOptions.parentNode.classList.add('hidden');
      // Replace old with new active filters
      document.querySelector('[data-filter-active-options]').innerHTML =
        activeFilterOptions.innerHTML;
      // Show it again
      activeFilterOptions.parentNode.classList.remove('hidden');
      //
      this.displayFilters();
      this.toggleActiveFilters(false);
    }

    /**
     * displayFilters
     */
    displayFilters() {
      this.updateTotalActiveFilterOptionsCount();

      // check all filters and hide the ones with no options
      const filterOptions = document.querySelectorAll('[data-filter-option-list]');
      filterOptions.forEach(filterOption =>
        filterOption.children.length === 0
          ? filterOption.closest('[data-filter-option]').classList.add('hidden')
          : filterOption.closest('[data-filter-option]').classList.remove('hidden'),
      );
    }

    updateTotalActiveFilterOptionsCount() {
      const activeFiltersElement = document.querySelector('[data-filter-active-options]');
      if (!activeFiltersElement) return;

      const activeFilters = document.querySelector('[data-filter-active-options-list]').children;
      const filterTotalWrapper = document.querySelector('[data-filter-total-active-options]');
      const filterResetButton = document.querySelector('[data-filter-clear-all]');

      // if there are active filters, remove the class so it displays and update the total in the filter button
      if (activeFilters.length > 0) {
        activeFiltersElement?.classList.remove('hidden');
        filterTotalWrapper.innerHTML = `&nbsp;(${activeFilters.length})`;
        // Update show / hide state clear all button
        filterResetButton.classList.remove('hidden');
      }
      // else add the class to hide and clear the button
      else {
        filterTotalWrapper.innerHTML = '';
        activeFiltersElement?.classList.add('hidden');
        // Update show / hide state clear all button
        filterResetButton.classList.add('hidden');
      }
    }

    /**
   * updateURLHash
   * @param {String} searchParams
   */
    updateURLHash(searchParams) {
      history.pushState({ searchParams }, '', `${window.location.pathname}${searchParams && '?'.concat(searchParams)}`);
    }
  }
  customElements.define('collection-filters-form', CollectionFiltersForm);
}

if (!customElements.get('price-range')) {
  class PriceRange extends HTMLElement {
    constructor() {
      super();

      this.minInput = this.querySelector('[data-price-range-min-input]');
      this.maxInput = this.querySelector('[data-price-range-max-input]');

      this.minLabel = this.querySelector('[data-price-range-values] [data-price-range-min]');
      this.maxLabel = this.querySelector('[data-price-range-values] [data-price-range-max]');

      // update the style of the input
      [this.minInput,this.maxInput].forEach((element) => {
        element.addEventListener('input', (event) => {
          setTimeout(() => {
            this.onRangeChange.bind(this);

            // update the spans
            if (element === this.minInput) {
              const { min, max } = this.minInput;

              this.low = Math.round(100 * (+element.value - min) / (max - min));
              document.querySelector('[data-price-range-track]').style.setProperty('--low', this.low + '%');

              this.minLabel.innerHTML = Shopify.formatMoney(event.target.value * 100);
            }
            else {

              const { min, max } = this.maxInput;
              this.high = Math.round(100 * (+element.value - min) / (max - min));
              document.querySelector('[data-price-range-track]').style.setProperty('--high', this.high + '%');
              this.maxLabel.innerHTML = Shopify.formatMoney(event.target.value * 100);
            }

          }, 50);
        });
      });
    }

    onRangeChange(event) {
      this.getValidRange(event.currentTarget);
    }

    getValidRange(input) {
      const value = +input.value;
      const min = +input.getAttribute('min');
      const max = +input.getAttribute('max');

      if (value < min) input.value = min;
      if (value > max) input.value = max;
    }
  }
  customElements.define('price-range', PriceRange);
}

// Active Filter remove
if (!customElements.get('filter-remove')) {
  class OptionRemove extends HTMLElement {
    constructor() {
      super();

      this.querySelector('a').addEventListener('click', (event) => {
        event.preventDefault();
        const form = this.closest('collection-filters-form') || document.querySelector('collection-filters-form');
        form.onActiveFilterClick(event);
      });
    }
  }
  customElements.define('filter-remove', OptionRemove);
}
