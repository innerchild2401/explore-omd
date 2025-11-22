# SmartBill Cloud API Integration Plan

## Executive Summary

**Integration Complexity: MODERATE** (6-8 weeks for full implementation)

Integrating SmartBill Cloud API with the OMD booking system is **feasible and well-documented**. The API provides all necessary features for generating proforma invoices and payment links upon booking confirmation. The main challenges are rate limiting (3 calls/second) and proper error handling, but these are manageable with proper architecture.

---

## 1. API Capabilities Assessment

### ✅ Available Features (Perfect Match for Requirements)

Based on [SmartBill API documentation](https://ajutor.smartbill.ro/article/196-integrare-api):

1. **Proforma Invoice Management**
   - Create proforma invoices
   - Convert proforma to invoice upon payment
   - Retrieve proforma invoices in PDF format
   - Send proforma invoices via email

2. **Invoice Management**
   - Create, delete, cancel, and restore invoices
   - Access invoices in PDF format
   - Send invoices via email to clients

3. **Client Management**
   - Add new clients automatically
   - Update existing client information
   - Client data can be created when inserting invoice/proforma

4. **Product Management**
   - Add products to database
   - Products can be created on-the-fly with invoices

5. **Payment Handling**
   - Record payments for invoices
   - Issue receipts for invoices
   - Payment links (needs verification in API docs)

6. **Document Delivery**
   - Send documents directly to clients via email
   - PDF generation and retrieval

### ⚠️ Limitations & Considerations

1. **Rate Limiting**: 3 API calls per second
   - **Impact**: High-volume booking periods may require queuing
   - **Solution**: Implement request queue with rate limiting

2. **Subscription Requirement**: API access requires "Facturare Platinum" subscription
   - **Impact**: Clients must have appropriate SmartBill subscription
   - **Solution**: Add subscription check in onboarding flow

3. **Payment Links**: Need to verify if SmartBill provides payment link URLs
   - **Action Required**: Review API documentation for payment link endpoints
   - **Alternative**: Use SmartBill's payment gateway integration or generate custom payment links

---

## 2. Technical Architecture

### 2.1 Authentication

**Method**: Basic Authentication (Username + Password)
- Username: From SmartBill account
- Password: API token from SmartBill
- Company VAT Code: Required for all requests
- **Security**: All communications via HTTPS/SSL

**Storage**: Store credentials securely in database
```sql
-- New table needed
CREATE TABLE smartbill_integrations (
  id UUID PRIMARY KEY,
  business_id UUID REFERENCES businesses(id),
  username TEXT NOT NULL,
  api_token TEXT NOT NULL, -- Encrypted
  company_vat_code TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 Integration Flow

```
Booking Confirmation
    ↓
Check if business has SmartBill integration
    ↓
Create/Update Client in SmartBill
    ↓
Create Proforma Invoice
    ↓
Get Payment Link (if available)
    ↓
Send Email with Proforma + Payment Link
    ↓
Store Invoice Reference in Reservation
```

### 2.3 Data Mapping

**Reservation → SmartBill Invoice Mapping:**

| OMD System | SmartBill API Field | Notes |
|------------|---------------------|-------|
| `guest_profiles.first_name` + `last_name` | `client.name` | Client name |
| `guest_profiles.email` | `client.email` | Client email |
| `guest_profiles.phone` | `client.phone` | Client phone |
| `reservations.confirmation_number` | `invoice.number` or `invoice.observations` | Reference number |
| `reservations.check_in_date` | `invoice.date` | Invoice date |
| `reservations.total_amount` | `invoice.total` | Total amount |
| `reservations.currency` | `invoice.currency` | Currency (RON) |
| `rooms.name` | `product.name` | Product/service name |
| `reservations.check_in_date` - `check_out_date` | `product.description` | Stay duration |

---

## 3. Implementation Plan

### Phase 1: Foundation (Week 1-2)

**Tasks:**
1. Create database schema for SmartBill integrations
2. Build SmartBill API client library
3. Implement authentication and basic connection testing
4. Create admin UI for SmartBill connection setup

**Deliverables:**
- `lib/services/smartbill/client.ts` - API client
- `app/api/smartbill/test-connection/route.ts` - Connection test endpoint
- Database migration for `smartbill_integrations` table
- Admin UI component for SmartBill setup

### Phase 2: Client & Product Management (Week 2-3)

**Tasks:**
1. Implement client creation/update in SmartBill
2. Implement product/service creation
3. Handle client/product deduplication
4. Add error handling and retry logic

**Deliverables:**
- `lib/services/smartbill/clients.ts` - Client management
- `lib/services/smartbill/products.ts` - Product management
- Rate limiting queue implementation

### Phase 3: Invoice Generation (Week 3-5)

**Tasks:**
1. Implement proforma invoice creation
2. Map reservation data to SmartBill invoice format
3. Handle invoice line items (room, taxes, fees)
4. Store invoice references in reservations table

**Deliverables:**
- `lib/services/smartbill/invoices.ts` - Invoice management
- Database migration to add `smartbill_invoice_id` to reservations
- Invoice creation service integrated with booking flow

### Phase 4: Payment Links & Email Integration (Week 5-6)

**Tasks:**
1. Research and implement payment link generation
2. Integrate with booking confirmation email
3. Add proforma invoice PDF attachment
4. Handle payment status updates

**Deliverables:**
- Payment link generation (if available in API)
- Updated email templates with invoice links
- Webhook handler for payment status updates

### Phase 5: Testing & Error Handling (Week 6-7)

**Tasks:**
1. Comprehensive error handling
2. Retry logic for failed API calls
3. Logging and monitoring
4. User-facing error messages

**Deliverables:**
- Error handling middleware
- Retry queue for failed requests
- Admin dashboard for monitoring SmartBill sync status

### Phase 6: Documentation & Deployment (Week 7-8)

**Tasks:**
1. User documentation
2. Admin guide for setting up SmartBill
3. API integration testing
4. Production deployment

**Deliverables:**
- User documentation
- Admin setup guide
- Production-ready integration

---

## 4. Code Structure

### 4.1 SmartBill API Client

```typescript
// lib/services/smartbill/client.ts
export class SmartBillClient {
  private baseUrl = 'https://ws.smartbill.ro/SBORO/api';
  private username: string;
  private token: string;
  private companyVatCode: string;

  async createProformaInvoice(data: ProformaInvoiceData): Promise<InvoiceResponse>
  async getInvoicePdf(invoiceId: string): Promise<Buffer>
  async sendInvoiceEmail(invoiceId: string, email: string): Promise<void>
  async createClient(clientData: ClientData): Promise<ClientResponse>
  async createProduct(productData: ProductData): Promise<ProductResponse>
}
```

### 4.2 Integration Service

```typescript
// lib/services/smartbill/integration.ts
export class SmartBillIntegration {
  async processBookingConfirmation(reservationId: string): Promise<void> {
    // 1. Get reservation data
    // 2. Check SmartBill integration
    // 3. Create/update client
    // 4. Create proforma invoice
    // 5. Get payment link
    // 6. Update reservation with invoice ID
    // 7. Send email with invoice
  }
}
```

### 4.3 Database Schema

```sql
-- SmartBill integrations per business
CREATE TABLE smartbill_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  api_token TEXT NOT NULL, -- Should be encrypted
  company_vat_code TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'active', -- 'active', 'error', 'disabled'
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id)
);

-- Link reservations to SmartBill invoices
ALTER TABLE reservations 
ADD COLUMN smartbill_invoice_id TEXT,
ADD COLUMN smartbill_proforma_id TEXT,
ADD COLUMN smartbill_payment_link TEXT;

-- Sync logs for debugging
CREATE TABLE smartbill_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id),
  reservation_id UUID REFERENCES reservations(id),
  action TEXT NOT NULL, -- 'create_client', 'create_invoice', 'send_email'
  status TEXT NOT NULL, -- 'success', 'error', 'pending'
  request_data JSONB,
  response_data JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. Challenges & Solutions

### Challenge 1: Rate Limiting (3 calls/second)

**Solution:**
- Implement a request queue with rate limiting
- Use BullMQ or similar queue system
- Batch operations where possible
- Cache client/product lookups

```typescript
// lib/services/smartbill/queue.ts
import Queue from 'bull';

const smartbillQueue = new Queue('smartbill', {
  limiter: {
    max: 3,
    duration: 1000, // 3 calls per second
  },
});
```

### Challenge 2: Payment Links

**Unknown**: Need to verify if SmartBill API provides payment link URLs

**Solutions:**
1. **If SmartBill provides payment links**: Use their API endpoint
2. **If not**: Generate custom payment links that redirect to SmartBill payment page
3. **Alternative**: Use SmartBill's payment gateway integration

**Action Required**: Review SmartBill API documentation for payment link endpoints

### Challenge 3: Error Handling

**Solution:**
- Comprehensive try-catch blocks
- Retry logic with exponential backoff
- Detailed logging
- User-friendly error messages
- Fallback: Manual invoice creation option

### Challenge 4: Client/Product Deduplication

**Solution:**
- Check if client exists before creating
- Use email as unique identifier
- Cache client/product IDs
- Handle duplicate errors gracefully

---

## 6. API Endpoints Needed

Based on typical REST API patterns, we'll need:

1. **POST** `/api/smartbill/connect` - Connect business to SmartBill
2. **POST** `/api/smartbill/test-connection` - Test SmartBill credentials
3. **POST** `/api/smartbill/disconnect` - Disconnect SmartBill integration
4. **GET** `/api/smartbill/status` - Get integration status
5. **POST** `/api/smartbill/create-invoice/:reservationId` - Manually create invoice
6. **GET** `/api/smartbill/invoice/:invoiceId/pdf` - Get invoice PDF
7. **POST** `/api/smartbill/webhook` - Handle SmartBill webhooks (if available)

---

## 7. User Experience Flow

### 7.1 Business Setup

1. Business admin goes to Settings → Integrations
2. Clicks "Connect SmartBill"
3. Enters:
   - SmartBill username
   - API token
   - Company VAT code
4. System tests connection
5. If successful, integration is activated

### 7.2 Booking Flow

1. Guest makes booking
2. Booking is confirmed
3. System automatically:
   - Creates/updates client in SmartBill
   - Creates proforma invoice
   - Generates payment link
   - Sends email with invoice PDF and payment link
4. Guest receives email with:
   - Booking confirmation
   - Proforma invoice (PDF attachment)
   - Payment link button

### 7.3 Payment Flow

1. Guest clicks payment link
2. Redirected to payment page (SmartBill or custom)
3. Payment is processed
4. Webhook updates reservation payment status
5. Proforma is converted to invoice (if applicable)

---

## 8. Testing Strategy

### 8.1 Unit Tests
- SmartBill API client methods
- Data mapping functions
- Error handling

### 8.2 Integration Tests
- End-to-end booking → invoice flow
- Rate limiting behavior
- Error scenarios

### 8.3 Manual Testing
- Connect/disconnect SmartBill
- Create test bookings
- Verify invoice generation
- Test email delivery

---

## 9. Security Considerations

1. **API Token Storage**: Encrypt API tokens in database
2. **HTTPS Only**: All API calls must use HTTPS
3. **Rate Limiting**: Respect SmartBill's rate limits
4. **Error Messages**: Don't expose sensitive data in errors
5. **Access Control**: Only business admins can manage SmartBill integration

---

## 10. Estimated Timeline

| Phase | Duration | Complexity |
|-------|----------|------------|
| Foundation | 1-2 weeks | Medium |
| Client/Product Management | 1 week | Medium |
| Invoice Generation | 2 weeks | High |
| Payment Links & Email | 1 week | Medium |
| Testing & Error Handling | 1 week | Medium |
| Documentation & Deployment | 1 week | Low |
| **Total** | **7-8 weeks** | **Moderate** |

---

## 11. Resources Needed

1. **SmartBill API Documentation**: [https://api.smartbill.ro](https://api.smartbill.ro)
2. **SmartBill Support**: vreauapi@smartbill.ro
3. **Development**: 1-2 developers
4. **Testing**: SmartBill test account
5. **Infrastructure**: Queue system (BullMQ/Redis)

---

## 12. Next Steps

1. **Immediate Actions**:
   - [ ] Review SmartBill API documentation in detail
   - [ ] Verify payment link API availability
   - [ ] Get SmartBill test account credentials
   - [ ] Set up development environment

2. **Before Development**:
   - [ ] Confirm SmartBill subscription requirements with clients
   - [ ] Design database schema
   - [ ] Create API client skeleton
   - [ ] Set up queue infrastructure

3. **Development**:
   - [ ] Follow implementation plan phases
   - [ ] Regular testing with SmartBill sandbox
   - [ ] Code reviews and documentation

---

## 13. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| API changes | Low | High | Version API calls, monitor changes |
| Rate limiting issues | Medium | Medium | Implement proper queuing |
| Payment links not available | Medium | High | Alternative payment flow |
| Client subscription issues | Low | Medium | Clear onboarding requirements |
| Integration complexity | Medium | Medium | Phased approach, thorough testing |

---

## Conclusion

**Integration Feasibility: HIGH** ✅

The SmartBill Cloud API integration is **definitely feasible** and aligns well with the OMD booking system requirements. The API provides all necessary features for proforma invoices and payment processing. The main considerations are:

1. **Rate limiting** - Manageable with proper queuing
2. **Payment links** - Need to verify API availability
3. **Error handling** - Requires careful implementation
4. **Timeline** - 7-8 weeks for complete implementation

**Recommendation**: Proceed with integration, starting with Phase 1 (Foundation) to validate the approach before full implementation.

---

## References

- [SmartBill API Documentation](https://api.smartbill.ro/#!/prezentare_generala)
- [SmartBill API Help Article](https://ajutor.smartbill.ro/article/196-integrare-api)
- [SmartBill Support Email](mailto:vreauapi@smartbill.ro)









