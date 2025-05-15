import React, { SelectHTMLAttributes, ReactNode } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: ReactNode;
  fullWidth?: boolean;
  className?: string;
}

const Select: React.FC<SelectProps> = ({
  label,
  error,
  children,
  className = '',
  fullWidth = true,
  id,
  ...props
}) => {
  return (
    <div className={`mb-4 ${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label 
          htmlFor={id} 
          className="block text-white font-medium mb-1"
        >
          {label}
        </label>
      )}
      <select
        id={id}
        className={`
          w-full px-4 py-2 rounded-md 
          bg-dark-bg-secondary text-white border border-dark-border
          focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
          disabled:opacity-60 disabled:cursor-not-allowed
          transition duration-200
          ${error ? 'border-red-500' : 'border-dark-border'}
          ${className}
        `}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

export default Select; 