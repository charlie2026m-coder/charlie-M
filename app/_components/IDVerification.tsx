// 'use client';
// import { useEffect, useState } from 'react';
// import { Button } from './ui/button';
// import { DiditVerificationData } from '@/types/didit';

// export default function Verification() {
//   const [verificationData, setVerificationData] = useState<DiditVerificationData | undefined>(undefined);
//   const [status, setStatus] = useState<'Not Started' | 'In Progress' | 'Completed'>('Not Started');
//   const [isMobile, setIsMobile] = useState(false);

//   useEffect(() => {
//     const checkMobile = () => {
//       setIsMobile(window.innerWidth < 768);
//     };

//     // Проверяем при монтировании
//     checkMobile();

//     // Добавляем обработчик изменения размера окна
//     window.addEventListener('resize', checkMobile);

//     return () => window.removeEventListener('resize', checkMobile);
//   }, []);

//   async function startVerification() {
//     const res = await fetch('/api/webhooks/didit', { method: 'POST' });
//     const data = await res.json();

//     console.log('Didit Response:', data);
   
//     setVerificationData(data);
//     setStatus(data.url);
//   }

//   useEffect(() => {
//     if (verificationData?.url) {
//       if (isMobile) {
//         window.location.href = verificationData.url;
//       }
//       const interval = setInterval(() => {
//         fetch(`https://sjaxlbxpvquzexeasxwn.supabase.co/functions/v1/didit-webhook?session_id=${verificationData.session_id}`);
//       }, 3000);
//       return () => clearInterval(interval);
//     }
//   }, [verificationData?.url, isMobile])

//   // async function checkStatus(id: string) {
//   //   const interval = setInterval(async () => {
//   //     const res = await fetch(`https://sjaxlbxpquzexeasxwn.supabase.co/functions/v1/didit-webhook/${id}`);
//   //     const data = await res.json();
      
//   //     if (data.status === 'completed') {
//   //       clearInterval(interval);
//   //       setStatus('completed');
//   //     }
//   //   }, 3000); // Check status every 3 seconds
//   // }

//   return (
//     <div className='container flex flex-col'>

      
//           <div className=' p-10 bg-white rounded-2xl shadow-lg '>
//               <Button variant="outline" onClick={startVerification}>
//                 Verify id
//               </Button>
//               {!isMobile && verificationData?.url && (
//                 <iframe 
//                   src={verificationData.url} 
//                   className="w-[700px] bg-white h-[700px] bg-light-bg pr-10  border-r"
//                 />
//               )}
//           </div >
        
//     </div>
//   );
// }