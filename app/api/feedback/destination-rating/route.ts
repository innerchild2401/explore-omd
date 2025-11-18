import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';
import { rateLimitCheck } from '@/lib/middleware/rate-limit';
import { validateRequest } from '@/lib/validation/validate';
import { destinationRatingSchema } from '@/lib/validation/schemas';

/**
 * Submit destination rating
 * POST /api/feedback/destination-rating
 * Body: { omdSlug, rating, comment?, name, email }
 */
export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimit = await rateLimitCheck(request, 'feedback');
  if (!rateLimit.success) {
    return rateLimit.response!;
  }
  try {
    // Validate request body
    const validation = await validateRequest(request, destinationRatingSchema);
    if (!validation.success) {
      return validation.response;
    }
    const { omdSlug, rating, comment, name, email } = validation.data;

    // Use service role client to bypass RLS for public form submissions
    const supabase = createServiceRoleClient();

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
    logger.error('Error submitting destination rating', error, {});
    return NextResponse.json(
      { error: error.message || 'Eroare la trimiterea evaluării' },
      { status: 500 }
    );
  }
}

