// 'use client'

// import { useState } from 'react';

// export default function ImageUpload() {
//   const [selectedFile, setSelectedFile] = useState(null);
//   const [preview, setPreview] = useState('');
//   const [response, setResponse] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');

//   const handleFileChange = (e) => {
//     const file = e.target.files[0];
//     if (file) {
//       setSelectedFile(file);
//       setError('');
//       setResponse(null);
      
//       const reader = new FileReader();
//       reader.onloadend = () => {
//         if (typeof reader.result === 'string') {
//           setPreview(reader.result);
//         }
//       };
//       reader.readAsDataURL(file);
//     }
//   };

//   const handleSubmit = async () => {
//     if (!selectedFile) return;

//     setLoading(true);
//     setError('');
//     setResponse(null);

//     const formData = new FormData();
//     formData.append('image', selectedFile);

//     try {
//       const res = await fetch('/api/kyc', {
//         method: 'POST',
//         body: formData,
//       });

//       // Проверяем content-type перед парсингом
//       const contentType = res.headers.get('content-type');
      
//       if (!contentType || !contentType.includes('application/json')) {
//         const text = await res.text();
//         console.error('Response is not JSON:', text);
//         throw new Error('Сервер вернул неожиданный формат ответа. Проверьте консоль.');
//       }

//       const data = await res.json();
      
//       if (!res.ok) {
//         throw new Error(data.message || data.error || 'Ошибка при загрузке');
//       }

//       setResponse(data);
//     } catch (err) {
//       console.error('Error details:', err);
//       setError(err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleReset = () => {
//     setSelectedFile(null);
//     setPreview('');
//     setResponse(null);
//     setError('');
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 py-8">
//       <div className="max-w-4xl mx-auto">
//         <div className="bg-white rounded-2xl shadow-xl p-8">
//           <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">
//             Проверка документов
//           </h1>
//           <p className="text-gray-600 text-center mb-8">
//             Загрузите фото документа для распознавания
//           </p>

//           <div className="grid md:grid-cols-2 gap-6">
//             {/* Левая колонка - загрузка */}
//             <div className="space-y-4">
//               <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-500 transition-colors">
//                 <input
//                   type="file"
//                   accept="image/*"
//                   onChange={handleFileChange}
//                   className="hidden"
//                   id="file-input"
//                 />
//                 <label htmlFor="file-input" className="cursor-pointer block">
//                   {preview ? (
//                     <img
//                       src={preview}
//                       alt="Preview"
//                       className="max-h-64 mx-auto rounded-lg"
//                     />
//                   ) : (
//                     <div className="py-12">
//                       <svg
//                         className="mx-auto h-16 w-16 text-gray-400"
//                         fill="none"
//                         viewBox="0 0 24 24"
//                         stroke="currentColor"
//                       >
//                         <path
//                           strokeLinecap="round"
//                           strokeLinejoin="round"
//                           strokeWidth={2}
//                           d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
//                         />
//                       </svg>
//                       <p className="mt-4 text-sm text-gray-600">
//                         Нажмите для выбора фото
//                       </p>
//                       <p className="mt-1 text-xs text-gray-500">
//                         PNG, JPG до 10MB
//                       </p>
//                     </div>
//                   )}
//                 </label>
//               </div>

//               <div className="flex gap-3">
//                 <button
//                   onClick={handleSubmit}
//                   disabled={!selectedFile || loading}
//                   className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
//                 >
//                   {loading ? (
//                     <span className="flex items-center justify-center">
//                       <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
//                         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
//                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
//                       </svg>
//                       Обработка...
//                     </span>
//                   ) : (
//                     'Отправить на проверку'
//                   )}
//                 </button>

//                 {selectedFile && (
//                   <button
//                     onClick={handleReset}
//                     className="px-4 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
//                   >
//                     Сброс
//                   </button>
//                 )}
//               </div>
//             </div>

//             {/* Правая колонка - результаты */}
//             <div className="space-y-4">
//               {error && (
//                 <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
//                   <p className="text-red-800 font-medium">Ошибка:</p>
//                   <p className="text-red-700 mt-1">{error}</p>
//                 </div>
//               )}

//               {response && (
//                 <div className="space-y-4">
//                   <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
//                     <p className="text-green-800 font-medium">
//                       ✓ {response.message}
//                     </p>
//                   </div>

//                   {response.data && (
//                     <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
//                       <h3 className="font-semibold text-gray-800 mb-3">
//                         Результат от Mindee:
//                       </h3>
//                       <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words">
//                         {JSON.stringify(response.data, null, 2)}
//                       </pre>
//                     </div>
//                   )}
//                 </div>
//               )}

//               {!error && !response && !loading && (
//                 <div className="h-full flex items-center justify-center text-gray-400 text-center p-8">
//                   <div>
//                     <svg
//                       className="mx-auto h-12 w-12 mb-3"
//                       fill="none"
//                       viewBox="0 0 24 24"
//                       stroke="currentColor"
//                     >
//                       <path
//                         strokeLinecap="round"
//                         strokeLinejoin="round"
//                         strokeWidth={2}
//                         d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
//                       />
//                     </svg>
//                     <p>Результаты появятся здесь</p>
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }