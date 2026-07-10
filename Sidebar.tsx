@tailwind base;
@tailwind components;
@tailwind utilities;

/* Dark mode base styles */
.dark {
  color-scheme: dark;
}

.dark body {
  background-color: #111827;
  color: #f3f4f6;
}

/* Dark mode component styles */
.dark .bg-white {
  background-color: #1f2937 !important;
}

.dark .bg-gray-50 {
  background-color: #111827 !important;
}

.dark .bg-gray-100 {
  background-color: #1f2937 !important;
}

.dark .bg-gray-200 {
  background-color: #374151 !important;
}

.dark .bg-blue-50 {
  background-color: #1e3a5f !important;
}

.dark .bg-green-50 {
  background-color: #14532d !important;
}

.dark .bg-red-50 {
  background-color: #7f1d1d !important;
}

.dark .bg-amber-50 {
  background-color: #78350f !important;
}

.dark .bg-red-100 {
  background-color: #991b1b !important;
}

.dark .bg-green-100 {
  background-color: #166534 !important;
}

.dark .bg-amber-100 {
  background-color: #92400e !important;
}

.dark .bg-blue-100 {
  background-color: #1e40af !important;
}

.dark .bg-emerald-100 {
  background-color: #065f46 !important;
}

.dark .border-gray-100 {
  border-color: #374151 !important;
}

.dark .border-gray-200 {
  border-color: #374151 !important;
}

.dark .border-gray-300 {
  border-color: #4b5563 !important;
}

.dark .border-blue-200 {
  border-color: #1e40af !important;
}

.dark .border-red-200 {
  border-color: #991b1b !important;
}

.dark .border-green-200 {
  border-color: #166534 !important;
}

.dark .border-amber-200 {
  border-color: #92400e !important;
}

.dark .text-gray-500,
.dark .text-gray-600 {
  color: #9ca3af !important;
}

.dark .text-gray-700,
.dark .text-gray-800 {
  color: #e5e7eb !important;
}

.dark .text-gray-400 {
  color: #6b7280 !important;
}

.dark .text-blue-700,
.dark .text-blue-600 {
  color: #60a5fa !important;
}

.dark .text-red-600,
.dark .text-red-700 {
  color: #f87171 !important;
}

.dark .text-green-600,
.dark .text-green-700 {
  color: #4ade80 !important;
}

.dark .text-amber-600,
.dark .text-amber-700 {
  color: #fbbf24 !important;
}

.dark .text-emerald-700 {
  color: #34d399 !important;
}

.dark .shadow-sm {
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.3) !important;
}

.dark .shadow {
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.4), 0 1px 2px -1px rgb(0 0 0 / 0.4) !important;
}

.dark input,
.dark select,
.dark textarea {
  background-color: #374151 !important;
  border-color: #4b5563 !important;
  color: #f3f4f6 !important;
}

.dark input::placeholder,
.dark textarea::placeholder {
  color: #6b7280 !important;
}

.dark input:focus,
.dark select:focus,
.dark textarea:focus {
  border-color: #3b82f6 !important;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3) !important;
}

.dark table thead {
  background-color: #1f2937 !important;
}

.dark table th {
  color: #e5e7eb !important;
  border-color: #374151 !important;
}

.dark table td {
  border-color: #374151 !important;
}

.dark table tbody tr:hover {
  background-color: #374151 !important;
}

.dark .divide-gray-100 > * + * {
  border-color: #374151 !important;
}

.dark .divide-gray-200 > * + * {
  border-color: #374151 !important;
}

.dark ::-webkit-scrollbar {
  background-color: #1f2937;
}

.dark ::-webkit-scrollbar-thumb {
  background-color: #4b5563;
}

.dark ::-webkit-scrollbar-track {
  background-color: #1f2937;
}
