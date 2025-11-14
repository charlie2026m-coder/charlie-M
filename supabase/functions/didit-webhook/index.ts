// /// <reference types="https://deno.land/x/types/index.d.ts" />

// import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// serve(async (req) => {

//     const payload = await req.json()
//     // Выводим всё в консоль
//     console.log('=== Webhook Received ===')
//     console.log('Method:', req.method)
//     console.log('URL:', req.url)
//     console.log('Timestamp:', new Date().toISOString())
//     console.log('Data:', JSON.stringify(payload, null, 2))
//     console.log('========================')
    
//     return new Response(JSON.stringify({ success: true }), { status: 200 })

// })

