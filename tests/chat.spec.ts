import { test, expect, Page } from '@playwright/test';

// Unique suffix per test run to avoid Firebase user conflicts
const RUN_ID = Date.now();

const USER_A = {
  name: 'Alice Test',
  email: `alice.${RUN_ID}@test.example`,
  password: 'testpass123',
};
const USER_B = {
  name: 'Bob Test',
  email: `bob.${RUN_ID}@test.example`,
  password: 'testpass456',
};

async function signUp(page: Page, user: typeof USER_A) {
  await page.goto('/');
  await page.getByText("Don't have an account?").waitFor();
  await page.getByRole('button', { name: 'Sign Up' }).click();
  await page.getByPlaceholder('Display Name').fill(user.name);
  await page.getByPlaceholder('Email').fill(user.email);
  await page.getByPlaceholder('Password').fill(user.password);
  await page.getByRole('button', { name: 'Create Account' }).click();
}

async function signIn(page: Page, user: typeof USER_A) {
  await page.goto('/');
  await page.getByPlaceholder('Email').fill(user.email);
  await page.getByPlaceholder('Password').fill(user.password);
  await page.getByRole('button', { name: 'Sign In' }).click();
}

async function signOut(page: Page) {
  await page.getByRole('button', { name: 'Sign Out' }).click();
  await page.getByPlaceholder('Email').waitFor();
}

test.describe('Authentication', () => {
  test('shows sign in page on load', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('ChatDemo')).toBeVisible();
    await expect(page.getByPlaceholder('Email')).toBeVisible();
    await expect(page.getByPlaceholder('Password')).toBeVisible();
  });

  test('toggles between sign in and sign up', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    await page.getByRole('button', { name: 'Sign Up' }).click();
    await expect(page.getByPlaceholder('Display Name')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByPlaceholder('Display Name')).not.toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('Email').fill('wrong@example.com');
    await page.getByPlaceholder('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.locator('p').filter({ hasText: /invalid|wrong|credential/i })).toBeVisible({ timeout: 8000 });
  });

  test('sign up creates account and lands on room list', async ({ page }) => {
    await signUp(page, USER_A);
    await expect(page.getByText('Rooms')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(USER_A.name)).toBeVisible();
  });

  test('sign out returns to auth page', async ({ page }) => {
    await signUp(page, { ...USER_A, email: `alice2.${RUN_ID}@test.example` });
    await expect(page.getByText('Rooms')).toBeVisible({ timeout: 10000 });
    await signOut(page);
    await expect(page.getByPlaceholder('Email')).toBeVisible();
  });
});

test.describe('Room management', () => {
  test.beforeEach(async ({ page }) => {
    await signUp(page, { ...USER_A, email: `alice.rooms.${RUN_ID}@test.example` });
    await expect(page.getByText('Rooms')).toBeVisible({ timeout: 10000 });
  });

  test('can create a room and enter it', async ({ page }) => {
    await page.getByRole('button', { name: '+' }).click();
    await page.getByPlaceholder('Room name...').fill('Test Room Alpha');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText('# Test Room Alpha')).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: /Share Room/i })).toBeVisible();
  });

  test('room appears in sidebar after creation', async ({ page }) => {
    await page.getByRole('button', { name: '+' }).click();
    await page.getByPlaceholder('Room name...').fill('My Sidebar Room');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText('# My Sidebar Room')).toBeVisible({ timeout: 8000 });
    // Go back to list
    await page.getByRole('button', { name: '←' }).click();
    await expect(page.getByText('# My Sidebar Room')).toBeVisible();
  });
});

test.describe('Messaging', () => {
  test.beforeEach(async ({ page }) => {
    await signUp(page, { ...USER_A, email: `alice.msg.${RUN_ID}@test.example` });
    await expect(page.getByText('Rooms')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: '+' }).click();
    await page.getByPlaceholder('Room name...').fill('Chat Room');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText('# Chat Room')).toBeVisible({ timeout: 8000 });
  });

  test('can send a message', async ({ page }) => {
    await page.getByPlaceholder(/Message #/i).fill('Hello world!');
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.getByText('Hello world!')).toBeVisible({ timeout: 8000 });
  });

  test('send button is disabled when input is empty', async ({ page }) => {
    const sendBtn = page.getByRole('button', { name: 'Send' });
    await expect(sendBtn).toBeDisabled();
    await page.getByPlaceholder(/Message #/i).fill('hi');
    await expect(sendBtn).toBeEnabled();
  });
});

test.describe('Share link - join room', () => {
  test('visiting share link as logged-in user joins the room', async ({ browser }) => {
    // User A creates a room
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await signUp(pageA, USER_A);
    await expect(pageA.getByText('Rooms')).toBeVisible({ timeout: 10000 });

    await pageA.getByRole('button', { name: '+' }).click();
    await pageA.getByPlaceholder('Room name...').fill('Shared Room');
    await pageA.getByRole('button', { name: 'Create' }).click();
    await expect(pageA.getByText('# Shared Room')).toBeVisible({ timeout: 8000 });

    // Get the share link
    await pageA.getByRole('button', { name: /Share Room/i }).click();
    const roomUrl = pageA.url();

    // User B signs up and visits the share link
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await signUp(pageB, USER_B);
    await expect(pageB.getByText('Rooms')).toBeVisible({ timeout: 10000 });

    // Navigate to the shared room URL
    await pageB.goto(roomUrl);
    await expect(pageB.getByText('# Shared Room')).toBeVisible({ timeout: 12000 });

    // User B can send a message
    await pageB.getByPlaceholder(/Message #/i).fill('Hi from Bob!');
    await pageB.getByRole('button', { name: 'Send' }).click();
    await expect(pageB.getByText('Hi from Bob!')).toBeVisible({ timeout: 8000 });

    // User A can see Bob's message in real time
    await expect(pageA.getByText('Hi from Bob!')).toBeVisible({ timeout: 8000 });

    // Room shows 2 members
    await expect(pageA.getByText('2 members')).toBeVisible();

    await contextA.close();
    await contextB.close();
  });

  test('unauthenticated user visiting share link sees auth page then room after login', async ({ browser }) => {
    // User A creates a room
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await signUp(pageA, { ...USER_A, email: `alice.sharetest.${RUN_ID}@test.example` });
    await expect(pageA.getByText('Rooms')).toBeVisible({ timeout: 10000 });

    await pageA.getByRole('button', { name: '+' }).click();
    await pageA.getByPlaceholder('Room name...').fill('Link Room');
    await pageA.getByRole('button', { name: 'Create' }).click();
    await expect(pageA.getByText('# Link Room')).toBeVisible({ timeout: 8000 });

    const roomUrl = pageA.url();

    // Unauthenticated browser visits the room link
    const contextGuest = await browser.newContext();
    const pageGuest = await contextGuest.newPage();
    await pageGuest.goto(roomUrl);

    // Should show auth page (not logged in)
    await expect(pageGuest.getByPlaceholder('Email')).toBeVisible({ timeout: 8000 });

    // Sign up as new user
    const guestUser = { name: 'Guest', email: `guest.${RUN_ID}@test.example`, password: 'guestpass123' };
    await pageGuest.getByRole('button', { name: 'Sign Up' }).click();
    await pageGuest.getByPlaceholder('Display Name').fill(guestUser.name);
    await pageGuest.getByPlaceholder('Email').fill(guestUser.email);
    await pageGuest.getByPlaceholder('Password').fill(guestUser.password);
    await pageGuest.getByRole('button', { name: 'Create Account' }).click();

    // After login, should land in the room list (hash was / after redirect)
    // User needs to re-navigate to room url
    await pageGuest.goto(roomUrl);
    await expect(pageGuest.getByText('# Link Room')).toBeVisible({ timeout: 12000 });

    await contextA.close();
    await contextGuest.close();
  });
});
