import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  
  if (!code) {
    return redirect('/login')
  }
  
  const supabase = await createClient()
  
  // Exchange the code for a session
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  
  if (error) {
    console.error('Error exchanging code for session:', error)
    return redirect('/error')
  }
  
  // Successful authentication, redirect to home
  return redirect('/')
} 
