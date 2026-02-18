import { EMAIL } from "@/lib/Constants";
import { getTranslations } from "next-intl/server";
import Header from "@/app/_components/header/Header";
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await Promise.resolve(params);
  const isGerman = locale === 'de';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://charlie-m.de";
  
  const canonicalUrl = isGerman ? `${siteUrl}/de/imprint` : `${siteUrl}/imprint`;

  const metadata = {
    en: {
      title: 'Imprint | Charlie M Hotel Berlin',
      description: 'Legal information and contact details for Charlie M Hotel in Berlin Mitte. Company details, registration information, and responsible parties.',
    },
    de: {
      title: 'Impressum | Charlie M Hotel Berlin',
      description: 'Rechtliche Informationen und Kontaktdaten des Charlie M Hotels in Berlin Mitte. Firmenangaben, Registerinformationen und verantwortliche Stellen.',
    }
  };

  const currentMeta = isGerman ? metadata.de : metadata.en;

  return {
    title: currentMeta.title,
    description: currentMeta.description,
    
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      }
    },
    
    openGraph: {
      title: currentMeta.title,
      description: currentMeta.description,
      url: canonicalUrl,
      siteName: 'Charlie M Hotel',
      locale: isGerman ? 'de_DE' : 'en_US',
      type: 'website',
    },
    
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${siteUrl}/imprint`,
        de: `${siteUrl}/de/imprint`
      }
    }
  };
}

const Imprint = async ({ params }: Props) => {
  const { locale } = await Promise.resolve(params);
  const t = await getTranslations();

  return (
    <>
      <Header locale={locale} />
      <section className="flex flex-col  container px-4 md:px-10 xl:px-[100px] py-[50px]">
      <h1 className='mb-5 text-2xl font-bold'>{t('imprint.title')}</h1>
      <div className="flex flex-col mb-4">
        {t('imprint.company')}<br />
        {t('imprint.address_line1')}<br />
        {t('imprint.address_line2')}<br />
        {t('imprint.address_line3')}
      </div>

      <div className="flex flex-col mb-4">
        <b>{t('imprint.represented_by')}</b>
        {t('imprint.general_partner')}<br />
        {t('imprint.general_partner_name')}
      </div>

      <div className="flex flex-col mb-4">
        <b>{t('imprint.managing_directors')}</b>
        {t('imprint.director1')}<br />
        {t('imprint.director2')}
      </div>

      <div className="flex flex-col mb-4">
        <b>{t('imprint.contact')}</b>
        {t('imprint.email_label')} {EMAIL}
      </div>

      <div className="flex flex-col mb-4">
        <b>{t('imprint.commercial_register')}</b>
        {t('imprint.registered_with')}<br />
        {t('imprint.register_court')}<br />
        {t('imprint.register_number')} <span>{t('imprint.register_number_value')}</span>
      </div>

      <div className="flex flex-col mb-4">
        <b>{t('imprint.vat_id')}</b>
        {t('imprint.vat_id_description')}<br />
        <b>{t('imprint.vat_id_value')}</b>
      </div>

      <div className="flex flex-col mb-4">
        <b>{t('imprint.responsible_content')}</b>
        {t('imprint.company')}<br />
        {t('imprint.address_line1')}<br />
        {t('imprint.address_line2')}<br />
        {t('imprint.address_line3')}
      </div>
      <div className="flex flex-col mb-4">
        <b>{t('imprint.dispute_resolution')}</b>
        {t('imprint.dispute_resolution_text')}
      </div>
    </section>
    </>
  )
}

export default Imprint;