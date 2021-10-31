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
 * For each deal, clone the template, fill in values and append to <main>.
 */
function setupDeals(deals) {
  const $main = $('main');
  const template = $main.find('template').remove().get(0);

  const $deals = [];
  for (const deal of deals) {
    const $deal = $(template.content.cloneNode(true))
      .find('[data-role="deal"]');

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

    const $categories = $deal.find('.categories').empty();
    for (const category of deal.categories || []) {
      const $li = $('<li></li>')
        .attr('data-category', category)
        .text(category);
      $categories.append($li);
    }

    $deals.push($deal);
  }

  $deals.sort(compareDefault);
  $main.append(...$deals);
}

/**
 * Get the unique list of categories (lowercase).
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
}

/**
 * Setup click handler for nav filters.
 */
function setupFilters() {
  const $filters = $('[data-role="nav-menu"] [data-role="filter"]');
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
    $('main [data-role="deal"]')
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
 * Setup click handler for nav sort buttons.
 */
function setupSorting() {
  const $sorters = $('[data-role="nav-menu"] [data-role="sort"]');

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
    const $main = $('main');
    const $deals = $main.find('[data-role="deal"]')
      .remove()
      .toArray()
      .map((elem) => $(elem));

    $deals.sort(($a, $b) => {
      return compareFn($a, $b);
    });
    $main.append(...$deals);
  });
}

async function main() {
  const deals = await loadDeals();
  setupDeals(deals);
  setupCategories(deals);
  setupFilters();
  setupSorting();
}

main();
