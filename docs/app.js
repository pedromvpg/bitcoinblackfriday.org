/**
 * @fileoverview Main application code for Bitcoin Black Friday.
 */
'use strict';

function format(dateString) {
  const d = new Date(dateString);
  const date = d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
  const time = d.toLocaleTimeString('en-US', {hour: 'numeric'});
  return `${date}, ${time}`;
}

/**
 * Load deals from JSON.
 */
async function loadDeals() {
  const res = await fetch('./deals.json')
  const deals = await res.json();
  deals.forEach((deal, index) => deal.index = index);
  return deals;
}

/**
 * Find the deal template element and return a selection containing it.
 */
function getDealTemplate() {
  const templateContent = $('[data-role="deal-template"]').get(0).content;
  return $(templateContent).find('[data-role="deal"]');
}

/**
 * Create a $deal selection by cloning the $template and filling in data values
 * from the deal data object.
 */
function createDeal($template, deal) {
  const $deal = $template.clone();

  $deal.attr('data-index', deal.index)
    .attr('data-discount', deal.discount)
    .attr('data-title', deal.title)
    .toggleClass('featured', deal.featured);

  if (deal.image) {
    $deal.find('.image img').attr('src', `./images/${deal.image}`);
  }

  $deal.find('[data-role="product-link"]').attr('href', deal.url || null);

  $deal.find('.header').text(deal.title);
  $deal.find('.description').text(deal.description);

  $deal.find('.starts .datetime')
    .text(deal.starts ? format(deal.starts) : 'today');

  $deal.find('.ends .datetime')
    .text(deal.ends ? format(deal.ends) : 'forever');

  $deal.find('.discount').text(`${deal.discount || 0}%`);

  $deal.find('.discount-code').text(`${deal.code ? deal.code : 'N/A'}`);

  const $categories = $deal.find('.categories').empty();
  for (const category of deal.categories || []) {
    const $li = $('<li></li>')
      .attr('data-category', category)
      .text(category);
    $categories.append($li);
  }

  return $deal;
}

/**
 * For each deal, clone the template, fill in values, then append all of them
 * into the deals area.
 */
function setupDeals(deals) {
  const $template = getDealTemplate();
  const $deals = deals.map((deal) => createDeal($template, deal));
  $deals.sort(compareDefault);
  $('[data-role="deals"]').empty().append(...$deals);
}

/**
 * Get the unique list of categories among deals (lowercase).
 */
function getUniqueCategories(deals) {
  const set = new Set();
  for (const deal of deals) {
    for (const category of deal.categories || []) {
      set.add(category.toLowerCase());
    }
  }
  const uniqueCategories = [...set.values()];
  uniqueCategories.sort((a, b) => a.localeCompare(b));
  return uniqueCategories;
}

/**
 * Create category buttons in nav.
 */
function setupCategories(deals) {
  const uniqueCategories = getUniqueCategories(deals);

  // Create nav menu items.
  const $menu = $('[data-role="nav-menu"]');
  for (const category of uniqueCategories.values()) {
    const $item = $('<a class="header item"></a>')
      .attr('data-role', 'filter')
      .attr('data-filter', 'category')
      .attr('data-category', category);
    $item.append('span').text(category);
    $menu.append($item);
  }

  // Copy nav menu content to sidebar.
  $('[data-role="sidebar"]').html($menu.html());
}

/**
 * Setup click handler for sidebar and nav filters.
 */
function setupFilters() {
  // Finds all filter items in both sidebar and nav.
  const $filters = $('[data-role="filter"]');

  $filters.click((event) => {
    const $target = $(event.currentTarget);

    // Make this filter the only active filter.
    const wasActive = $target.hasClass('active');
    $filters.removeClass('active');
    $target.toggleClass('active', !wasActive);

    // Set up filter function.
    let filterFn;
    if (wasActive) {
      filterFn = () => true;
    } else if ($target.attr('data-filter') === 'category') {
      const category = $target.attr('data-category');
      filterFn = ($deal) =>
        $deal.find(`.categories [data-category="${category}"]`).length;
    } else {
      filterFn = ($deal) => $deal.hasClass('featured');
    }

    // Apply filter.
    $('[data-role="deal"]')
      .each((_, elem) => {
        const $deal = $(elem);
        $deal.css('display', filterFn($deal) ? '' : 'none');
      });
  });
}

/**
 * Sort compare function that places featured before non-featureb but otherwise
 * compares deals' indices (default).
 */
function compareDefault($a, $b) {
  const af = $a.hasClass('featured');
  const bf = $b.hasClass('featured');
  if (af !== bf) {
    return af ? -1 : 1;
  }

  const ai = parseFloat($a.attr('data-index'));
  const bi = parseFloat($b.attr('data-index'));
  return ai - bi;
}

/**
 * Sort compare function that compares deals' discounts (higher first).
 */
function compareDiscounts($a, $b) {
  const a = parseFloat($a.attr('data-discount'));
  const b = parseFloat($b.attr('data-discount'));
  return b - a;
}

/**
 * Sort compare function that compares deals' titles alphabetically.
 */
function compareTitles($a, $b) {
  const a = $a.attr('data-title') || '';
  const b = $b.attr('data-title') || '';
  return a.localeCompare(b);
}

/**
 * Setup click handler for nav and sidebar sort buttons.
 */
function setupSorting() {
  // Finds all 'sort' items everywhere in page (both sidebar and nav).
  const $sorters = $('[data-role="sort"]');

  $sorters.click((event) => {
    const $target = $(event.currentTarget);

    // Make this sort the only active sort.
    const wasActive = $target.hasClass('active');
    $sorters.removeClass('active');
    $target.toggleClass('active', !wasActive);

    // Choose the comparison function
    const compareFn = wasActive ? compareDefault :
      $target.attr('data-sort') === 'discount' ? compareDiscounts :
      compareTitles;

    // Remove all deals, sort, then reattach in order.
    const $deals = $('[data-role="deal"]')
      .remove()
      .toArray()
      .map((elem) => $(elem));

    $deals.sort(($a, $b) => {
      return compareFn($a, $b);
    });
    $('[data-role="deals"]').append(...$deals);
  });
}

function setupSidebarToggle() {
  const $sidebar = $('[data-role="sidebar"]');
  const $toggleButton = $('[data-role="sidebar-toggle"]');
  $toggleButton.click(() => $sidebar.sidebar('toggle'));
}

/**
 * Read location.hash and determine the id of the matching page.
 */
function getHashPageId() {
  const hash = decodeURIComponent(location.hash.substring(1));
  return `${hash.replace(/\s+/g, '') || 'main-page'}`;
}

/**
 * Get the page associated with the current hash if it exists. Otherwise
 * default to the main page.
 */
function getHashPage() {
  const id = getHashPageId();
  const $page = $(`#${id}`);

  if ($page.length) {
    return $page.first();
  }

  console.warn(`Missing page to match hash id: ${id}`);
  return $('main > article').first();
}

/**
 * When the page is loaded, or the URL hash changes, navigaite if it's a page
 * we know about.
 */
function handleHashNavigation() {
  const $page = getHashPage();
  $('main > article').not($page).hide();
  $page.show();
}

async function main() {
  window.addEventListener('DOMContentLoaded', handleHashNavigation);
  window.addEventListener('hashchange', handleHashNavigation);

  const deals = await loadDeals();
  setupDeals(deals);
  setupCategories(deals);
  setupFilters();
  setupSorting();
  setupSidebarToggle();
}

main();
