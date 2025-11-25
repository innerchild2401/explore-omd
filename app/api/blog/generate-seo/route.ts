import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';
import { validateRequest } from '@/lib/validation/validate';
import { z } from 'zod';
import OpenAI from 'openai';
import { env } from '@/lib/env';

const generateSeoSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.array(z.any()).min(1, 'Content is required'),
  language: z.enum(['ro', 'en', 'de']).optional().default('ro'),
});

/**
 * POST /api/blog/generate-seo
 * Generate SEO metadata (meta title, meta description, excerpt) using GPT-4o mini
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
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Only super admins can generate SEO
    if (profile.role !== 'super_admin') {
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
    const validation = await validateRequest(req, generateSeoSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { title, content, language } = validation.data;

    // Extract text content from blocks for context
    const extractTextFromBlocks = (blocks: any[]): string => {
      return blocks
        .map((block) => {
          if (block.type === 'paragraph') return block.content || '';
          if (block.type === 'heading') return block.content || '';
          if (block.type === 'quote') return block.content || '';
          if (block.type === 'list') return block.items?.join(' ') || '';
          return '';
        })
        .filter(Boolean)
        .join(' ')
        .substring(0, 3000); // Limit to 3000 chars for context
    };

    const contentText = extractTextFromBlocks(content);

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

    const prompt = `You are an expert SEO content writer. Generate SEO-optimized metadata for a blog post with the title "${title}".

Post content preview:
${contentText}

Generate in ${languageName} language:
1. Meta Title: 50-60 characters, SEO-optimized, includes main keywords, compelling
2. Meta Description: 150-160 characters, SEO-optimized, includes call-to-action, engaging summary
3. Excerpt: 1-2 sentences (100-200 characters), perfect for blog listing previews, engaging

Format your response as JSON:
{
  "meta_title": "...",
  "meta_description": "...",
  "excerpt": "..."
}`;

    log.info('Generating SEO metadata for blog post', {
      title,
      language,
      user_id: user.id,
    });

    // Generate content with GPT-4o mini
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert SEO content writer specializing in blog posts. Generate natural, engaging, and SEO-optimized metadata that follows best practices.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 300,
      response_format: { type: 'json_object' },
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      log.error('Empty response from OpenAI');
      return NextResponse.json(
        { error: 'Failed to generate SEO metadata' },
        { status: 500 }
      );
    }

    // Parse JSON response
    let generatedSeo;
    try {
      generatedSeo = JSON.parse(responseContent);
    } catch (parseError) {
      log.error('Failed to parse OpenAI response', parseError);
      return NextResponse.json(
        { error: 'Invalid response from AI service' },
        { status: 500 }
      );
    }

    // Validate generated content structure
    if (
      !generatedSeo.meta_title ||
      !generatedSeo.meta_description ||
      !generatedSeo.excerpt
    ) {
      log.error('Invalid SEO structure from OpenAI', { generatedSeo });
      return NextResponse.json(
        { error: 'Invalid SEO structure from AI service' },
        { status: 500 }
      );
    }

    // Trim to proper lengths
    const metaTitle = generatedSeo.meta_title.substring(0, 60).trim();
    const metaDescription = generatedSeo.meta_description.substring(0, 160).trim();
    const excerpt = generatedSeo.excerpt.substring(0, 200).trim();

    log.info('SEO metadata generated successfully', {
      title,
      meta_title_length: metaTitle.length,
      meta_description_length: metaDescription.length,
      excerpt_length: excerpt.length,
    });

    return NextResponse.json({
      meta_title: metaTitle,
      meta_description: metaDescription,
      excerpt: excerpt,
    });
  } catch (error) {
    log.error('Error in POST /api/blog/generate-seo', error);
    
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

