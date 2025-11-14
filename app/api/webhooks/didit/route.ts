// import { DiditVerificationData, DiditVerificationResults } from "@/types/didit";
// import { NextRequest, NextResponse } from "next/server";

// export async function POST(req: NextRequest) {
//   console.log('DIDIT API key', process.env.DIDIT_API_KEY);
  
//   const response = await fetch('https://verification.didit.me/v2/session/', {
//     method: 'POST',
//     headers: {
//       'x-api-key': `${process.env.DIDIT_API_KEY}`,
//       'accept': 'application/json',
//       'content-type': 'application/json'
//     },
//     body: JSON.stringify({
//       workflow_id: process.env.DIDIT_WORKFLOW_ID,
//       vendor_data: 'user_123', 
//       callback: 'https://sjaxlbxpvquzexeasxwn.supabase.co/functions/v1/didit-webhook'
//     })
//   });
  
//   const data = await response.json() as  DiditVerificationData
//   console.log('Didit Response:', data);

//   const results: DiditVerificationResults  = {
//     session_id: data.session_id,
//     session_number: data.session_number,
//     url: data.url,
//     vendor_data: data.vendor_data,
//     status: data.status,
//   }
  
//   return NextResponse.json(results);
// }
