'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

export default function HomePage() {
  const [formData, setFormData] = useState({
    nume: '',
    email: '',
    mesaj: '',
  });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError('');

    // TODO: Implement actual form submission logic
    setTimeout(() => {
      setFormSubmitted(true);
      setIsSubmitting(false);
      setFormData({ nume: '', email: '', mesaj: '' });
    }, 1000);
  };

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-screen w-full overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 z-0">
          <div 
            className="h-full w-full"
            style={{
              background: 'linear-gradient(135deg, #0066cc 0%, #00a8cc 50%, #0066cc 100%)',
            }}
          />
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/30" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl"
          >
            {/* Logo/Title */}
            <motion.h1
              className="mb-6 text-5xl font-bold text-white md:text-7xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Dest Explore
            </motion.h1>

            {/* Tagline */}
            <motion.p
              className="mb-8 text-xl text-white/95 md:text-2xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Soluții complete pentru gestionarea și promovarea destinațiilor turistice.
            </motion.p>

            {/* CTA Button */}
            <motion.a
              href="#contact"
              className="inline-block rounded-full bg-white px-8 py-4 text-lg font-semibold text-blue-600 transition-all hover:scale-105 hover:shadow-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Solicitează o prezentare
            </motion.a>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div
            className="absolute bottom-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1 }}
          >
            <motion.div
              className="flex flex-col items-center text-white"
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <span className="mb-2 text-sm">Derulează pentru a explora</span>
              <svg
                className="h-6 w-6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
              </svg>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Ce oferim Section */}
      <section id="ce-oferim" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-16 text-center"
          >
            <h2 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl">
              Ce oferim
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-600">
              O platformă unificată pentru managementul destinațiilor turistice, 
              concepută pentru a susține OMD-urile și partenerii locali în promovarea 
              serviciilor turistice de calitate.
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: (
                  <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
                title: 'Onboarding controlat',
                description: 'Businessurile sunt listate doar după aprobarea OMD-ului, asigurând calitatea serviciilor promovate.',
              },
              {
                icon: (
                  <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: 'Audit al calității serviciilor',
                description: 'Realizat prin emailuri de follow-up și recenzii automate pentru menținerea standardelor înalte.',
              },
              {
                icon: (
                  <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: 'Transparență financiară',
                description: 'Membri pot vedea ROI-ul direct prin plata online a serviciilor promovate pe platformă.',
              },
              {
                icon: (
                  <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                ),
                title: 'Design unitar și modern',
                description: 'Conform celor mai bune practici din industrie pentru platforme de rezervări și management turistic.',
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="rounded-xl bg-gray-50 p-6 text-center transition-all hover:shadow-lg"
              >
                <div className="mb-4 flex justify-center text-blue-600">
                  {feature.icon}
                </div>
                <h3 className="mb-3 text-xl font-semibold text-gray-900">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Beneficii Section */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-16 text-center"
          >
            <h2 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl">
              Beneficii pentru OMD-uri și parteneri locali
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-600">
              O platformă care conectează și susține toți actorii din ecosistemul turistic local.
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: (
                  <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                ),
                title: 'Colaborare eficientă',
                description: 'Coordonare simplificată între OMD-uri și businessuri locale pentru o promovare coerentă a destinației.',
              },
              {
                icon: (
                  <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ),
                title: 'Vizibilitate crescută',
                description: 'Promovare profesională și integrată care crește vizibilitatea partenerilor locali și atrage mai mulți vizitatori.',
              },
              {
                icon: (
                  <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ),
                title: 'Automatizare și analiză',
                description: 'Procese automate pentru rezervări, feedback și analiza performanței, economisind timp și resurse.',
              },
            ].map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="rounded-xl bg-white p-8 shadow-md transition-all hover:shadow-xl"
              >
                <div className="mb-4 text-blue-600">
                  {benefit.icon}
                </div>
                <h3 className="mb-3 text-2xl font-semibold text-gray-900">
                  {benefit.title}
                </h3>
                <p className="text-gray-600">
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Cum funcționează Section */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-16 text-center"
          >
            <h2 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl">
              Cum funcționează
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-600">
              Trei pași simpli pentru a începe să folosești platforma Dest Explore.
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: '1',
                title: 'Creează contul',
                description: 'Înregistrează-te rapid ca OMD sau partener local pentru a accesa platforma.',
              },
              {
                step: '2',
                title: 'Aprobarea de către OMD',
                description: 'OMD-urile verifică și aprobă businessurile pentru a menține standardele de calitate.',
              },
              {
                step: '3',
                title: 'Măsoară rezultatele',
                description: 'Monitorizează performanța, gestionează rezervările și analizează impactul promovării.',
              },
            ].map((stepItem, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="relative"
              >
                <div className="rounded-xl bg-gray-50 p-8 text-center">
                  {/* Step Number */}
                  <div className="mb-6 flex justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold text-white">
                      {stepItem.step}
                    </div>
                  </div>
                  <h3 className="mb-3 text-2xl font-semibold text-gray-900">
                    {stepItem.title}
                  </h3>
                  <p className="text-gray-600">
                    {stepItem.description}
                  </p>
                </div>
                {/* Arrow for desktop */}
                {index < 2 && (
                  <div className="hidden items-center justify-center md:absolute md:right-0 md:top-1/2 md:z-10 md:flex md:-translate-y-1/2 md:translate-x-[1rem]">
                    <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials/Examples Section */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-16 text-center"
          >
            <h2 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl">
              Destinații pilot
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-600">
              Descoperă destinațiile care folosesc deja platforma Dest Explore.
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* Mangalia Pilot Destination */}
            <motion.a
              href="https://www.destexplore.eu/mangalia"
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="group rounded-xl bg-white p-8 shadow-md transition-all hover:shadow-xl"
            >
              <div className="mb-4 flex items-center justify-center">
                <div className="rounded-full bg-blue-100 p-4 text-blue-600">
                  <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="mb-2 text-2xl font-bold text-gray-900">
                Mangalia
              </h3>
              <p className="mb-4 text-gray-600">
                Destinația de top a Marii Negre
              </p>
              <div className="flex items-center text-blue-600 transition-colors group-hover:text-blue-700">
                <span className="mr-2 font-semibold">Explorează destinația</span>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </motion.a>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section id="contact" className="bg-white py-20">
        <div className="mx-auto max-w-4xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-12 text-center"
          >
            <h2 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl">
              Hai să discutăm
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-600">
              Hai să discutăm despre cum putem transforma destinația ta într-un model de succes.
            </p>
          </motion.div>

          {formSubmitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-lg bg-green-50 p-6 text-center"
            >
              <svg className="mx-auto mb-4 h-12 w-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mb-2 text-xl font-semibold text-green-900">
                Mesaj trimis cu succes!
              </h3>
              <p className="text-green-700">
                Vă vom contacta în cel mai scurt timp posibil.
              </p>
            </motion.div>
          ) : (
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-6 rounded-xl bg-gray-50 p-8 shadow-md"
            >
              {formError && (
                <div className="rounded-lg bg-red-50 p-4 text-red-600">
                  {formError}
                </div>
              )}

              <div>
                <label htmlFor="nume" className="mb-2 block text-sm font-medium text-gray-700">
                  Nume *
                </label>
                <input
                  type="text"
                  id="nume"
                  required
                  value={formData.nume}
                  onChange={(e) => setFormData({ ...formData, nume: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none"
                  placeholder="Numele tău complet"
                />
              </div>

              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none"
                  placeholder="adresa.ta@email.com"
                />
              </div>

              <div>
                <label htmlFor="mesaj" className="mb-2 block text-sm font-medium text-gray-700">
                  Mesaj *
                </label>
                <textarea
                  id="mesaj"
                  required
                  rows={6}
                  value={formData.mesaj}
                  onChange={(e) => setFormData({ ...formData, mesaj: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none"
                  placeholder="Spune-ne despre destinația ta și despre cum te putem ajuta..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-blue-600 px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-blue-300"
              >
                {isSubmitting ? 'Se trimite...' : 'Trimite mesajul'}
              </button>
            </motion.form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="grid gap-8 md:grid-cols-3">
            {/* Logo & Description */}
            <div>
              <h3 className="mb-4 text-2xl font-bold">Dest Explore</h3>
              <p className="text-gray-400">
                Platformă unificată pentru gestionarea și promovarea destinațiilor turistice.
                Soluții complete pentru OMD-uri și parteneri locali.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="mb-4 text-lg font-semibold">Linkuri rapide</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#ce-oferim" className="text-gray-400 transition-colors hover:text-white">
                    Despre
                  </a>
                </li>
                <li>
                  <a href="#contact" className="text-gray-400 transition-colors hover:text-white">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 transition-colors hover:text-white">
                    Confidențialitate
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 transition-colors hover:text-white">
                    Termeni și condiții
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h4 className="mb-4 text-lg font-semibold">Contact</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="mailto:contact@destexplore.eu" className="transition-colors hover:text-white">
                    contact@destexplore.eu
                  </a>
                </li>
                <li>
                  <a href="https://destexplore.eu" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-white">
                    destexplore.eu
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-8 border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>
              © {new Date().getFullYear()} Dest Explore. Toate drepturile rezervate.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}