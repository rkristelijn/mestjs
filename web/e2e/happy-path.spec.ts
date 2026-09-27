import { expect, test } from '@playwright/test';

/**
 * HAPPY-PATH e2e — the /items page renders its core UI.
 *
 * This spec is written to pass WITHOUT the NestJS API running. It stubs
 * GET /api/items so the TanStack Query hook resolves deterministically, then
 * asserts the three building blocks of the page are present:
 *   - ItemForm  (Name + Price inputs, "Add item" button)
 *   - ItemsTable (the table with ID / Name / Price headers)
 *   - ItemBanner (renders the latest item's name — see security spec for the
 *                 dangerouslySetInnerHTML detail)
 *
 * To run against the REAL API instead of the stub, start it first:
 *     cd ~/git/hub/mestjs && npx nx serve api
 * and delete/skip the route stub below.
 */

const API_ITEMS = '**/api/items';

test.describe('happy path: /items renders', () => {
  test('ItemForm + ItemsTable render with stubbed API data', async ({ page }) => {
    // Stub the items list so the page has deterministic data even offline.
    await page.route(API_ITEMS, async (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, name: 'Coffee', price: 2.5 },
          { id: 2, name: 'Notebook', price: 7.99 },
        ]),
      });
    });

    await page.goto('/items');

    // ItemForm: the two labelled inputs and the submit button.
    await expect(page.getByLabel('Name')).toBeVisible();
    await expect(page.getByLabel('Price')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add item' })).toBeVisible();

    // ItemsTable: column headers and the stubbed rows.
    await expect(page.getByRole('columnheader', { name: 'ID' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Price' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Coffee' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Notebook' })).toBeVisible();

    // Price is formatted by the table cell renderer (€ x.xx).
    await expect(page.getByText('€ 7.99')).toBeVisible();
  });

  test('the app shell (Toolpad nav) renders the Items + Dashboard links', async ({
    page,
  }) => {
    await page.route(API_ITEMS, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    );

    await page.goto('/items');

    // Toolpad DashboardLayout navigation from layout.tsx.
    await expect(
      page.getByRole('link', { name: 'Items' }).first()
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Dashboard' }).first()
    ).toBeVisible();
  });
});
