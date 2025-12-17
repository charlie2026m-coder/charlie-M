// import { NextResponse } from 'next/server';

// export async function POST(request: Request) {
//   try {
//     const formData = await request.formData();
//     const file = formData.get('image');

//     if (!file) {
//       return NextResponse.json(
//         { message: 'Файл не найден' },
//         { status: 400 }
//       );
//     }

//     // Создаём новую FormData для отправки в Mindee
//     const mindeeFormData = new FormData();
//     mindeeFormData.append('document', file);

//     const mindeeResponse = await fetch(
//       'https://api.mindee.net/v1/products/mindee/passport/v1/predict',
//       {
//         method: 'POST',
//         headers: {
//           'Authorization': `Token ${process.env.MINDEE_API_KEY}`,
//         },
//         body: mindeeFormData,
//       }
//     );

//     if (!mindeeResponse.ok) {
//       const errorText = await mindeeResponse.text();
//       throw new Error(`Mindee API error: ${errorText}`);
//     }

//     const mindeeData = await mindeeResponse.json();

//     console.log(mindeeData, 'mindeeData');
//     return NextResponse.json({
//       message: 'Документ успешно обработан',
//       data: mindeeData,
//     });

//   } catch (error: any) {
//     console.error('Ошибка обработки:', error);
//     return NextResponse.json(
//       { 
//         message: 'Ошибка при обработке файла',
//         error: error.message 
//       },
//       { status: 500 }
//     );
//   }
// }