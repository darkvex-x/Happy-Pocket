import React from 'react';
import { Search } from 'lucide-react';
import Input from './Input';

export default function SearchInput({ className, ...props }) {
  return (
    <div className="relative w-full">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-3.5 w-3.5 text-[#4B5563]" />
      </div>
      <Input
        type="search"
        className={`pl-9 ${className || ''}`}
        {...props}
      />
    </div>
  );
}
