'use client'
import { useState } from "react";
import { BsFillGeoAltFill } from "react-icons/bs";
import { FiEdit2 } from "react-icons/fi";
import { TbDirectionsFilled, TbHomeSearch } from "react-icons/tb";
import { HiMiniHome } from "react-icons/hi2";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Input } from "@/app/_components/ui/input";
import { Button } from "@/app/_components/ui/button";
import { CountrySelect } from "@/app/_components/ui/CountrySelect";
import { Address } from "@/types/apaleo";
import { useUpdateBookingAddress } from "@/app/hooks/useUpdateBookingAddress";

interface AddressSectionProps {
  address: Address;
  guestData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    company?: { name?: string };
  };
  reservationId: string;
  onAddressUpdate?: (updatedAddress: Address) => void;
}

export const AddressSection = ({ address, guestData, reservationId, onAddressUpdate }: AddressSectionProps) => {
  const t = useTranslations('profile');
  const params = useParams();
  const locale = (params.locale as 'en' | 'de') || 'en';
  const updateAddress = useUpdateBookingAddress(reservationId);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    addressLine1: address.addressLine1 || '',
    addressLine2: address.addressLine2 || '',
    postalCode: address.postalCode || '',
    city: address.city || '',
    countryCode: address.countryCode || '',
  });
  const [displayed, setDisplayed] = useState({ ...formData });

  const handleCancel = () => {
    setFormData({ ...displayed });
    setIsEditing(false);
  };

  const handleSave = async () => {
    await updateAddress.mutateAsync({
      updatedGuestData: {
        ...guestData,
        address: {
          addressLine1: formData.addressLine1,
          addressLine2: formData.addressLine2,
          postalCode: formData.postalCode,
          city: formData.city,
          countryCode: formData.countryCode,
        },
      },
    });
    setDisplayed({ ...formData });
    onAddressUpdate?.(formData);
    setIsEditing(false);
  };

  return (
    <div className='flex flex-col gap-2 mt-1'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2 text-sm font-semibold text-gray-700'>
          <BsFillGeoAltFill className='size-4' />
          {t('address')}
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className='p-1.5 hover:bg-gray-100 rounded-lg transition-colors'
          aria-label={t('editAddress')}
        >
          <FiEdit2 className='size-3.5 text-gray-500' />
        </button>
      </div>

      {!isEditing ? (
        <div className='flex flex-col gap-0.5 text-sm text-gray-600 pl-6'>
          {(displayed.addressLine1 || displayed.addressLine2) && (
            <span>{[displayed.addressLine1, displayed.addressLine2].filter(Boolean).join(', ')}</span>
          )}
          {(displayed.postalCode || displayed.city) && (
            <span>{[displayed.postalCode, displayed.city].filter(Boolean).join(' ')}</span>
          )}
          {displayed.countryCode && (
            <span>{displayed.countryCode}</span>
          )}
        </div>
      ) : (
        <div className='flex flex-col gap-3 pt-1'>
          <div className='relative'>
            <TbDirectionsFilled className='absolute left-3 top-1/2 -translate-y-1/2 size-5 text-blue z-10 pointer-events-none' />
            <Input
              value={formData.addressLine1}
              onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
              placeholder={t('streetAddress')}
              className='pl-[45px] bg-white h-10 rounded-full border-gray shadow-none'
            />
          </div>

          <div className='relative'>
            <HiMiniHome className='absolute left-3 top-1/2 -translate-y-1/2 size-5 text-blue z-10 pointer-events-none' />
            <Input
              value={formData.addressLine2}
              onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
              placeholder={t('houseNumber')}
              className='pl-[45px] bg-white h-10 rounded-full border-gray shadow-none'
            />
          </div>

          <div className='grid grid-cols-2 gap-3'>
            <div className='relative'>
              <TbHomeSearch className='absolute left-3 top-1/2 -translate-y-1/2 size-5 text-blue z-10 pointer-events-none' />
              <Input
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                placeholder={t('postalCode')}
                className='pl-[45px] bg-white h-10 rounded-full border-gray shadow-none'
              />
            </div>
            <div className='relative'>
              <BsFillGeoAltFill className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-blue z-10 pointer-events-none' />
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder={t('city')}
                className='pl-[45px] bg-white h-10 rounded-full border-gray shadow-none'
              />
            </div>
          </div>

          <CountrySelect
            value={formData.countryCode}
            onValueChange={(value) => setFormData({ ...formData, countryCode: value })}
            locale={locale}
          />

          <div className='flex gap-2'>
            <Button
              variant='outline'
              className='flex-1 h-10 rounded-full'
              onClick={handleCancel}
              disabled={updateAddress.isPending}
            >
              {t('cancel')}
            </Button>
            <Button
              className='flex-1 h-10 rounded-full'
              onClick={handleSave}
              disabled={updateAddress.isPending}
            >
              {updateAddress.isPending ? t('saving') : t('save')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
