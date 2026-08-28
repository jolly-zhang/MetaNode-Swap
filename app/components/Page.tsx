import type { ReactNode } from "react";

type PageProps = {
  title: string;
  toolbar?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

export default function Page({ title, toolbar, actions, children }: PageProps) {
  const hasHeader = toolbar != null || actions != null;

  return (
    <div>
      <h1>{title}</h1>
      <div className="bg-white p-4">
        {hasHeader && (
          <div className="flex justify-between items-center mb-4">
            <div>{toolbar}</div>
            {actions != null && (
              <div className="flex flex-row gap-2">{actions}</div>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
