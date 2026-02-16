'use client'

import { Component, ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/app/_components/ui/button'

interface Props {
  children: ReactNode
  locale: string
}

interface State {
  hasError: boolean
  error?: Error
}

class RoomsErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('RoomsErrorBoundary caught an error:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      const isGerman = this.props.locale === 'de'
      
      return (
        <div className='container px-4 md:px-[100px] py-20 text-center'>
          <div className='flex justify-center mb-6'>
            <AlertTriangle className='w-16 h-16 text-yellow-500' />
          </div>
          <h2 className='text-2xl font-bold text-gray-700 mb-4'>
            {isGerman 
              ? 'Wir konnten die Zimmer nicht laden' 
              : 'We couldn\'t load the rooms right now'}
          </h2>
          <p className='text-gray-600 mb-6'>
            {isGerman
              ? 'Etwas ist schiefgelaufen. Bitte laden Sie die Seite neu oder versuchen Sie es später erneut.'
              : 'Something went wrong. Please reload the page or try again later.'}
          </p>
          <Button onClick={this.handleReload} variant='default'>
            {isGerman ? 'Seite neu laden' : 'Reload Page'}
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}

export default RoomsErrorBoundary
