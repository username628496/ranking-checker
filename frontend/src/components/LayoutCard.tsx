import React from "react";

type Props = {
  title?: string;
  description?: string;
  children: React.ReactNode;
};

export default function LayoutCard({ title, description, children }: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-md overflow-hidden">
      {(title || description) && (
        <div className="bg-slate-50 border-b border-slate-200 p-5">
          {title && <h3 className="font-semibold text-slate-800">{title}</h3>}
          {description && (
            <p className="text-slate-600 text-sm mt-1">{description}</p>
          )}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}