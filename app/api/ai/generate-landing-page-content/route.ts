import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';
import { validateRequest } from '@/lib/validation/validate';
import { z } from 'zod';
import OpenAI from 'openai';
import { env } from '@/lib/env';

const generateContentSchema = z.object({
  label_names: z.array(z.string()).min(1, 'At least one label is required'),
  destination_name: z.string().min(1, 'Destination name is required'),
  language: z.enum(['ro', 'en', 'de']).default('ro'),
  business_count: z.number().int().min(1).max(20).optional().default(5),
});

/**
 * POST /api/ai/generate-landing-page-content
 * Generate SEO content for a landing page using GPT-4o mini
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, omd_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Only OMD admins and super admins can generate content
    if (profile.role !== 'omd_admin' && profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if OpenAI is configured
    if (!env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    // Validate request body
    const validation = await validateRequest(req, generateContentSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { label_names, destination_name, language, business_count } = validation.data;

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });

    // Build prompt based on language
    const languageNames: Record<string, string> = {
      ro: 'română',
      en: 'English',
      de: 'Deutsch',
    };

    const languageName = languageNames[language as keyof typeof languageNames] || 'română';

    const prompt = `You are an SEO content writer for a travel and tourism platform. Generate SEO-optimized content for a landing page about "${destination_name}" featuring businesses with the following labels: ${label_names.join(', ')}.

Generate content in ${languageName} language. The content should be:
- SEO-optimized with relevant keywords
- Engaging and informative
- Natural and readable (not keyword-stuffed)
- Approximately ${business_count} businesses will be featured on this page

Please provide:
1. A compelling page title (50-60 characters, SEO-optimized)
2. A meta description (150-160 characters, SEO-optimized, includes call-to-action)
3. An H1 header (engaging, includes destination name and main theme)
4. An introductory paragraph (2-3 sentences, sets the context, mentions the labels naturally)

Format your response as JSON:
{
  "title": "...",
  "meta_description": "...",
  "header_text": "...",
  "intro_text": "..."
}`;

    log.info('Generating AI content for landing page', {
      destination: destination_name,
      labels: label_names,
      language,
      user_id: user.id,
    });

    // Generate content with GPT-4o mini
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert SEO content writer specializing in travel and tourism. Generate natural, engaging, and SEO-optimized content.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      log.error('Empty response from OpenAI');
      return NextResponse.json(
        { error: 'Failed to generate content' },
        { status: 500 }
      );
    }

    // Parse JSON response
    let generatedContent;
    try {
      generatedContent = JSON.parse(responseContent);
    } catch (parseError) {
      log.error('Failed to parse OpenAI response', parseError);
      return NextResponse.json(
        { error: 'Invalid response from AI service' },
        { status: 500 }
      );
    }

    // Validate generated content structure
    if (
      !generatedContent.title ||
      !generatedContent.meta_description ||
      !generatedContent.header_text ||
      !generatedContent.intro_text
    ) {
      log.error('Invalid content structure from OpenAI', { generatedContent });
      return NextResponse.json(
        { error: 'Invalid content structure from AI service' },
        { status: 500 }
      );
    }

    log.info('AI content generated successfully', {
      destination: destination_name,
      title_length: generatedContent.title.length,
      meta_length: generatedContent.meta_description.length,
    });

    return NextResponse.json({
      content: {
        title: generatedContent.title,
        meta_description: generatedContent.meta_description,
        header_text: generatedContent.header_text,
        intro_text: generatedContent.intro_text,
      },
    });
  } catch (error) {
    log.error('Error in POST /api/ai/generate-landing-page-content', error);
    
    // Handle OpenAI API errors
    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        {
          error: 'AI service error',
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

