import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import ContactLink from '@/components/analytics/ContactLink';
import ImageGallery from '@/components/hotels/ImageGallery';
import TrackPageView from '@/components/analytics/TrackPageView';
import BackButton from '@/components/ui/BackButton';

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

  // Prepare gallery images
  const gallery = (business.images || []).map((img: any) => 
    typeof img === 'string' ? img : img?.url || ''
  );

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
                <div className="mb-2 flex items-center gap-3">
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
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-3">{business.name}</h1>
                
                {business.location?.address && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-lg">{business.location.address}</span>
                  </div>
                )}
              </div>

              {/* Key Info */}
              <div className="flex flex-wrap gap-6 mb-6">
                {experience.duration && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">{experience.duration}</span>
                  </div>
                )}
                {experience.max_participants && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="font-medium">Up to {experience.max_participants} people</span>
                  </div>
                )}
                {experience.price_from && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">From {require('@/lib/utils').formatPrice(experience.price_from || 0, 'RON')} per person</span>
                  </div>
                )}
              </div>

              {/* Description */}
              {business.description && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">About this experience</h2>
                  <p className="text-gray-700 leading-relaxed">{business.description}</p>
                </div>
              )}
            </div>

            {/* Right Column - Contact */}
            <div className="lg:col-span-1">
              <div className="sticky top-4">
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                  {experience.price_from && (
                    <div className="mb-6">
                      <p className="text-3xl font-bold text-gray-900">
                        {require('@/lib/utils').formatPrice(experience.price_from || 0, 'RON')}
                      </p>
                      <p className="text-sm text-gray-600">per person</p>
                    </div>
                  )}

                  {(business.contact?.phone || business.contact?.email) && (
                    <div className="space-y-4">
                      {business.contact?.phone && (
                        <ContactLink
                          businessId={business.id}
                          type="phone"
                          value={business.contact.phone}
                          className="block w-full text-center px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                        >
                          📞 Call to Book
                        </ContactLink>
                      )}
                      {business.contact?.email && (
                        <ContactLink
                          businessId={business.id}
                          type="email"
                          value={business.contact.email}
                          className="block w-full text-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          ✉️ Email for Details
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
      <div className="mx-auto max-w-4xl px-4 py-12">
        {/* What's Included */}
        {experience.included && experience.included.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">What&apos;s included</h2>
            <ul className="space-y-2">
              {experience.included.map((item: string, idx: number) => (
                <li key={idx} className="flex items-start gap-3">
                  <svg className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">What&apos;s not included</h2>
            <ul className="space-y-2">
              {experience.not_included.map((item: string, idx: number) => (
                <li key={idx} className="flex items-start gap-3">
                  <svg className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Meeting Point */}
        {experience.meeting_point && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Meeting Point</h2>
            <div className="bg-blue-50 rounded-lg p-4">
              {experience.meeting_point.address && (
                <p className="font-medium text-gray-900 mb-2">{experience.meeting_point.address}</p>
              )}
              {experience.meeting_point.description && (
                <p className="text-gray-700">{experience.meeting_point.description}</p>
              )}
            </div>
          </div>
        )}

        {/* Important Information */}
        {experience.important_info && experience.important_info.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Important Information</h2>
            <ul className="space-y-2">
              {experience.important_info.map((info: string, idx: number) => (
                <li key={idx} className="flex items-start gap-3 text-gray-700">
                  <svg className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Cancellation Policy</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700">{experience.cancellation_policy}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
