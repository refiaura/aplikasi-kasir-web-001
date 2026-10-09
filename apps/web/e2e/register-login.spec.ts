import { expect, test } from '@playwright/test';

/** Alur Fase 1: pemilik daftar → dashboard kosong → perangkat → kasir → login PIN. */
test('pemilik daftar, lalu kasir bisa masuk dengan PIN', async ({ page }) => {
  const email = `e2e-${Date.now()}@toko.id`;
  const deviceCode = `KASIR-E2E-${Date.now()}`;

  // 1. Daftar sebagai pemilik.
  await page.goto('/daftar');
  await page.getByLabel('Nama kamu').fill('Pemilik E2E');
  await page.getByLabel('Nama toko').fill('Toko E2E');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Kata sandi', { exact: true }).fill('rahasia123');
  await page.getByRole('button', { name: 'Daftar' }).click();
  await expect(page).toHaveURL('/');

  // 2. Dashboard kosong tampil.
  await expect(page.getByText('Toko E2E')).toBeVisible();
  await expect(page.getByText('Omzet hari ini')).toBeVisible();
  await expect(page.getByText('Omzet 7 hari terakhir')).toBeVisible();

  // 3. Daftarkan perangkat + buat akun kasir.
  await page.getByRole('link', { name: 'Perangkat' }).click();
  await page.getByLabel('Kode perangkat').fill(deviceCode);
  await page.getByLabel('Nama perangkat').fill('Tablet E2E');
  await page.getByRole('button', { name: 'Daftarkan' }).click();
  await expect(page.getByText(deviceCode)).toBeVisible();

  await page.getByLabel('Nama kasir').fill('Kasir E2E');
  await page.getByLabel('PIN (6 digit)').fill('123456');
  await page.getByRole('button', { name: 'Buat akun' }).click();
  await expect(page.getByText('Kasir E2E')).toBeVisible();

  // 4. Keluar, lalu masuk sebagai kasir via PIN.
  await page.getByRole('button', { name: 'Keluar' }).click();
  await expect(page).toHaveURL('/login');
  // Pastikan tidak ada sisa cookie sesi sebelum ke halaman PIN.
  await page.context().clearCookies();
  await page.goto('/pin');
  await expect(page).toHaveURL('/pin', { timeout: 10000 });
  await page.getByLabel('Kode perangkat').fill(deviceCode);
  for (const d of '123456') {
    await page.getByRole('button', { name: d, exact: true }).click();
  }
  await page.getByRole('button', { name: 'Masuk' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByText('Kasir E2E')).toBeVisible();
});
