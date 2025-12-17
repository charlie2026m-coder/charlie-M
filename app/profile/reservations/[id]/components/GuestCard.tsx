import { Button } from "@/app/_components/ui/button"
import { CustomDialog } from "@/app/_components/ui/CustomDialog"
import { Input } from "@/app/_components/ui/input"
import { Label } from "@/app/_components/ui/label"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { guestInfoSchema, type GuestInfoFormData } from "@/types/schemas"
import CustomInput from "@/app/_components/ui/customInput"
import BirthdayInput from "@/app/_components/ui/BitrhdayInput"

const GuestCard = ({
  name,
  birthdate,
  id,
  nationality,
  address,
}: {
  name: string
  birthdate: string
  id: string
  nationality: string
  address: string
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<GuestInfoFormData>({
    resolver: zodResolver(guestInfoSchema),
    defaultValues: {
      name,
      idNumber: id,
      nationality,
      birthdate,
      address,
    },
    mode: 'onChange',
  });

  const onSubmit = async (data: GuestInfoFormData) => {
    // Здесь будет логика сохранения данных
    console.log('Saving guest data:', data);
    // TODO: Добавить API запрос для сохранения данных
    setIsOpen(false);
  };

  const handleCancel = () => {
    reset(); // Reset form to default values
    setIsOpen(false);
  };

  return (
    <>

      <CustomDialog 
        open={isOpen}
        setOpen={setIsOpen}
        trigger={      
          <div onClick={() => setIsOpen(true)} className='grid grid-cols-5 gap-2 p-5 rounded-2xl bg-white border hover:shadow-md transition-all duration-300 cursor-pointer'>
            <div className='col-span-1 flex flex-col gap-6'>
              <Item label='Name' value={name} />
              <Item label='Birthdate' value={birthdate} />
            </div>
            <div className='col-span-1 flex flex-col gap-6'>
              <Item label='ID' value={id} />
              <Item label='Nationality' value={nationality} />
            </div>

            <div className='col-span-3 flex flex-col'>
              <Item label='Address' value={address} />
            </div>
          </div>
        } 
        content={
          <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col w-full'>
            <div className="grid grid-cols-2 gap-5 w-full">
              {/* Name */}
                <CustomInput
                  register={register}
                  name='name'
                  type='text'
                  placeholder='Enter full name'
                  isError={!!errors.name}
                  className='w-full min-w-[300px]'
                />

              {/* ID Number */}
                <CustomInput
                  register={register}
                  icon='id'
                  name='idNumber'
                  type='text'
                  placeholder='Enter ID number'
                  isError={!!errors.idNumber}
                  className='w-full min-w-[300px]'
                />    
                <CustomInput
                  register={register}
                  icon='nationality'
                  name='nationality'
                  type='text'
                  placeholder='Enter nationality'
                  isError={!!errors.nationality}
                  className='w-full min-w-[300px]'
                />  
                <BirthdayInput
                  register={register}
                  setValue={setValue}
                  name='birthdate'
                  placeholder='Enter birthdate'
                  value={watch('birthdate')}
                  isError={!!errors.birthdate}
                  className='w-full min-w-[300px]'
                />  
                <CustomInput
                  register={register}
                  icon='address'
                  name='address'
                  type='text'
                  placeholder='Enter address'
                  isError={!!errors.address}
                  className='w-full min-w-[300px] col-span-2'
                />  

 
            </div>
            <div className='flex gap-4 items-center justify-center mt-[30px]'>
              <Button 
                type='button'
                variant='outline' 
                className='w-full max-w-[190px] h-[45px]' 
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button 
                type='submit'
                className='w-full max-w-[190px] h-[45px]'
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        } 
        title="Guest personal info" 
      /> 
    </>
  )
}

export default GuestCard

const Item = ({ label, value }: { label: string, value: string }) => {
  return (
    <div className='flex flex-col text-sm'>
    {label}
    <span className='font-semibold'>{value}</span>
  </div>
  )
}