/**
 * Test script for booking confirmation email API
 * Run with: node test-email-api.js
 * 
 * Set RESERVATION_ID environment variable or edit the script
 */

const RESERVATION_ID = process.env.RESERVATION_ID || ''; // Set your reservation ID here
const API_URL = process.env.API_URL || 'http://localhost:3000'; // Change to your Vercel URL if needed

async function testEmailAPI() {
  console.log('🧪 Testing Booking Confirmation Email API');
  console.log('API URL:', API_URL);
  console.log('Reservation ID:', RESERVATION_ID || 'Will use most recent');
  console.log('');

  try {
    // First, get recent reservations to find one to test with
    console.log('📋 Fetching recent reservations...');
    const listResponse = await fetch(`${API_URL}/api/email/test-booking-confirmation`);
    const listData = await listResponse.json();
    
    if (listData.reservations && listData.reservations.length > 0) {
      console.log(`✅ Found ${listData.reservations.length} recent reservations:`);
      listData.reservations.forEach((res, idx) => {
        console.log(`  ${idx + 1}. ${res.confirmation_number} (${res.id}) - ${res.guest_profiles?.email}`);
      });
      console.log('');
    }

    // Test the email sending
    const testReservationId = RESERVATION_ID || (listData.reservations?.[0]?.id);
    
    if (!testReservationId) {
      console.error('❌ No reservation ID available to test with');
      return;
    }

    console.log(`📧 Testing email sending for reservation: ${testReservationId}`);
    console.log('');

    const testResponse = await fetch(`${API_URL}/api/email/test-booking-confirmation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reservationId: testReservationId,
      }),
    });

    const testResult = await testResponse.json();

    console.log('📊 Response Status:', testResponse.status);
    console.log('📊 Response:', JSON.stringify(testResult, null, 2));

    if (testResponse.ok) {
      console.log('');
      console.log('✅ Test completed successfully!');
      if (testResult.emailApiResponse?.success) {
        console.log('✅ Email API returned success');
        console.log('📧 Sent to:', testResult.emailApiResponse.sentTo);
      } else {
        console.log('❌ Email API returned error:', testResult.emailApiResponse?.error);
      }
    } else {
      console.log('');
      console.log('❌ Test failed with status:', testResponse.status);
      console.log('Error:', testResult.error);
      console.log('Details:', testResult.details);
    }
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
    console.error(error);
  }
}

testEmailAPI();















