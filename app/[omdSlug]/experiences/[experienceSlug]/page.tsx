import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import ContactLink from '@/components/analytics/ContactLink';
import ImageGallery from '@/components/hotels/ImageGallery';
import TrackPageView from '@/components/analytics/TrackPageView';
import BackButton from '@/components/ui/BackButton';
import TopPagesSection from '@/components/business/TopPagesSection';
import { formatPrice } from '@/lib/utils';

interface PageProps {
  params: { omdSlug: string; experienceSlug: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function ExperienceDetailPage({ params, searchParams }: PageProps) {
  const { omdSlug, experienceSlug } = params;
  const supabase = await createClient();

  // Get OMD
  const { data: omd } = await supabase
    .from('omds')
    .select('id, name, slug, status')
    .eq('slug', omdSlug)
    .single();

  if (!omd || omd.status !== 'active') {
    notFound();
  }

  // Get business (experience)
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', experienceSlug)
    .eq('omd_id', omd.id)
    .eq('type', 'experience')
    .eq('status', 'active')
    .eq('is_published', true)
    .single();

  if (!business) {
    notFound();
  }

  // Get experience details
  const { data: experience } = await supabase
    .from('experiences')
    .select('*')
    .eq('business_id', business.id)
    .single();

  if (!experience) {
    notFound();
  }

  // Get area information if available
  let areaName = null;
  if (business.area_id) {
    const { data: area } = await supabase
      .from('areas')
      .select('name')
      .eq('id', business.area_id)
      .single();
    areaName = area?.name || null;
  }

  // Prepare gallery images
  const gallery = (business.images || []).map((img: any) => 
    typeof img === 'string' ? img : img?.url || ''
  );

  // Format currency - use the utility function
  const currency = experience.currency || 'RON';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white">
        <TrackPageView businessId={business.id} eventType="detail_view" />
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-6">
            <BackButton href={`/${omdSlug}/experiences`} label="Back to Experiences" />
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Left Column - Main Info */}
            <div className="lg:col-span-2">
              {/* Experience Title */}
              <div className="mb-6">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {experience.category && (
                    <span className="inline-block rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-800">
                      {experience.category}
                    </span>
                  )}
                  {experience.difficulty_level && (
                    <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                      {experience.difficulty_level.charAt(0).toUpperCase() + experience.difficulty_level.slice(1)}
                    </span>
                  )}
                  {experience.instant_confirmation && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Instant Confirmation
                    </span>
                  )}
                  {experience.wheelchair_accessible && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-800">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Wheelchair Accessible
                    </span>
                  )}
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">{business.name}</h1>
                
                <div className="space-y-2">
                  {business.location?.address && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-base sm:text-lg">{business.location.address}</span>
                      {areaName && (
                        <span className="text-gray-400">· {areaName}</span>
                      )}
                    </div>
                  )}
                  {business.contact?.website && (
                    <div className="flex items-center gap-2">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                      <a 
                        href={business.contact.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline text-sm sm:text-base"
                      >
                        Visit Website
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Key Info Cards */}
              <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {experience.duration && (
                  <div className="flex items-center gap-3 rounded-xl border border-blue-50 bg-blue-50/60 p-4">
                    <svg className="h-8 w-8 flex-shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-xs font-medium text-gray-600">Duration</p>
                      <p className="text-sm font-semibold text-gray-900">{experience.duration}</p>
                    </div>
                  </div>
                )}
                {(experience.min_participants || experience.max_participants) && (
                  <div className="flex items-center gap-3 rounded-xl border border-blue-50 bg-blue-50/60 p-4">
                    <svg className="h-8 w-8 flex-shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <div>
                      <p className="text-xs font-medium text-gray-600">Participants</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {experience.min_participants && experience.max_participants
                          ? `${experience.min_participants}-${experience.max_participants}`
                          : experience.min_participants
                          ? `Min ${experience.min_participants}`
                          : `Up to ${experience.max_participants}`}
                      </p>
                    </div>
                  </div>
                )}
                {experience.price_from && (
                  <div className="flex items-center gap-3 rounded-xl border border-green-50 bg-green-50/60 p-4">
                    <svg className="h-8 w-8 flex-shrink-0 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-xs font-medium text-gray-600">Price</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatPrice(experience.price_from, currency)}
                      </p>
                      <p className="text-xs text-gray-500">per person</p>
                    </div>
                  </div>
                )}
                {experience.languages && experience.languages.length > 0 && (
                  <div className="flex items-center gap-3 rounded-xl border border-blue-50 bg-blue-50/60 p-4">
                    <svg className="h-8 w-8 flex-shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                    <div>
                      <p className="text-xs font-medium text-gray-600">Languages</p>
                      <p className="text-sm font-semibold text-gray-900">{experience.languages.join(', ')}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Tags */}
              {experience.tags && experience.tags.length > 0 && (
                <div className="mb-6 flex flex-wrap gap-2">
                  {experience.tags.map((tag: string, idx: number) => (
                    <span
                      key={idx}
                      className="inline-block rounded-lg bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Description */}
              {business.description && (
                <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
                  <h2 className="mb-3 text-xl sm:text-2xl font-bold text-gray-900">About this experience</h2>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed whitespace-pre-line">{business.description}</p>
                </div>
              )}
            </div>

            {/* Right Column - Contact */}
            <div className="lg:col-span-1">
              <div className="sticky top-4">
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                  {experience.price_from && (
                    <div className="mb-6 pb-6 border-b border-gray-200">
                      <p className="text-3xl font-bold text-gray-900">
                        {formatPrice(experience.price_from, currency)}
                      </p>
                      <p className="text-sm text-gray-600">
                        per person
                      </p>
                    </div>
                  )}

                  {(business.contact?.phone || business.contact?.email) && (
                    <div className="space-y-3">
                      {business.contact?.phone && (
                        <ContactLink
                          businessId={business.id}
                          type="phone"
                          value={business.contact.phone}
                          className="flex w-full items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          Call to Book
                        </ContactLink>
                      )}
                      {business.contact?.email && (
                        <ContactLink
                          businessId={business.id}
                          type="email"
                          value={business.contact.email}
                          className="flex w-full items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          Email for Details
                        </ContactLink>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Image Gallery */}
      {gallery.length > 0 && (
        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-4 py-6">
            <ImageGallery images={gallery} hotelName={business.name} />
          </div>
        </section>
      )}

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* What's Included */}
            {experience.included && experience.included.length > 0 && (
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-2xl font-bold text-gray-900">What&apos;s included</h2>
                <ul className="space-y-3">
                  {experience.included.map((item: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-3">
                      <svg className="mt-0.5 h-6 w-6 flex-shrink-0 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* What's NOT Included */}
            {experience.not_included && experience.not_included.length > 0 && (
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-2xl font-bold text-gray-900">What&apos;s not included</h2>
                <ul className="space-y-3">
                  {experience.not_included.map((item: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-3">
                      <svg className="mt-0.5 h-6 w-6 flex-shrink-0 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Meeting Point */}
            {experience.meeting_point && (experience.meeting_point.address || experience.meeting_point.description) && (
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-2xl font-bold text-gray-900">Meeting Point</h2>
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                  {experience.meeting_point.address && (
                    <div className="mb-2 flex items-start gap-2">
                      <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="font-medium text-gray-900">{experience.meeting_point.address}</p>
                    </div>
                  )}
                  {experience.meeting_point.description && (
                    <p className="text-gray-700">{experience.meeting_point.description}</p>
                  )}
                </div>
              </div>
            )}

            {/* Important Information */}
            {experience.important_info && experience.important_info.length > 0 && (
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-2xl font-bold text-gray-900">Important Information</h2>
                <ul className="space-y-3">
                  {experience.important_info.map((info: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-3 text-gray-700">
                      <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{info}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Cancellation Policy */}
            {experience.cancellation_policy && (
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-2xl font-bold text-gray-900">Cancellation Policy</h2>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-gray-700 whitespace-pre-line">{experience.cancellation_policy}</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Sticky Contact Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <div className="rounded-2xl bg-white p-6 shadow-lg border border-gray-200">
                {experience.price_from && (
                  <div className="mb-6 pb-6 border-b border-gray-200">
                    <p className="text-3xl font-bold text-gray-900">
                      {formatPrice(experience.price_from, currency)}
                    </p>
                    <p className="text-sm text-gray-600">
                      per person
                    </p>
                  </div>
                )}

                {(business.contact?.phone || business.contact?.email) && (
                  <div className="space-y-3">
                    {business.contact?.phone && (
                      <ContactLink
                        businessId={business.id}
                        type="phone"
                        value={business.contact.phone}
                        className="flex w-full items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        Call to Book
                      </ContactLink>
                    )}
                    {business.contact?.email && (
                      <ContactLink
                        businessId={business.id}
                        type="email"
                        value={business.contact.email}
                        className="flex w-full items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Email for Details
                      </ContactLink>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Top Pages Section - Internal Linking */}
        <TopPagesSection
          omdSlug={omdSlug}
          omdName={omd.name}
          businessId={business.id}
          businessType="experience"
        />
      </div>
    </div>
  );
}
