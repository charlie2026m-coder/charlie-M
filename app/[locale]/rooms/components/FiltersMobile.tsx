'use client'
import { useState } from 'react'
import { Checkbox } from "@/app/_components/ui/checkbox"
import { Label } from "@/app/_components/ui/label"
import { BedSizeFilter, MainFilter, RoomTypeFilter } from "@/store/useStore"
import {  IoFilter } from "react-icons/io5";
import { Button } from "@/app/_components/ui/button"
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerTitle, } from "@/app/_components/ui/drawer"
import { IoClose } from "react-icons/io5";
import { cn } from '@/lib/utils'
import { IoMdArrowDropdown, IoMdArrowDropup } from "react-icons/io";
import { useStore } from '@/store/useStore'
import { FaSortAmountDown, FaSortAmountUp } from "react-icons/fa";

const FiltersMobile = () => {
  const { filter, bedSizeFilter, priceFilter, roomTypeFilter, setValue } = useStore()
  const [openDrawer, setOpenDrawer] = useState(false)

  const clearFilters = () => {
    setValue(undefined, 'filter')
    setValue(undefined, 'bedSizeFilter')
    setValue(undefined, 'roomTypeFilter')
    setValue(false, 'priceFilter')
  }
  const setFilter = (value: MainFilter) => {
    setValue(filter === value ? undefined : value, 'filter')
  }
  const setBedSizeFilter = (value: BedSizeFilter) => {
    setValue(bedSizeFilter === value ? undefined : value, 'bedSizeFilter')
  }
  const setRoomTypeFilter = (value: RoomTypeFilter) => {
    setValue(roomTypeFilter === value ? undefined : value, 'roomTypeFilter')
  }
    return (
    <>
      <div className='flex md:hidden items-center justify-between mb-[30px]'>
        <Button onClick={() => setOpenDrawer(true)} className='flex items-center gap-2 h-[44px] !px-6'>
          <IoFilter className='size-5' />
          Filters
        </Button>
        <div className='flex gap-2 cursor-pointer items-center border rounded-full p-2 px-4 self-end ml-auto' onClick={() => setValue(!priceFilter, 'priceFilter')}>
          <h2 className='text-lg '>Price</h2>
          {priceFilter ? <FaSortAmountDown className='size-5' /> : <FaSortAmountUp className='size-5' />}
        </div>
      </div>

      <Drawer open={openDrawer} onOpenChange={setOpenDrawer} direction="left">
        <DrawerTitle className='hidden'>Filters</DrawerTitle>
        <DrawerContent className='rounded-r-[16px] overflow-hidden p-0 border-none bg-white min-w-[90%] flex flex-col h-full'>
          <div className='bg-black text-white px-5 py-3 flex justify-between items-center shrink-0'>
            <div className='text-[20px] font-bold flex gap-2 items-center'>
              <IoFilter className='size-5' />
              Filters
            </div>
            <IoClose className='size-8 cursor-pointer' onClick={() => setOpenDrawer(false)} />
          </div>
          <div className='flex flex-col gap-5 p-5 overflow-y-auto flex-1'>
          <CategoryFilter title="Room Type">
            <div className='flex flex-col gap-5'>
              {typeFilters.map((item) => (
                <div key={item.value} className='flex items-center gap-3'>
                  <Checkbox id={item.value} checked={roomTypeFilter === item.value} onCheckedChange={() => setRoomTypeFilter(item.value as RoomTypeFilter)} />
                  <Label htmlFor={item.value} className='text-[17px] font-[400] inter'>{item.label}</Label>
                </div>
              ))}
            </div>
          </CategoryFilter>

          <CategoryFilter title="Balcony or terrace">
            <div className='flex flex-col gap-5'>
              {filters.map((item) => (
                <div key={item.value} className='flex items-center gap-3'>
                  <Checkbox id={item.value} checked={filter === item.value} onCheckedChange={() => setFilter(item.value as MainFilter)} />
                  <Label htmlFor={item.value} className='text-[17px] font-[400] inter'>{item.label}</Label>
                </div>
              ))}
            </div>
          </CategoryFilter>
         
          <CategoryFilter title="Bed Size">
              {bedsFilter.map((item) => (
                <div key={item.value} className='flex items-center gap-3'>
                  <Checkbox id={item.value} checked={bedSizeFilter === item.value} onCheckedChange={() => setBedSizeFilter(item.value as BedSizeFilter)} />
                  <Label htmlFor={item.value} className='text-[17px] font-[400] inter'>{item.label}</Label>
                </div>
              ))}
          </CategoryFilter>
          </div>

          <DrawerFooter className='shrink-0 border-t bg-white'>
            <Button onClick={() => setOpenDrawer(false)}>Apply Filters</Button>
            <DrawerClose asChild>
              <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  )
}

const typeFilters = [
  {
    label: 'Single',
    value: 'single'
  },
  {
    label: 'Standard',
    value: 'standard'
  },
  {
    label: 'Business',
    value: 'business'
  },
  {
    label: 'Superior',
    value: 'superior'
  },
]

const filters = [
  {
    label: 'Balcony',
    value: 'balcony'
  },
  {
    label: 'Terrace',
    value: 'terrace'
  },
  {
    label: 'Shared Terrace',
    value: 'shared'
  },
]

const bedsFilter = [
  {
    label: 'Single',
    value: 'single'
  },
  {
    label: 'Queen',
    value: 'queen'
  },
  {
    label: 'King',
    value: 'king'
  },
]

export default FiltersMobile

const CategoryFilter = ({
  children,
  title, 
}: {
  children: React.ReactNode
  title: string

}) => {
  const [open, setOpen] = useState(false)
  return (
    <div className='flex flex-col gap-3'>
      <div className='flex items-center justify-between font-semibold text-lg'onClick={() => setOpen(prev => !prev)}>
        {title}
        {open ? <IoMdArrowDropup className='size-5 text-brown' /> : <IoMdArrowDropdown className='size-5 text-brown' />}    
      </div>
      <div className={cn('flex flex-col gap-2', open && 'h-0 overflow-hidden transition-all duration-300 ease-in-out opacity-0')}>
        {children}
      </div>
    </div>
  )
}
