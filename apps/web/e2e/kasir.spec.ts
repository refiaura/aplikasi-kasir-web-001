import { expect, request, test } from '@playwright/test';

/**
 * Alur Fase 3: login PIN → buka shift → jual tunai → struk → tutup shift.
 * Setup (perangkat, kasir, produk) lewat API; alur kasir lewat UI.
 */
test('kasir berjualan tunai dalam satu shift', async ({ page }) => {
  const api = await request.newContext({ baseURL: 'http://localhost:8080' });
  const email = `kasir-e2e-${Date.now()}@toko.id`;
  const deviceCode = `KASIR-E2E-${Date.now()}`;

  // 1. Daftar pemilik + buat perangkat, kasir, dan produk contoh.
  const reg = await api.post('/api/v1/auth/register', {
    data: { name: 'Pemilik E2E', storeName: 'Toko E2E', email, password: 'rahasia123' },
  });
  expect(reg.ok()).toBe(true);
  const ownerCookie = reg.headers()['set-cookie']!.split(';')[0]!;

  await api.post('/api/v1/devices', {
    headers: { cookie: ownerCookie },
    data: { code: deviceCode, name: 'Tablet E2E' },
  });
  await api.post('/api/v1/users', {
    headers: { cookie: ownerCookie },
    data: { name: 'Kasir E2E', pin: '123456' },
  });
  const seed = await api.post('/api/v1/products/seed', {
    headers: { cookie: ownerCookie },
    data: { businessType: 'kelontong' },
  });
  expect(seed.ok()).toBe(true);
  await api.dispose();

  // 2. Masuk sebagai kasir via PIN.
  await page.goto('/pin');
  await page.getByLabel('Kode perangkat').fill(deviceCode);
  for (const d of '123456') {
    await page.getByRole('button', { name: d, exact: true }).click();
  }
  await page.getByRole('button', { name: 'Masuk' }).click();
  await expect(page).toHaveURL('/');

  // 3. Buka halaman kasir dan buka shift.
  await page.getByRole('link', { name: 'Kasir' }).click();
  await expect(page).toHaveURL('/kasir');
  await page.getByRole('button', { name: 'Buka shift' }).click();
  await page.getByLabel('Kas awal di laci (Rp)').fill('100000');
  await page.getByRole('button', { name: 'Buka shift', exact: true }).last().click();
  await expect(page.getByText('Shift dibuka', { exact: true })).toBeVisible();

  // 4. Tambah produk ke keranjang lalu bayar tunai uang pas.
  await page.getByRole('button', { name: /Indomie Goreng/ }).click();
  await expect(page.getByRole('button', { name: 'Bayar', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Bayar', exact: true }).click();
  await page.getByRole('button', { name: 'Uang pas' }).click();
  await page.getByRole('button', { name: /Bayar Rp/ }).click();

  // 5. Struk tampil → selesai.
  await expect(page.getByText('Transaksi berhasil')).toBeVisible();
  await expect(page.getByText(/INV-/)).toBeVisible();
  await page.getByRole('button', { name: 'Selesai' }).click();

  // 6. Tutup shift: 100000 + 3500 (tunai) = 103500.
  await page.getByRole('button', { name: 'Tutup shift' }).click();
  await page.getByLabel('Jumlah pecahan Rp100.000').fill('1');
  await page.getByLabel('Jumlah pecahan Rp2.000').fill('1');
  await page.getByLabel('Jumlah pecahan Rp1.000').fill('1');
  await page.getByLabel('Jumlah pecahan Rp500').fill('1');
  await page.getByRole('button', { name: 'Tutup shift', exact: true }).last().click();
  await expect(page.getByText('Shift ditutup')).toBeVisible();
  await expect(page.getByText('Shift belum dibuka.')).toBeVisible();
});
