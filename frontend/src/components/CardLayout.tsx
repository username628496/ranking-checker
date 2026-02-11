import React from "react";

export default function CardLayout({ children }: { children: React.ReactNode }) {
 return (
 <div className="w-full bg-white border border-gray-200 rounded-lg shadow-sm p-6">
 {children}
 </div>
 );
}