import React from 'react';
import { cn } from '../../utils/cn';

export default function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-[#2A2A2A]", className)}
      {...props}
    />
  );
}
