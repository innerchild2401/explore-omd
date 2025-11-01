# Testing Booking Confirmation Emails

## How to Test

### 1. Check Browser Console
After submitting a booking, check the browser console (F12 → Console tab) for:
- "Booking confirmation email sent successfully" message
- Any error messages

### 2. Check Server Logs
If running locally with `npm run dev`, check the terminal for:
- "Booking confirmation email request received"
- "Sending email via MailerSend"
- "MailerSend response status"
- Any error messages

### 3. Test the API Directly
You can test the API endpoint directly using curl or Postman:

```bash
curl -X POST http://localhost:3000/api/email/booking-confirmation \
  -H "Content-Type: application/json" \
  -d '{"reservationId": "YOUR_RESERVATION_ID_HERE"}'
```

### 4. Common Issues to Check

1. **Business Email Missing**: Make sure the business has an email in the `contact` JSONB field:
   ```sql
   SELECT id, name, contact 
   FROM businesses 
   WHERE id = 'YOUR_BUSINESS_ID';
   ```

2. **MailerSend API Key**: Verify `MAILER_SEND_API_KEY` is set in `.env.local`

3. **Template ID**: Verify template ID `pr9084zy03vgw63d` exists in your MailerSend account

4. **From Email**: Verify `no-reply@destexplore.eu` is verified in MailerSend

5. **Trial Mode**: If using MailerSend trial, emails may only go to verified recipients

### 5. Check Email Logs Table
Query the database to see if emails were logged:

```sql
SELECT * FROM email_logs 
ORDER BY created_at DESC 
LIMIT 10;
```

This will show:
- If the email was attempted
- Status (pending, sent, failed)
- Error messages if any

