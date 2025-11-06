import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Submit destination rating
 * POST /api/feedback/destination-rating
 * Body: { omdSlug, rating, comment?, name, email }
 */
export async function POST(request: NextRequest) {
  try {
    const { omdSlug, rating, comment, name, email } = await request.json();

    if (!omdSlug || !rating || !name || !email) {
      return NextResponse.json(
        { error: 'Câmpuri obligatorii lipsă' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Evaluarea trebuie să fie între 1 și 5' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get OMD ID from slug
    const { data: omd, error: omdError } = await supabase
      .from('omds')
      .select('id')
      .eq('slug', omdSlug)
      .single();

    if (omdError || !omd) {
      return NextResponse.json(
        { error: 'Destinația nu a fost găsită' },
        { status: 404 }
      );
    }

    // Check if rating already exists for this email and OMD
    const { data: existingRating } = await supabase
      .from('destination_ratings')
      .select('id')
      .eq('omd_id', omd.id)
      .eq('email', email)
      .maybeSingle();

    if (existingRating) {
      // Update existing rating
      const { error: updateError } = await supabase
        .from('destination_ratings')
        .update({
          rating,
          comment: comment || null,
          name: name.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingRating.id);

      if (updateError) {
        throw updateError;
      }
    } else {
      // Create new rating
      const { error: insertError } = await supabase
        .from('destination_ratings')
        .insert({
          omd_id: omd.id,
          rating,
          comment: comment || null,
          name: name.trim(),
          email: email.trim(),
        });

      if (insertError) {
        throw insertError;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error submitting destination rating:', error);
    return NextResponse.json(
      { error: error.message || 'Eroare la trimiterea evaluării' },
      { status: 500 }
    );
  }
}

