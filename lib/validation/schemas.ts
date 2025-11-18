/**
 * Zod Validation Schemas for API Routes
 * 
 * Centralized validation schemas for all API endpoints
 */

import { z } from 'zod';

/**
 * Contact Form Schema
 */
export const contactFormSchema = z.object({
  nume: z.string().min(1, 'Numele este obligatoriu').max(100, 'Numele este prea lung'),
  email: z.string().email('Email invalid').max(255, 'Email prea lung'),
  mesaj: z.string().min(1, 'Mesajul este obligatoriu').max(5000, 'Mesajul este prea lung'),
  omdSlug: z.string().optional(),
});

/**
 * Booking Confirmation Email Schema
 */
export const bookingConfirmationSchema = z.object({
  reservationId: z.string().uuid('reservationId must be a valid UUID'),
});

/**
 * Business Approval Email Schema
 */
export const businessApprovalSchema = z.object({
  recipientName: z.string().min(1).max(100),
  businessName: z.string().min(1).max(200),
  businessType: z.enum(['hotel', 'restaurant', 'experience']),
  recipientEmail: z.string().email(),
});

/**
 * OMD Approval Email Schema
 */
export const omdApprovalSchema = z.object({
  omdId: z.string().uuid('omdId must be a valid UUID'),
});

/**
 * Admin Active OMD Schema
 */
export const adminActiveOmdSchema = z.object({
  omdId: z.string().uuid('omdId must be a valid UUID'),
});

/**
 * Feedback - Reservation Staff Rating Schema
 */
export const reservationStaffRatingSchema = z.object({
  reservationId: z.string().uuid('reservationId must be a valid UUID'),
  token: z.string().min(1, 'Token is required'),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

/**
 * Feedback - Booking Issue Schema
 */
export const bookingIssueSchema = z.object({
  reservationId: z.string().uuid('reservationId must be a valid UUID'),
  token: z.string().min(1, 'Token is required'),
  issueType: z.enum(['booking_error', 'payment_issue', 'room_issue', 'service_issue', 'other']),
  description: z.string().min(1).max(2000),
  contactPreference: z.enum(['email', 'phone', 'none']).optional(),
});

/**
 * Feedback - Destination Rating Schema
 */
export const destinationRatingSchema = z.object({
  omdSlug: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
});

/**
 * Email Sequence Schedule Schema
 */
export const emailSequenceScheduleSchema = z.object({
  reservationId: z.string().uuid('reservationId must be a valid UUID'),
});

/**
 * Channel Manager Push Schema
 */
export const channelManagerPushSchema = z.object({
  reservationId: z.string().uuid('reservationId must be a valid UUID'),
});

/**
 * Octorate Booking Push Schema
 */
export const octorateBookingPushSchema = z.object({
  reservationId: z.string().uuid('reservationId must be a valid UUID'),
});

/**
 * Verify Token Query Schema (for GET requests)
 */
export const verifyTokenQuerySchema = z.object({
  reservationId: z.string().uuid('reservationId must be a valid UUID'),
  token: z.string().min(1, 'Token is required'),
});

