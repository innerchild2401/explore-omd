# Booking Email Sequence - Forms & Paths to Implement

This file tracks all forms and paths that need to be implemented for the booking email sequence feature.

## Email Sequence Overview

### Email 1: Post-Booking Follow-up (3 days after booking)
- **Trigger**: 3 days after booking creation
- **Condition**: Only if check-in date is more than 3 days away from booking date
- **Purpose**: Check if reservation process went smoothly and collect feedback

## Forms & Pages to Implement

### 1. Hotel Reservation Staff Rating Form
- **Path**: `/feedback/reservation-staff-rating`
- **Purpose**: Allow guests to rate the hotel's reservation staff/service
- **Parameters**: 
  - `reservationId` (query param)
  - `token` (for security/verification)
- **Fields**:
  - Rating (1-5 stars)
  - Comment/feedback (optional)
  - Reservation ID (hidden, from URL)
- **Actions**:
  - Save rating to database
  - Show thank you message
  - Optional: Send notification to hotel admin

### 2. Booking Issue Report Form
- **Path**: `/feedback/booking-issue`
- **Purpose**: Allow guests to report issues with their booking/reservation process
- **Parameters**:
  - `reservationId` (query param)
  - `token` (for security/verification)
- **Fields**:
  - Issue type (dropdown: payment, confirmation, communication, other)
  - Description (textarea)
  - Reservation ID (hidden, from URL)
  - Contact preference (email, phone)
- **Actions**:
  - Save issue report to database
  - Send notification to support/admin
  - Show confirmation message
  - Optional: Auto-assign to support ticket system

## Database Tables Needed

### 1. reservation_staff_ratings
- `id` (UUID, primary key)
- `reservation_id` (UUID, foreign key to reservations)
- `hotel_id` (UUID, foreign key to hotels)
- `rating` (integer, 1-5)
- `comment` (text, optional)
- `guest_email` (text)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### 2. booking_issue_reports
- `id` (UUID, primary key)
- `reservation_id` (UUID, foreign key to reservations)
- `hotel_id` (UUID, foreign key to hotels)
- `issue_type` (text: payment, confirmation, communication, other)
- `description` (text)
- `status` (text: open, in_progress, resolved, closed)
- `guest_email` (text)
- `contact_preference` (text: email, phone)
- `admin_notes` (text, optional)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- `resolved_at` (timestamptz, optional)

### 3. email_sequence_logs
- `id` (UUID, primary key)
- `reservation_id` (UUID, foreign key to reservations)
- `email_type` (text: post_booking_followup, pre_checkin, post_checkout, etc.)
- `scheduled_at` (timestamptz)
- `sent_at` (timestamptz, optional)
- `status` (text: scheduled, sent, failed, skipped)
- `error_message` (text, optional)
- `created_at` (timestamptz)

## API Routes Needed

### 1. Email Scheduling API
- **Path**: `/api/email/sequence/schedule`
- **Method**: POST
- **Purpose**: Schedule email sequence when booking is created
- **Body**: `{ reservationId: string }`

### 2. Email Sequence Trigger (Background Job)
- **Path**: `/api/email/sequence/trigger` (or use cron job)
- **Method**: POST (or scheduled)
- **Purpose**: Process scheduled emails and send them

### 3. Submit Rating API
- **Path**: `/api/feedback/reservation-staff-rating`
- **Method**: POST
- **Purpose**: Save reservation staff rating
- **Body**: `{ reservationId: string, rating: number, comment?: string, token?: string }`

### 4. Submit Issue Report API
- **Path**: `/api/feedback/booking-issue`
- **Method**: POST
- **Purpose**: Save booking issue report
- **Body**: `{ reservationId: string, issueType: string, description: string, contactPreference: string, token?: string }`

## Email Templates

### 1. Post-Booking Follow-up Email (3 days after booking)
- **Template**: `post_booking_followup_3days`
- **Language**: Romanian
- **Links**:
  - Rating form: `/feedback/reservation-staff-rating?reservationId={id}&token={token}`
  - Issue report form: `/feedback/booking-issue?reservationId={id}&token={token}`

#### Email Text (Romanian):

**Subject:** Cum a fost experiența ta de rezervare?

---

**Salut [Nume Client]!**

Au trecut 3 zile de la rezervarea ta la **[Nume Hotel]**. Ne-am gândit să verificăm dacă totul a mers conform așteptărilor în procesul de rezervare.

**Experiența ta este importantă pentru noi!**

Dacă totul a fost în regulă, ne-ar ajuta mult să știm și să poți evalua serviciul de rezervări al hotelului. Feedback-ul tău ne ajută să îmbunătățim continuu serviciile oferite.

**Ai întâmpinat probleme?**

Dacă ai întâmpinat probleme sau dacă ceva nu a funcționat conform așteptărilor, te rugăm să ne anunți. Suntem aici pentru a te ajuta.

**Detalii rezervare:**
- **Număr confirmare:** [Număr Confirmare]
- **Hotel:** [Nume Hotel]
- **Check-in:** [Data Check-in]
- **Check-out:** [Data Check-out]

---

**Acțiuni rapide:**
1. [Evaluare serviciu de rezervări] — Evaluează experiența cu echipa de rezervări
2. [Raportează problemă] — Dacă ai întâmpinat probleme, te rugăm să ne anunți

Dacă ai întrebări sau ai nevoie de asistență, poți completa formularul nostru de contact.

Cu respect,
**Echipa [Platform Name]**

## Security Considerations

- Use secure tokens in URLs to prevent unauthorized access
- Validate tokens before allowing form submissions
- Rate limiting on form submissions
- Validate reservation ownership/email match

## Next Steps

1. ✅ Create tracking file (this file)
2. ✅ Get approval for email text
3. ✅ Create database migrations for new tables
4. ✅ Implement email scheduling system
5. ✅ Create email templates
6. ✅ Integrate email scheduling into booking creation flows
7. ⏳ Set up cron job/scheduled task for email trigger
8. ⏳ Build rating form page
9. ⏳ Build issue report form page
10. ⏳ Create feedback API routes
11. ⏳ Test email sequence

## Implementation Status

### Completed ✅
- Database schema (migration 54) - ✅ RUN
- Email scheduling service
- Post-booking follow-up email template (Romanian)
- Email sequence trigger API
- Integration into booking creation flows (BookingForm, BookingModal, NewReservationModal, PendingReservations)
- Token verification system
- Rating form page at `/feedback/reservation-staff-rating`
- Issue report form page at `/feedback/booking-issue`
- API routes for submitting ratings and issue reports
- Vercel cron job configuration (runs every hour)

### Ready for Testing ⏳
- Test the full email sequence
- Verify cron job triggers emails correctly
- Test rating form submission
- Test issue report form submission

## Cron Job Setup

### Vercel Cron Jobs (Recommended)

The cron job is already configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/email/sequence/trigger",
      "schedule": "0 * * * *"
    }
  ]
}
```

**Schedule:** `0 * * * *` = Every hour at minute 0

**After deployment:**
1. The cron job will automatically appear in your Vercel dashboard
2. Go to Settings → Cron Jobs to view and manage it
3. (Optional) Set `CRON_SECRET` environment variable for additional security

**Note:** On Vercel Hobby plan, cron jobs are limited. Consider upgrading if needed.

### Manual Testing

You can manually trigger the email sequence by calling:
```
GET /api/email/sequence/trigger
```
Or
```
POST /api/email/sequence/trigger
```

### Alternative Options (if not using Vercel):
- External cron service (e.g., cron-job.org) - call the endpoint
- GitHub Actions scheduled workflows
- Server cron job (if self-hosted)

