'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/utils/supabase/server'
import { env } from '@/lib/env'

export async function signInWithMagicLink(formData: FormData) {
  const supabase = await createClient()

  // Get email from form data
  const email = formData.get('email') as string

  // Validate email
  if (!email || !email.includes('@')) {
    // In a real app, you'd want to return an error message
    redirect('/error')
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (error) {
    redirect('/error')
  }

  // Redirect to a confirmation page
  redirect('/login/confirmation')
}

// Keep this for backward compatibility if needed, but it won't be used in the new flow
export async function login(formData: FormData) {
  redirect('/login/confirmation')
}

// Keep this for backward compatibility if needed, but it won't be used in the new flow
export async function signup(formData: FormData) {
  redirect('/login/confirmation')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  
  revalidatePath('/', 'layout')
  redirect('/login')
}