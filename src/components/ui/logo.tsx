'use client'

import React, { useState } from 'react'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'header' | 'login'
}

export function Logo({ className = '', size = 'md', variant = 'header' }: LogoProps) {
  const [logoError, setLogoError] = useState(false)

  const sizeClasses = {
    sm: 'h-6 w-auto max-w-32',
    md: 'h-8 w-auto max-w-40', 
    lg: 'h-12 w-auto max-w-48',
    xl: 'h-16 w-auto max-w-56'
  }

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl', 
    xl: 'text-3xl'
  }

  // Fallback text logo
  const TextLogo = () => (
    <div className={`font-bold ${textSizeClasses[size]} ${className}`}>
      <span className="text-blue-600">Trend</span>
      <span className="text-gray-800">4</span>
      <span className="text-blue-600">Media</span>
    </div>
  )

  if (variant === 'login') {
    return (
      <div className={`flex flex-col items-center space-y-2 ${className}`}>
        {!logoError ? (
          <img
            src="/api/admin/settings/logo"
            alt="Trend4Media Logo"
            className={sizeClasses[size]}
            onError={() => setLogoError(true)}
          />
        ) : (
          <TextLogo />
        )}
      </div>
    )
  }

  // Header variant
  return (
    <div className={`flex items-center ${className}`}>
      {!logoError ? (
        <img
          src="/api/admin/settings/logo"
          alt="Trend4Media Logo"
          className={sizeClasses[size]}
          onError={() => setLogoError(true)}
        />
      ) : (
        <TextLogo />
      )}
    </div>
  )
}