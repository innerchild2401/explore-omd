# Booking Platform Implementation Plan

Transform the current Supabase/Next.js stack into a scalable, payment-free OTA + PMS hybrid while keeping manual reservation confirmation and omitting guest self-service portals.

---

## 1. Preparation & Discovery (Week 0)
- **Code freeze** on booking-critical paths; capture current schema (db dump) and environment configs.
- **Test harness**: expand E2E smoke tests covering booking creation, tentative → confirmed workflow, channel push, emails.
- **Data seeding**: snapshot representative hotels/rooms/reservations for staging load tests.
- **Design tokens**: define modal background + font color palette to eliminate browser auto-color issues.

Deliverables: verified staging snapshot, automated smoke suite, UI style guide excerpt for modals.

---

## 2. Core Service Layer (Weeks 1–2)
### 2.1 Booking API Gateway
- Build authenticated service (Next.js Route Handler or Edge Function) that:
  - validates inputs, enforces min-stay/availability rules,
  - creates/updates guest + channel records,
  - inserts reservations in transactions,
  - publishes events to queues (email, channel sync).
- Add idempotency keys to prevent duplicate bookings.
- Replace client-side Supabase writes with gateway calls behind a feature flag.

### 2.2 Availability Locking
- Add stored procedures using `SELECT … FOR UPDATE SKIP LOCKED` for inventory holds.
- Implement short-lived reservation holds (row in `room_availability_holds`) that expire automatically.
- Update conflict triggers to respect new holds.

### 2.3 Partitioning & Indexing
- Partition `reservations`, `booking_events`, `room_availability` by month + hotel.
- Add composite indexes (hotel_id, check_in_date) to speed searches.
- Create migration scripts with rollback instructions.

Deliverables: booking gateway service, new DB functions/migrations, feature flags, migration runbook.

---

## 3. Asynchronous Infrastructure (Weeks 3–4)
### 3.1 Queue & Worker Setup
- Choose queue (Supabase Queue, Redis Streams, or hosted service).
- Implement worker(s) for:
  - email sequences,
  - channel manager pushes/pulls,
  - analytics/triggered events,
  - housekeeping/maintenance notifications.
- Provide dead-letter handling + retries.

### 3.2 Observability
- Integrate structured logging (JSON), centralized log shipping (e.g., Logflare/Loki).
- Add metrics (Prometheus-compatible) for bookings/sec, latency, queue depth, failure counts.
- Configure alerting (PagerDuty/Slack) for SLA breaches and queue backlog.

Deliverables: queue infrastructure, worker deployment scripts, dashboards, alert rules.

---

## 4. Channel Manager Abstraction (Weeks 5–6)
- Refactor existing Octorate integration into adapter pattern (`ChannelManagerProvider` interface).
- Implement connectors roadmap: Booking.com/Expedia placeholder stubs + data contracts.
- Normalize webhook ingestion: verify signatures, enqueue processing jobs, update reservations/availability.
- Build parity monitor: compare OTA/allocation vs internal availability and alert on mismatch.
- Expand `channel_sync_logs` schema for per-connector telemetry.

Deliverables: adapter framework, enhanced logging, partner documentation templates.

---

## 5. OTA Guest Experience (Weeks 7–8)
- **Search & booking funnel**: streamline UX (no signup), add multi-room selection, promo code input, package bundles (room + experiences/restaurants).
- **Upsell modules**: cross-sell experiences/restaurant slots within confirmation flows.
- **Accessibility & responsive checks**: ensure smooth mobile experience.
- **Modal styling**: ensure all modals use explicit color tokens (background, primary text, secondary text).
- Update analytics tracking for funnel events.

Deliverables: redesigned booking funnel, upsell components, analytics instrumentation, QA checklist.

---

## 6. PMS-Lite Hotel Admin Tools (Weeks 9–10)
- **Unified dashboard**: calendar with drag-and-drop edits, list views per status.
- **Bulk inventory tools**: bulk rate updates, allotment adjustments, blackout dates.
- **Tasking & housekeeping**: simple task board linked to arrivals/departures.
- **Guest messaging hub**: centralized email/SMS (no guest portal) with templating.
- **Reporting**: new dashboards (occupancy, ADR/RevPAR, channel mix) with export support.

Deliverables: updated admin UI, new API endpoints for bulk operations, report generation scripts.

---

## 7. Manual Confirmation Workflow Enhancements (Week 11)
- Add alerts for aging tentative reservations (email + dashboard notifications).
- Provide checklist modal for staff when converting tentative → confirmed (notes, files).
- Log confirmation actions in `booking_events`.
- Offer optional automated email to guest upon confirmation (configurable per hotel).

Deliverables: enhanced workflow UI, notification rules, audit trail updates.

---

## 8. Security & Compliance Hardening (Week 12)
- Review RLS policies for new service endpoints; ensure least privilege.
- Implement rate limiting & WAF rules on booking gateway.
- Add GDPR tooling (data export/anonymize) for guest records.
- Pen-test and load-test booking flow (target 5M bookings/year with burst testing).

Deliverables: security audit report, load test results, updated policies.

---

## 9. Go-Live Readiness (Week 13)
- Run staging shadow traffic (new gateway + queues) while legacy path records results for comparison.
- Execute performance/load tests against production-like datasets.
- Finalize rollback/runbooks, on-call procedures, incident playbooks.
- Conduct training for hotel admins on new PMS tools and manual confirmation interface.

Deliverables: go-live checklist, training materials, deployment schedule.

---

## 10. Post-Launch Iterations (continuous)
- Monitor metrics, tune partition/queue settings.
- Prioritize additional channel connectors, promo engines, loyalty features.
- Gather feedback for next phase (e.g., optional payments, guest portal if strategy changes).

---

### Key Assumptions
- Payments remain out-of-scope.
- Guest self-service portal intentionally excluded; all interactions remain staff mediated except booking funnel.
- Manual confirmation remains mandatory, but UI/alerts make it efficient.
- Supabase/Postgres + Next.js/Vercel stay as core stack.

### References
- `components/hotels/BookingForm.tsx`, `app/api/email/*`, `app/api/channel-manager/push/route.ts`, migrations `16`, `33–54`.


