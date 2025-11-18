/**
 * Test Data Factories
 * Generate realistic test data for tests
 */

import { faker } from '@faker-js/faker';

// Install: npm install -D @faker-js/faker

/**
 * Creates a mock reservation
 */
export function createMockReservation(overrides = {}) {
  return {
    id: faker.string.uuid(),
    confirmation_number: `RES-${faker.string.alphanumeric(8).toUpperCase()}`,
    hotel_id: faker.string.uuid(),
    guest_id: faker.string.uuid(),
    room_id: faker.string.uuid(),
    check_in_date: faker.date.future().toISOString().split('T')[0],
    check_out_date: faker.date.future().toISOString().split('T')[0],
    adults: faker.number.int({ min: 1, max: 4 }),
    children: faker.number.int({ min: 0, max: 2 }),
    infants: faker.number.int({ min: 0, max: 1 }),
    reservation_status: 'tentative',
    base_rate: faker.number.float({ min: 100, max: 500, multipleOf: 0.01 }),
    taxes: faker.number.float({ min: 10, max: 50, multipleOf: 0.01 }),
    fees: faker.number.float({ min: 0, max: 20, multipleOf: 0.01 }),
    currency: 'RON',
    confirmation_sent: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates a mock guest profile
 */
export function createMockGuest(overrides = {}) {
  return {
    id: faker.string.uuid(),
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    email: faker.internet.email(),
    phone: faker.phone.number(),
    nationality: faker.location.countryCode(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates a mock room
 */
export function createMockRoom(overrides = {}) {
  return {
    id: faker.string.uuid(),
    name: faker.helpers.arrayElement(['Double Room', 'Single Room', 'Suite']),
    room_type: faker.helpers.arrayElement(['double', 'single', 'suite']),
    base_price: faker.number.float({ min: 50, max: 300, multipleOf: 0.01 }),
    quantity: faker.number.int({ min: 1, max: 10 }),
    hotel_id: faker.string.uuid(),
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates a mock hotel
 */
export function createMockHotel(overrides = {}) {
  return {
    id: faker.string.uuid(),
    business_id: faker.string.uuid(),
    property_subtype: faker.helpers.arrayElement(['hotel', 'apartment', 'villa']),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates a mock business
 */
export function createMockBusiness(overrides = {}) {
  return {
    id: faker.string.uuid(),
    omd_id: faker.string.uuid(),
    type: 'hotel',
    name: faker.company.name(),
    slug: faker.helpers.slugify(faker.company.name()),
    description: faker.lorem.paragraph(),
    owner_id: faker.string.uuid(),
    status: 'active',
    contact: {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates a mock OMD
 */
export function createMockOMD(overrides = {}) {
  return {
    id: faker.string.uuid(),
    name: faker.location.city(),
    slug: faker.helpers.slugify(faker.location.city()),
    status: 'active',
    settings: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

