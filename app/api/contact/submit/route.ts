import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    const body = await request.json();
    const { nume, email, mesaj } = body;

    // Validate required fields
    if (!nume || !email || !mesaj) {
      return NextResponse.json(
        { error: 'Toate câmpurile sunt obligatorii' },
        { status: 400 }
      );
    }

    // Insert inquiry into database
    const { data, error } = await supabase
      .from('contact_inquiries')
      .insert({
        name: nume,
        email: email,
        message: mesaj,
        status: 'new',
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting inquiry:', error);
      return NextResponse.json(
        { error: 'A apărut o eroare. Vă rugăm încercați din nou.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Inquiry submitted successfully',
        data 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error in contact submission:', error);
    return NextResponse.json(
      { error: 'A apărut o eroare neașteptată' },
      { status: 500 }
    );
  }
}

