import React from 'react'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'full' | 'icon' | 'text'
}

export function Logo({ className = '', size = 'md', variant = 'full' }: LogoProps) {
  const sizeClasses = {
    sm: 'h-6 w-auto',
    md: 'h-8 w-auto', 
    lg: 'h-12 w-auto',
    xl: 'h-16 w-auto'
  }

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl', 
    xl: 'text-3xl'
  }

  if (variant === 'text') {
    return (
      <div className={`font-bold text-blue-600 ${textSizeClasses[size]} ${className}`}>
        <span className="text-blue-600">Trend</span>
        <span className="text-gray-800">4</span>
        <span className="text-blue-600">Media</span>
      </div>
    )
  }

  if (variant === 'icon') {
    return (
      <div className={`${sizeClasses[size]} ${className} flex items-center justify-center bg-blue-600 text-white font-bold rounded`}>
        <span className="text-sm">T4M</span>
      </div>
    )
  }

  // Full variant with icon + text
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
        <span className="text-white font-bold text-sm">T4M</span>
      </div>
      <div className={`font-bold ${textSizeClasses[size]}`}>
        <span className="text-blue-600">Trend</span>
        <span className="text-gray-800">4</span>
        <span className="text-blue-600">Media</span>
      </div>
    </div>
  )
}

// Placeholder for real logo - replace this with actual logo image
export function LogoImage({ className = '', alt = 'Trend4Media Logo' }: { className?: string, alt?: string }) {
  return (
    <img
      src="/logo.png" // Place your logo.png in public/logo.png
      alt={alt}
      className={className}
      onError={(e) => {
        // Fallback to text logo if image not found
        const target = e.target as HTMLImageElement
        target.style.display = 'none'
        target.parentElement?.querySelector('.logo-fallback')?.classList.remove('hidden')
      }}
    />
  )
}